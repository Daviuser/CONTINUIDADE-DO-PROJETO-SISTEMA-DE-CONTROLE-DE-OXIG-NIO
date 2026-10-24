import "server-only";
import type { Prisma, Role, StockOperation } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDate, parseDate, todayStr, fmtDateTime } from "@/lib/format";
import { cylinderSummary, flowmeterSummary, pendingBySize } from "@/lib/stock";
import { OP_LABEL, LOC_LABEL, COND_LABEL, FM_OP_LABEL, FM_LOC_LABEL, SIZE_LABEL } from "@/lib/labels";
import { REPORT_TYPES, type ReportParams } from "./params";
import { receiptDataUrl } from "@/lib/receipts";

export class ReportError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export type Cell = string | number;
export type Col = { header: string; width?: number | "*" | "auto"; align?: "left" | "right" | "center" };
export type Block = { heading?: string; columns: Col[]; rows: Cell[][]; totals?: Cell[]; note?: string };
export type ReceiptItem = { caption: string; image?: string; note?: string };
export type Report = { title: string; period: string; filters?: string; landscape?: boolean; blocks: Block[]; signatures: string[]; filename: string; receipts?: ReceiptItem[] };

const LIMIT = 5000;
// Uma única assinatura em todos os documentos: o responsável pelo oxigênio
const SIGNATURES = ["Responsável pelo oxigênio"];
const ALL_OPS = Object.keys(OP_LABEL) as StockOperation[];
const dash = (v?: string | null) => (v && v.trim() ? v : "—");
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const limitNote = (n: number) => (n >= LIMIT ? `Exibindo os primeiros ${LIMIT} registros; reduza o período para ver todos.` : undefined);
const loc = (l?: { code: string } | null, c?: string | null) => (l ? `${LOC_LABEL[l.code]}${c ? ` (${COND_LABEL[c].toLowerCase()})` : ""}` : "—");

function periodLabel(from?: string, to?: string) {
  if (from && to) return `Período: ${fmtDate(parseDate(from))} a ${fmtDate(parseDate(to))}`;
  if (from) return `Período: a partir de ${fmtDate(parseDate(from))}`;
  if (to) return `Período: até ${fmtDate(parseDate(to))}`;
  return "Período: todo o histórico registrado";
}
function filtersLabel(p: ReportParams) {
  return [p.size ? `Categoria: ${SIZE_LABEL[p.size]}` : "", p.responsible ? `Responsável: ${p.responsible}` : "", p.supplier ? `Fornecedor: ${p.supplier}` : "",
    p.bairro ? `Bairro: ${p.bairro}` : "", p.povoado ? `Povoado: ${p.povoado}` : "", p.patient ? "Paciente selecionado" : ""].filter(Boolean).join(" · ") || undefined;
}

function dateFilter(p: ReportParams) {
  return { ...(p.from ? { gte: parseDate(p.from) } : {}), ...(p.to ? { lte: parseDate(p.to) } : {}) };
}
function stockWhere(p: ReportParams, ops: StockOperation[], validOnly: boolean): Prisma.StockMovementWhereInput {
  const w: Prisma.StockMovementWhereInput = { operation: { in: ops } };
  if (validOnly) { w.status = "CONFIRMADA"; w.reversalOfId = null; }
  if (p.from || p.to) w.occurredAt = dateFilter(p);
  if (p.size) w.cylinderType = { size: p.size };
  if (p.responsible) w.responsibleName = { contains: p.responsible, mode: "insensitive" };
  if (p.supplier) w.supplier = { contains: p.supplier, mode: "insensitive" };
  if (p.patient) w.patientId = p.patient;
  if (p.bairro || p.povoado) w.patient = {
    ...(p.bairro ? { neighborhood: { contains: p.bairro, mode: "insensitive" as const } } : {}),
    ...(p.povoado ? { village: { contains: p.povoado, mode: "insensitive" as const } } : {}) };
  return w;
}
function flowWhere(p: ReportParams, validOnly: boolean): Prisma.FlowmeterMovementWhereInput {
  const w: Prisma.FlowmeterMovementWhereInput = {};
  if (validOnly) { w.status = "CONFIRMADA"; w.reversalOfId = null; }
  if (p.from || p.to) w.occurredAt = dateFilter(p);
  if (p.responsible) w.responsibleName = { contains: p.responsible, mode: "insensitive" };
  return w;
}
const ORDER = [{ occurredAt: "asc" as const }, { createdAt: "asc" as const }];

// Recibos do fornecedor (foto) ligados a cada recebimento. Só JPEG/PNG podem ser embutidos no PDF; limite de 25 fotos por documento.
const MAX_RECEIPTS = 25;
async function receiptItems(rows: { occurredAt: Date; responsibleName: string; quantity: number; notes: string | null; cylinderType: { size: string }; receipt: { pathname: string; contentType: string } | null }[]): Promise<ReceiptItem[]> {
  const withPhoto = rows.filter(r => r.receipt);
  const items = await Promise.all(withPhoto.slice(0, MAX_RECEIPTS).map(async (r): Promise<ReceiptItem> => {
    const caption = `Recebimento de ${fmtDate(r.occurredAt)} · Cilindros ${r.cylinderType.size}: ${r.quantity} · Recebido por ${r.responsibleName}${r.notes ? " · Obs.: " + r.notes : ""}`;
    const rc = r.receipt!;
    if (rc.contentType !== "image/jpeg" && rc.contentType !== "image/png") return { caption, note: "Foto em formato que o PDF não suporta (WEBP). Consulte o recibo no sistema." };
    const image = await receiptDataUrl(rc.pathname, rc.contentType);
    return image ? { caption, image } : { caption, note: "Não foi possível carregar a foto do recibo neste momento." };
  }));
  if (withPhoto.length > MAX_RECEIPTS) items.push({ caption: `Há mais ${withPhoto.length - MAX_RECEIPTS} recibo(s) neste período, não exibidos aqui. Reduza o período para ver todos.`, note: "" } as ReceiptItem);
  return items;
}

async function inventoryBlocks(): Promise<Block[]> {
  const [{ rows, totals: t }, f] = await Promise.all([cylinderSummary(), flowmeterSummary()]);
  return [
    { heading: "QUANTIDADE DE CILINDROS DE OXIGÊNIO",
      columns: [{ header: "Categoria", width: "*" }, ...["Disponíveis (cheios)", "Vazios", "Em domicílio", "Nas enfermarias", "Nas máquinas", "Com o fornecedor", "Indisponíveis", "Total"].map(h => ({ header: h, align: "right" as const }))],
      rows: rows.map(r => [r.label, r.hCheio, r.hVazio, r.dom, r.enf, r.maq, r.forn, r.hIndisp, r.total]),
      totals: ["Total geral", t.hCheio, t.hVazio, t.dom, t.enf, t.maq, t.forn, t.hIndisp, t.total],
      note: "Em domicílio, nas enfermarias e nas máquinas de intubação: cilindros em uso. Com o fornecedor: vazios enviados para troca e ainda não devolvidos." },
    { heading: "QUANTIDADE DE FLUXÔMETROS", columns: [{ header: "Localização", width: "*" }, { header: "Quantidade", width: 110, align: "right" }],
      rows: [["Hospital (disponíveis)", f.hospital], ["Domicílio", f.domicilio], ["Enfermarias", f.enfermarias], ["Máquinas de intubação", f.maquinas + f.maquinasIntub]], totals: ["Total geral", f.total] },
  ];
}

export async function buildReport(p: ReportParams, user: { role: Role; name: string }): Promise<Report> {
  const meta = REPORT_TYPES.find(t => t.id === p.type)!;
  if (meta.personal && user.role === "CONSULTA") throw new ReportError("Seu perfil não tem acesso a relatórios com dados pessoais de pacientes.", 403);
  const stamp = todayStr().replaceAll("-", "");
  const base = { period: periodLabel(p.from, p.to), filters: filtersLabel(p) };

  if (p.type === "abastecimento") {
    const rows = await db.stockMovement.findMany({ where: stockWhere(p, ["ABASTECIMENTO"], true), orderBy: ORDER, take: LIMIT, include: { cylinderType: true, receipt: true } });
    const q = (r: (typeof rows)[number], s: string) => (r.cylinderType.size === s ? r.quantity : "");
    const tot = (s: string) => sum(rows.filter(r => r.cylinderType.size === s).map(r => r.quantity));
    return { ...base, title: "CONTROLE DE ABASTECIMENTO DE OXIGÊNIO", filename: `controle-abastecimento-${stamp}`,
      blocks: [{ columns: [{ header: "Data", width: 50 }, { header: "Quem recebeu", width: "*" }, { header: "P", width: 26, align: "center" }, { header: "M", width: 26, align: "center" }, { header: "G", width: 26, align: "center" }, { header: "Total", width: 34, align: "right" }, { header: "Observações", width: "*" }],
        rows: rows.map(r => [fmtDate(r.occurredAt), r.responsibleName, q(r, "P"), q(r, "M"), q(r, "G"), r.quantity, dash(r.notes)]),
        totals: ["Total", "", tot("P"), tot("M"), tot("G"), sum(rows.map(r => r.quantity)), ""], note: limitNote(rows.length) }],
      signatures: SIGNATURES, receipts: await receiptItems(rows) };
  }

  if (p.type === "domiciliar") {
    const rows = await db.stockMovement.findMany({ where: stockWhere(p, ["ENTREGA_DOMICILIAR", "RECOLHIMENTO_DOMICILIAR"], true), orderBy: ORDER, take: LIMIT,
      include: { cylinderType: true, patient: { select: { fullName: true, address: true, neighborhood: true, village: true, flowLpm: true } } } });
    const ent = sum(rows.filter(r => r.operation === "ENTREGA_DOMICILIAR").map(r => r.quantity));
    const rec = sum(rows.filter(r => r.operation === "RECOLHIMENTO_DOMICILIAR").map(r => r.quantity));
    return { ...base, landscape: true, title: "CONTROLE DE PACIENTES EM USO DE OXIGÊNIO EM DOMICÍLIO", filename: `controle-domiciliar-${stamp}`,
      blocks: [{ columns: [{ header: "Data", width: 50 }, { header: "Nome do paciente", width: 120 }, { header: "Endereço", width: 120 }, { header: "Bairro", width: 62 }, { header: "Povoado", width: 62 }, { header: "Operação", width: 62 }, { header: "Tipo", width: 26, align: "center" }, { header: "Qtd.", width: 26, align: "right" }, { header: "Fluxo informado", width: 52 }, { header: "Responsável", width: 76 }, { header: "Assinatura", width: "*" }],
        rows: rows.map(r => [fmtDate(r.occurredAt), r.patient?.fullName ?? "—", dash(r.patient?.address), dash(r.patient?.neighborhood), dash(r.patient?.village),
          r.operation === "ENTREGA_DOMICILIAR" ? "Entrega" : "Recolhimento", r.cylinderType.size, r.quantity, dash(r.patient?.flowLpm), r.responsibleName, ""]),
        note: [`Total entregue: ${ent} · Total recolhido: ${rec}.`, "Fluxo informado: valor do cadastro do paciente.", limitNote(rows.length)].filter(Boolean).join(" ") }],
      signatures: SIGNATURES };
  }

  if (p.type === "trocas") {
    const [rows, pend] = await Promise.all([
      db.stockMovement.findMany({ where: stockWhere(p, ["ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR"], true), orderBy: ORDER, take: LIMIT, include: { cylinderType: true, receipt: true } }),
      pendingBySize()]);
    const pf = p.size ? pend.filter(x => x.size === p.size) : pend;
    return { ...base, title: "TROCAS DE CILINDROS COM O FORNECEDOR", filename: `trocas-fornecedor-${stamp}`,
      blocks: [
        { heading: "MOVIMENTAÇÕES DO PERÍODO", columns: [{ header: "Data", width: 55 }, { header: "Operação", width: "*" }, { header: "Tipo", width: 30, align: "center" }, { header: "Qtd.", width: 34, align: "right" }, { header: "Responsável", width: "*" }, { header: "Observações", width: "*" }],
          rows: rows.map(r => [fmtDate(r.occurredAt), r.operation === "ENVIO_FORNECEDOR" ? "Envio de vazios" : "Retorno de cheios", r.cylinderType.size, r.quantity, r.responsibleName, dash(r.notes)]), note: limitNote(rows.length) },
        { heading: "PENDÊNCIAS ATUAIS (vazios enviados − cheios recebidos)", columns: [{ header: "Categoria", width: "*" }, { header: "Enviados", width: 70, align: "right" }, { header: "Recebidos", width: 70, align: "right" }, { header: "Pendente", width: 70, align: "right" }],
          rows: pf.map(x => [x.label, x.sent, x.returned, x.pending]), totals: ["Total pendente", sum(pf.map(x => x.sent)), sum(pf.map(x => x.returned)), sum(pf.map(x => x.pending))] }],
      signatures: SIGNATURES, receipts: await receiptItems(rows.filter(r => r.operation === "RETORNO_FORNECEDOR")) };
  }

  if (p.type === "inventario") {
    return { title: "INVENTÁRIO GERAL DE OXIGÊNIO", period: `Data de referência: ${fmtDateTime(new Date())} (posição atual do estoque)`, filename: `inventario-oxigenio-${stamp}`,
      blocks: await inventoryBlocks(), signatures: SIGNATURES };
  }

  if (p.type === "fluxometros") {
    const [f, rows] = await Promise.all([flowmeterSummary(), db.flowmeterMovement.findMany({ where: flowWhere(p, true), orderBy: ORDER, take: LIMIT })]);
    return { ...base, filters: p.responsible ? `Responsável: ${p.responsible}` : undefined, title: "CONTROLE DE FLUXÔMETROS", filename: `controle-fluxometros-${stamp}`,
      blocks: [
        { heading: "SITUAÇÃO ATUAL", columns: [{ header: "Localização", width: "*" }, { header: "Quantidade", width: 110, align: "right" }], rows: [["Hospital (disponíveis)", f.hospital], ["Domicílio", f.domicilio], ["Enfermarias", f.enfermarias], ["Máquinas de intubação", f.maquinas + f.maquinasIntub]], totals: ["Total cadastrado", f.total] },
        { heading: "MOVIMENTAÇÕES DO PERÍODO", columns: [{ header: "Data", width: 50 }, { header: "Operação", width: "*" }, { header: "Qtd.", width: 30, align: "right" }, { header: "De → Para", width: "*" }, { header: "Responsável", width: "*" }, { header: "Observações", width: "*" }],
          rows: rows.map(r => [fmtDate(r.occurredAt), FM_OP_LABEL[r.operation], r.quantity, `${r.fromLocation ? FM_LOC_LABEL[r.fromLocation] : "—"} → ${r.toLocation ? FM_LOC_LABEL[r.toLocation] : "—"}`, r.responsibleName, dash(r.notes)]),
          note: limitNote(rows.length) }],
      signatures: SIGNATURES };
  }

  if (p.type === "movimentacoes") {
    const [sm, fm] = await Promise.all([
      db.stockMovement.findMany({ where: stockWhere(p, ALL_OPS, false), orderBy: ORDER, take: LIMIT,
        include: { cylinderType: true, fromLocation: true, toLocation: true, patient: { select: { fullName: true } } } }),
      p.size || p.supplier || p.patient || p.bairro || p.povoado ? Promise.resolve([]) : db.flowmeterMovement.findMany({ where: flowWhere(p, false), orderBy: ORDER, take: LIMIT })]);
    const personal = user.role !== "CONSULTA";
    const status = (s: string, rev: string | null) => (rev ? "Estorno" : s === "ESTORNADA" ? "Estornada" : "Confirmada");
    const all = [
      ...sm.map(m => ({ at: m.occurredAt, c: m.createdAt, cells: [fmtDate(m.occurredAt), "Cilindros", OP_LABEL[m.operation], m.cylinderType.size, m.quantity, `${loc(m.fromLocation, m.fromCondition)} → ${loc(m.toLocation, m.toCondition)}`, personal ? (m.patient?.fullName ?? m.supplier ?? "—") : (m.supplier ?? "—"), m.responsibleName, status(m.status, m.reversalOfId)] as Cell[] })),
      ...fm.map(m => ({ at: m.occurredAt, c: m.createdAt, cells: [fmtDate(m.occurredAt), "Fluxômetros", FM_OP_LABEL[m.operation], "—", m.quantity, `${m.fromLocation ? FM_LOC_LABEL[m.fromLocation] : "—"} → ${m.toLocation ? FM_LOC_LABEL[m.toLocation] : "—"}`, "—", m.responsibleName, status(m.status, m.reversalOfId)] as Cell[] })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.c.getTime() - b.c.getTime());
    return { ...base, landscape: true, title: "HISTÓRICO DE MOVIMENTAÇÕES DE OXIGÊNIO", filename: `historico-movimentacoes-${stamp}`,
      blocks: [{ columns: [{ header: "Data", width: 50 }, { header: "Registro", width: 56 }, { header: "Operação", width: 130 }, { header: "Tipo", width: 28, align: "center" }, { header: "Qtd.", width: 30, align: "right" }, { header: "De → Para", width: 150 }, { header: "Fornecedor / Paciente", width: 100 }, { header: "Responsável", width: "*" }, { header: "Situação", width: 56 }],
        rows: all.map(a => a.cells), note: "Movimentações estornadas e seus estornos aparecem para rastreabilidade e se anulam no saldo." + (limitNote(Math.max(sm.length, fm.length)) ? " " + limitNote(Math.max(sm.length, fm.length)) : "") }],
      signatures: SIGNATURES };
  }

  // consolidado
  const [inv, g, fg, pend, ativos] = await Promise.all([
    inventoryBlocks(),
    db.stockMovement.groupBy({ by: ["operation"], where: stockWhere(p, ALL_OPS, true), _sum: { quantity: true }, _count: { _all: true } }),
    db.flowmeterMovement.groupBy({ by: ["operation"], where: flowWhere(p, true), _sum: { quantity: true }, _count: { _all: true } }),
    pendingBySize(), db.patient.count({ where: { status: "ATIVO" } })]);
  const pf = pend.filter(x => x.pending !== 0);
  return { ...base, title: "RELATÓRIO CONSOLIDADO DO PERÍODO", filename: `consolidado-periodo-${stamp}`,
    blocks: [
      { ...inv[0], heading: "POSIÇÃO ATUAL — CILINDROS" }, { ...inv[1], heading: "POSIÇÃO ATUAL — FLUXÔMETROS", note: `Pacientes ativos em oxigenoterapia domiciliar: ${ativos}.` },
      { heading: "MOVIMENTAÇÕES DO PERÍODO — CILINDROS", columns: [{ header: "Operação", width: "*" }, { header: "Registros", width: 70, align: "right" }, { header: "Quantidade", width: 80, align: "right" }],
        rows: g.map(x => [OP_LABEL[x.operation], x._count._all, x._sum.quantity ?? 0]) },
      { heading: "MOVIMENTAÇÕES DO PERÍODO — FLUXÔMETROS", columns: [{ header: "Operação", width: "*" }, { header: "Registros", width: 70, align: "right" }, { header: "Quantidade", width: 80, align: "right" }],
        rows: fg.map(x => [FM_OP_LABEL[x.operation], x._count._all, x._sum.quantity ?? 0]) },
      { heading: "TROCAS PENDENTES COM O FORNECEDOR", columns: [{ header: "Categoria", width: "*" }, { header: "Pendente", width: 80, align: "right" }], rows: pend.map(x => [x.label, x.pending]), totals: ["Total pendente", sum(pend.map(x => x.pending))] }],
    signatures: SIGNATURES };
}
