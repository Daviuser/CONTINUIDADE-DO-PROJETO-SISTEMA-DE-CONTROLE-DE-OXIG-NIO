import "server-only";
import { Prisma } from "@prisma/client";
import type { FlowmeterKind, LocalFlowOperation } from "@prisma/client";
import type { CylinderSize, StockCondition, StockOperation, FlowmeterLocation, FlowmeterOperation, MachineItemKind, MachineOperation } from "@prisma/client";
import type { ReceiptMeta } from "./receipts";
import { db } from "./db";
import { audit } from "./audit";
import { LOC_LABEL, COND_LABEL, FM_LOC_LABEL, SIZE_LABEL, MACHINE_KIND_LABEL, INTERNAL_LOCATIONS, ALL_INTERNAL_LOCATIONS, LEGACY_CODES, LEGACY_MSG, INTERNAL_CODES, FM_KIND_LABEL } from "./labels";
import { parseDate, todayStr } from "./format";

export class StockError extends Error {}
export type LocCode = string; // HOSPITAL, DOMICILIO, TRANSPORTE, ENFERMARIAS ou um dos locais internos
export type Pt = { loc: LocCode; cond: StockCondition };
type Tx = Prisma.TransactionClient;
const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const ptLabel = (loc: string, cond: string) => `${LOC_LABEL[loc]} (${COND_LABEL[cond].toLowerCase()})`;

// ---------- CILINDROS ----------
async function dec(tx: Tx, locationId: string, cylinderTypeId: string, condition: StockCondition, qty: number, label: string) {
  const r = await tx.stockBalance.updateMany({ where: { locationId, cylinderTypeId, condition, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
  if (r.count !== 1) {
    const b = await tx.stockBalance.findUnique({ where: { locationId_cylinderTypeId_condition: { locationId, cylinderTypeId, condition } } });
    throw new StockError(`Saldo insuficiente: ${label} tem ${b?.quantity ?? 0} disponível(is).`);
  }
}
async function inc(tx: Tx, locationId: string, cylinderTypeId: string, condition: StockCondition, qty: number) {
  await tx.stockBalance.upsert({
    where: { locationId_cylinderTypeId_condition: { locationId, cylinderTypeId, condition } },
    create: { locationId, cylinderTypeId, condition, quantity: qty }, update: { quantity: { increment: qty } } });
}

export type MoveInput = { operation: StockOperation; size: CylinderSize; quantity: number; from?: Pt; to?: Pt; occurredAt: Date;
  supplier?: string; patientId?: string; responsibleName: string; notes?: string; requestKey?: string; userId: string; receipt?: ReceiptMeta };

export async function applyMovement(i: MoveInput): Promise<{ duplicate: boolean }> {
  if (!Number.isInteger(i.quantity) || i.quantity < 1) throw new StockError("Quantidade deve ser maior que zero.");
  if (i.requestKey && (await db.stockMovement.findUnique({ where: { requestKey: i.requestKey }, select: { id: true } }))) return { duplicate: true };
  try {
    const m = await db.$transaction(async tx => {
      const [locs, types] = await Promise.all([tx.location.findMany({ select: { id: true, code: true } }), tx.cylinderType.findMany({ select: { id: true, size: true } })]);
      const L = (c: LocCode) => { const l = locs.find(x => x.code === c); if (!l) throw new StockError("Localização não cadastrada (rode o seed)."); return l.id; };
      const t = types.find(x => x.size === i.size); if (!t) throw new StockError("Tipo de cilindro não cadastrado (rode o seed).");
      if (i.from) await dec(tx, L(i.from.loc), t.id, i.from.cond, i.quantity, ptLabel(i.from.loc, i.from.cond) + ` — ${i.size}`);
      if (i.to) await inc(tx, L(i.to.loc), t.id, i.to.cond, i.quantity);
      const created = await tx.stockMovement.create({ data: {
        operation: i.operation, cylinderTypeId: t.id, quantity: i.quantity,
        fromLocationId: i.from ? L(i.from.loc) : null, fromCondition: i.from?.cond ?? null,
        toLocationId: i.to ? L(i.to.loc) : null, toCondition: i.to?.cond ?? null,
        occurredAt: i.occurredAt, supplier: i.supplier ?? null, patientId: i.patientId ?? null,
        responsibleName: i.responsibleName, notes: i.notes ?? null, requestKey: i.requestKey ?? null, createdById: i.userId } });
      if (i.receipt) await tx.receiptPhoto.create({ data: { movementId: created.id, url: i.receipt.url, pathname: i.receipt.pathname, contentType: i.receipt.contentType, size: i.receipt.size, uploadedById: i.userId } });
      return created;
    });
    await audit({ userId: i.userId, action: "MOVIMENTO_" + i.operation, entity: "StockMovement", entityId: m.id,
      after: { operation: i.operation, size: i.size, quantity: i.quantity, supplier: i.supplier, patientId: i.patientId } });
    return { duplicate: false };
  } catch (e) { if (isDup(e)) return { duplicate: true }; throw e; }
}

export async function reverseMovement(p: { id: string; reason: string; userId: string; userName: string }) {
  const reason = p.reason.trim();
  if (reason.length < 5) throw new StockError("Informe a justificativa do estorno (mínimo 5 caracteres).");
  const rev = await db.$transaction(async tx => {
    const m = await tx.stockMovement.findUnique({ where: { id: p.id }, include: { fromLocation: true, toLocation: true, cylinderType: true } });
    if (!m || m.status !== "CONFIRMADA" || m.reversalOfId) throw new StockError("Esta movimentação não pode ser estornada (já estornada ou é um estorno).");
    if (m.toLocationId && m.toCondition) await dec(tx, m.toLocationId, m.cylinderTypeId, m.toCondition, m.quantity, ptLabel(m.toLocation!.code, m.toCondition) + ` — ${m.cylinderType.size}`);
    if (m.fromLocationId && m.fromCondition) await inc(tx, m.fromLocationId, m.cylinderTypeId, m.fromCondition, m.quantity);
    const f = await tx.stockMovement.updateMany({ where: { id: m.id, status: "CONFIRMADA" }, data: { status: "ESTORNADA" } });
    if (f.count !== 1) throw new StockError("Movimentação já estornada.");
    return tx.stockMovement.create({ data: {
      operation: m.operation, cylinderTypeId: m.cylinderTypeId, quantity: m.quantity,
      fromLocationId: m.toLocationId, fromCondition: m.toCondition, toLocationId: m.fromLocationId, toCondition: m.fromCondition,
      occurredAt: new Date(), supplier: m.supplier, patientId: m.patientId, responsibleName: p.userName, notes: m.notes,
      reversalOfId: m.id, reversalReason: reason, createdById: p.userId } });
  });
  await audit({ userId: p.userId, action: "MOVIMENTO_ESTORNADO", entity: "StockMovement", entityId: p.id, after: { reversalId: rev.id }, reason });
}

export async function cylinderSummary() {
  const [types, bal, mi] = await Promise.all([
    db.cylinderType.findMany({ orderBy: { size: "asc" } }),
    db.stockBalance.findMany({ include: { location: { select: { code: true } } } }),
    db.machineItem.groupBy({ by: ["kind"], _sum: { quantity: true } }),
  ]);
  const rows = types.map(t => {
    const q = (loc: string, cond?: string) => bal.filter(b => b.cylinderTypeId === t.id && b.location.code === loc && (!cond || b.condition === cond)).reduce((a, b) => a + b.quantity, 0);
    const maq = mi.find(x => x.kind === `CILINDRO_${t.size}`)?._sum.quantity ?? 0; // dentro das máquinas de intubação
    const setores = bal.filter(b => b.cylinderTypeId === t.id && INTERNAL_CODES.includes(b.location.code)).reduce((a, b) => a + b.quantity, 0); // nos locais internos
    const r = { size: t.size as string, label: t.label, hCheio: q("HOSPITAL", "CHEIO"), hVazio: q("HOSPITAL", "VAZIO"), hIndisp: q("HOSPITAL", "INDISPONIVEL"), dom: q("DOMICILIO"), enf: q("ENFERMARIAS"), maq, setores, forn: q("TRANSPORTE"), total: 0 };
    r.total = r.hCheio + r.hVazio + r.hIndisp + r.dom + r.enf + r.maq + r.setores + r.forn;
    return r;
  });
  type K = "hCheio" | "hVazio" | "hIndisp" | "dom" | "enf" | "maq" | "setores" | "forn" | "total";
  const s = (k: K) => rows.reduce((a, r) => a + r[k], 0);
  const totals = { hCheio: s("hCheio"), hVazio: s("hVazio"), hIndisp: s("hIndisp"), dom: s("dom"), enf: s("enf"), maq: s("maq"), setores: s("setores"), forn: s("forn"), total: s("total"), hospital: s("hCheio") + s("hVazio") + s("hIndisp") + s("enf") };
  return { rows, totals };
}

// Pendência de troca = vazios enviados − cheios recebidos de volta, por categoria (fornecedor único).
export async function pendingBySize() {
  const base = { status: "CONFIRMADA" as const, reversalOfId: null };
  const [sent, ret, types] = await Promise.all([
    db.stockMovement.groupBy({ by: ["cylinderTypeId"], where: { ...base, operation: "ENVIO_FORNECEDOR" }, _sum: { quantity: true } }),
    db.stockMovement.groupBy({ by: ["cylinderTypeId"], where: { ...base, operation: "RETORNO_FORNECEDOR" }, _sum: { quantity: true } }),
    db.cylinderType.findMany({ orderBy: { size: "asc" } }),
  ]);
  return types.map(t => {
    const s = sent.find(x => x.cylinderTypeId === t.id)?._sum.quantity ?? 0;
    const r = ret.find(x => x.cylinderTypeId === t.id)?._sum.quantity ?? 0;
    return { size: t.size as string, label: t.label, sent: s, returned: r, pending: s - r };
  });
}

// ---------- FLUXÔMETROS ----------
async function fdec(tx: Tx, loc: FlowmeterLocation, qty: number) {
  const r = await tx.flowmeterBalance.updateMany({ where: { location: loc, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
  if (r.count !== 1) {
    const b = await tx.flowmeterBalance.findUnique({ where: { location: loc } });
    throw new StockError(`Saldo insuficiente: ${FM_LOC_LABEL[loc]} tem ${b?.quantity ?? 0} fluxômetro(s).`);
  }
}
const finc = (tx: Tx, loc: FlowmeterLocation, qty: number) =>
  tx.flowmeterBalance.upsert({ where: { location: loc }, create: { location: loc, quantity: qty }, update: { quantity: { increment: qty } } });

export type FlowInput = { operation: FlowmeterOperation; quantity: number; from?: FlowmeterLocation; to?: FlowmeterLocation;
  occurredAt: Date; responsibleName: string; notes?: string; requestKey?: string; userId: string };

export async function applyFlowmeter(i: FlowInput): Promise<{ duplicate: boolean }> {
  if (!Number.isInteger(i.quantity) || i.quantity < 1) throw new StockError("Quantidade deve ser maior que zero.");
  if (i.requestKey && (await db.flowmeterMovement.findUnique({ where: { requestKey: i.requestKey }, select: { id: true } }))) return { duplicate: true };
  try {
    const m = await db.$transaction(async tx => {
      if (i.from) await fdec(tx, i.from, i.quantity);
      if (i.to) await finc(tx, i.to, i.quantity);
      return tx.flowmeterMovement.create({ data: { operation: i.operation, quantity: i.quantity, fromLocation: i.from ?? null, toLocation: i.to ?? null,
        occurredAt: i.occurredAt, responsibleName: i.responsibleName, notes: i.notes ?? null, requestKey: i.requestKey ?? null, createdById: i.userId } });
    });
    await audit({ userId: i.userId, action: "FLUXOMETRO_" + i.operation, entity: "FlowmeterMovement", entityId: m.id, after: { quantity: i.quantity, from: i.from, to: i.to } });
    return { duplicate: false };
  } catch (e) { if (isDup(e)) return { duplicate: true }; throw e; }
}

export async function reverseFlowmeter(p: { id: string; reason: string; userId: string; userName: string }) {
  const reason = p.reason.trim();
  if (reason.length < 5) throw new StockError("Informe a justificativa do estorno (mínimo 5 caracteres).");
  const rev = await db.$transaction(async tx => {
    const m = await tx.flowmeterMovement.findUnique({ where: { id: p.id } });
    if (!m || m.status !== "CONFIRMADA" || m.reversalOfId) throw new StockError("Esta movimentação não pode ser estornada (já estornada ou é um estorno).");
    if (m.toLocation) await fdec(tx, m.toLocation, m.quantity);
    if (m.fromLocation) await finc(tx, m.fromLocation, m.quantity);
    const f = await tx.flowmeterMovement.updateMany({ where: { id: m.id, status: "CONFIRMADA" }, data: { status: "ESTORNADA" } });
    if (f.count !== 1) throw new StockError("Movimentação já estornada.");
    return tx.flowmeterMovement.create({ data: { operation: m.operation, quantity: m.quantity, fromLocation: m.toLocation, toLocation: m.fromLocation,
      occurredAt: new Date(), responsibleName: p.userName, notes: m.notes, reversalOfId: m.id, reversalReason: reason, createdById: p.userId } });
  });
  await audit({ userId: p.userId, action: "FLUXOMETRO_ESTORNADO", entity: "FlowmeterMovement", entityId: p.id, after: { reversalId: rev.id }, reason });
}

export async function flowmeterSummary() {
  const [b, mi, ls] = await Promise.all([
    db.flowmeterBalance.findMany(),
    db.machineItem.groupBy({ by: ["kind"], where: { kind: { in: ["FLUXOMETRO", "FLUXOMETRO_INTUBACAO"] } }, _sum: { quantity: true } }),
    db.flowmeterStock.aggregate({ _sum: { quantity: true } }),
  ]);
  const q = (l: string) => b.find(x => x.location === l)?.quantity ?? 0;
  const hospital = q("HOSPITAL"), domicilio = q("DOMICILIO"), enfermarias = q("ENFERMARIAS");
  const maquinas = mi.find(x => x.kind === "FLUXOMETRO")?._sum.quantity ?? 0;
  const maquinasIntub = mi.find(x => x.kind === "FLUXOMETRO_INTUBACAO")?._sum.quantity ?? 0;
  const locais = ls._sum.quantity ?? 0; // nos locais internos internos (comuns + intubação)
  return { hospital, domicilio, enfermarias, maquinas, maquinasIntub, locais, total: hospital + domicilio + enfermarias + maquinas + maquinasIntub + locais };
}

// ---------- AJUSTE SIMPLES: "informe o total e onde estão" ----------
// Compara com os saldos atuais e grava só as diferenças no livro-razão (AJUSTE_ESTOQUE), mantendo histórico e auditoria.
export type CylinderTarget = { size: CylinderSize; total: number; vazios: number; dom: number; enf: number; indisp: number };
const okInt = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1_000_000;
const serialFail = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";

export async function setCylinderStock(targets: CylinderTarget[], by: { userId: string; userName: string }, requestKey?: string): Promise<{ changed: number; duplicate: boolean }> {
  for (const t of targets) if (![t.total, t.vazios, t.dom, t.enf, t.indisp].every(okInt)) throw new StockError("Use apenas números inteiros, zero ou maiores.");
  if (requestKey && (await db.stockMovement.findFirst({ where: { requestKey: { startsWith: requestKey + "|" } }, select: { id: true } }))) return { changed: 0, duplicate: true };
  try {
    const changed = await db.$transaction(async tx => {
      const [locs, types] = await Promise.all([tx.location.findMany({ select: { id: true, code: true } }), tx.cylinderType.findMany({ select: { id: true, size: true } })]);
      const need = (c: string) => { const l = locs.find(x => x.code === c); if (!l) throw new StockError("Localização não cadastrada (rode o seed)."); return l.id; };
      const H = need("HOSPITAL"), D = need("DOMICILIO"), T = need("TRANSPORTE");
      const E = (await tx.location.upsert({ where: { code: "ENFERMARIAS" }, update: {}, create: { code: "ENFERMARIAS", name: "Enfermarias" }, select: { id: true } })).id;
      let count = 0;
      for (const t of targets) {
        const type = types.find(x => x.size === t.size); if (!type) throw new StockError("Tipo de cilindro não cadastrado (rode o seed).");
        const bal = await tx.stockBalance.findMany({ where: { cylinderTypeId: type.id } });
        const cur = (loc: string, cond: StockCondition) => bal.find(b => b.locationId === loc && b.condition === cond)?.quantity ?? 0;
        const forn = bal.filter(b => b.locationId === T).reduce((a, b) => a + b.quantity, 0); // trocas com fornecedor: não alterado aqui
        const maq = (await tx.machineItem.aggregate({ where: { kind: `CILINDRO_${t.size}` as MachineItemKind }, _sum: { quantity: true } }))._sum.quantity ?? 0; // nas máquinas de intubação
        const setores = bal.filter(b => locs.some(l => l.id === b.locationId && INTERNAL_CODES.includes(l.code))).reduce((a, b) => a + b.quantity, 0); // nos locais internos
        const disp = t.total - t.vazios - t.dom - t.enf - t.indisp - forn - maq - setores;
        if (disp < 0) throw new StockError(`${SIZE_LABEL[t.size]}: vazios + domicílio + enfermarias + indisponíveis${forn ? " + com o fornecedor (" + forn + ")" : ""}${maq ? " + nas máquinas de intubação (" + maq + ")" : ""}${setores ? " + nos setores (" + setores + ")" : ""} passam do total (${t.total}).`);
        const cells: [string, StockCondition, number][] = [[H, "CHEIO", disp], [H, "VAZIO", t.vazios], [H, "INDISPONIVEL", t.indisp], [D, "CHEIO", t.dom], [E, "CHEIO", t.enf]];
        for (const [loc, cond, target] of cells) {
          const delta = target - cur(loc, cond);
          if (delta === 0) continue;
          await tx.stockBalance.upsert({ where: { locationId_cylinderTypeId_condition: { locationId: loc, cylinderTypeId: type.id, condition: cond } },
            create: { locationId: loc, cylinderTypeId: type.id, condition: cond, quantity: target }, update: { quantity: target } });
          await tx.stockMovement.create({ data: { operation: "AJUSTE_ESTOQUE", cylinderTypeId: type.id, quantity: Math.abs(delta),
            fromLocationId: delta < 0 ? loc : null, fromCondition: delta < 0 ? cond : null, toLocationId: delta > 0 ? loc : null, toCondition: delta > 0 ? cond : null,
            occurredAt: parseDate(todayStr()), responsibleName: by.userName, notes: "Atualização do estoque",
            requestKey: requestKey ? `${requestKey}|${t.size}|${count}` : null, createdById: by.userId } });
          count++;
        }
      }
      return count;
    }, { isolationLevel: "Serializable" });
    if (changed) await audit({ userId: by.userId, action: "ESTOQUE_CILINDROS_ATUALIZADO", entity: "StockBalance", after: targets });
    return { changed, duplicate: false };
  } catch (e) {
    if (isDup(e)) return { changed: 0, duplicate: true };
    if (serialFail(e)) throw new StockError("Outro usuário alterou o estoque neste instante. Tente salvar novamente.");
    throw e;
  }
}

export async function setFlowmeterStock(t: { total: number; dom: number; enf: number }, by: { userId: string; userName: string }, requestKey?: string): Promise<{ changed: number; duplicate: boolean }> {
  if (![t.total, t.dom, t.enf].every(okInt)) throw new StockError("Use apenas números inteiros, zero ou maiores.");
  const maq = (await db.machineItem.aggregate({ where: { kind: { in: ["FLUXOMETRO", "FLUXOMETRO_INTUBACAO"] } }, _sum: { quantity: true } }))._sum.quantity ?? 0; // nas máquinas de intubação
  const locais = (await db.flowmeterStock.aggregate({ _sum: { quantity: true } }))._sum.quantity ?? 0; // nos locais internos
  const disp = t.total - t.dom - t.enf - maq - locais;
  if (disp < 0) throw new StockError("Em domicílio + nas enfermarias" + (maq ? " + nas máquinas de intubação (" + maq + ")" : "") + (locais ? " + nos setores (" + locais + ")" : "") + " passam do total de fluxômetros.");
  if (requestKey && (await db.flowmeterMovement.findFirst({ where: { requestKey: { startsWith: requestKey + "|" } }, select: { id: true } }))) return { changed: 0, duplicate: true };
  try {
    const changed = await db.$transaction(async tx => {
      const bal = await tx.flowmeterBalance.findMany();
      const targets: [FlowmeterLocation, number][] = [["HOSPITAL", disp], ["DOMICILIO", t.dom], ["ENFERMARIAS", t.enf]];
      let count = 0;
      for (const [loc, target] of targets) {
        const delta = target - (bal.find(b => b.location === loc)?.quantity ?? 0);
        if (delta === 0) continue;
        await tx.flowmeterBalance.upsert({ where: { location: loc }, create: { location: loc, quantity: target }, update: { quantity: target } });
        await tx.flowmeterMovement.create({ data: { operation: "AJUSTE", quantity: Math.abs(delta), fromLocation: delta < 0 ? loc : null, toLocation: delta > 0 ? loc : null,
          occurredAt: parseDate(todayStr()), responsibleName: by.userName, notes: "Atualização do estoque", requestKey: requestKey ? `${requestKey}|${loc}` : null, createdById: by.userId } });
        count++;
      }
      return count;
    }, { isolationLevel: "Serializable" });
    if (changed) await audit({ userId: by.userId, action: "ESTOQUE_FLUXOMETROS_ATUALIZADO", entity: "FlowmeterBalance", after: t });
    return { changed, duplicate: false };
  } catch (e) {
    if (isDup(e)) return { changed: 0, duplicate: true };
    if (serialFail(e)) throw new StockError("Outro usuário alterou o estoque neste instante. Tente salvar novamente.");
    throw e;
  }
}

// ---------- MÁQUINAS DE INTUBAÇÃO ----------
// Itens da máquina vêm do estoque central (ou entram como novos) e voltam por devolução: a mesma unidade nunca é contada em dois lugares.
export type MachineMoveInput = { machineId: string; operation: MachineOperation; kind: MachineItemKind; quantity: number; source?: "CENTRAL" | "NOVO";
  toMachineId?: string; returnCondition?: "CHEIO" | "VAZIO"; occurredAt: Date; responsibleName: string; notes?: string; requestKey?: string; userId: string };
const cylSize = (k: MachineItemKind): CylinderSize | null => (k === "CILINDRO_P" ? "P" : k === "CILINDRO_M" ? "M" : k === "CILINDRO_G" ? "G" : null);

export async function applyMachineMovement(i: MachineMoveInput): Promise<{ duplicate: boolean }> {
  if (!Number.isInteger(i.quantity) || i.quantity < 0 || i.quantity > 1_000_000) throw new StockError("Informe uma quantidade válida.");
  if (i.operation !== "AJUSTE" && i.quantity < 1) throw new StockError("Quantidade deve ser maior que zero.");
  if ((i.operation === "RETIRADA" || i.operation === "AJUSTE") && !(i.notes && i.notes.trim().length >= 3))
    throw new StockError(i.operation === "RETIRADA" ? "Informe o motivo da retirada." : "Informe a justificativa do ajuste.");
  if (i.operation === "TRANSFERENCIA" && (!i.toMachineId || i.toMachineId === i.machineId)) throw new StockError("Escolha a máquina de destino (diferente da origem).");
  if (i.operation === "DEVOLUCAO" && i.kind === "FLUXOMETRO_INTUBACAO") throw new StockError("Fluxômetro de intubação não existe no estoque do hospital: use transferência ou retirada.");
  if (i.requestKey && (await db.machineMovement.findUnique({ where: { requestKey: i.requestKey }, select: { id: true } }))) return { duplicate: true };
  try {
    await db.$transaction(async tx => {
      const m = await tx.machine.findUnique({ where: { id: i.machineId } });
      if (!m) throw new StockError("Máquina não encontrada.");
      if (!m.active && (i.operation === "ENTRADA" || i.operation === "AJUSTE")) throw new StockError("Máquina inativa: reative-a para registrar entradas ou ajustes.");
      const label = MACHINE_KIND_LABEL[i.kind];
      const size = cylSize(i.kind), isFlow = i.kind === "FLUXOMETRO";
      const base = { occurredAt: i.occurredAt, responsibleName: i.responsibleName, createdById: i.userId };
      const note = (t: string) => `Máquina: ${m.name} (${t})`;

      const mDec = async (id: string, name: string, q: number) => {
        const r = await tx.machineItem.updateMany({ where: { machineId: id, kind: i.kind, quantity: { gte: q } }, data: { quantity: { decrement: q } } });
        if (r.count !== 1) {
          const cur = await tx.machineItem.findUnique({ where: { machineId_kind: { machineId: id, kind: i.kind } } });
          throw new StockError(`A máquina "${name}" tem apenas ${cur?.quantity ?? 0} (${label}).`);
        }
      };
      const mInc = (id: string, q: number) => tx.machineItem.upsert({ where: { machineId_kind: { machineId: id, kind: i.kind } }, create: { machineId: id, kind: i.kind, quantity: q }, update: { quantity: { increment: q } } });
      const hosp = async () => {
        const l = await tx.location.findUnique({ where: { code: "HOSPITAL" } });
        const t = size ? await tx.cylinderType.findUnique({ where: { size } }) : null;
        if (!l || (size && !t)) throw new StockError("Localização ou tipo de cilindro não cadastrado (rode o seed).");
        return { H: l.id, T: t?.id ?? "" };
      };

      let delta = 0, qty = i.quantity, detail: string | null = null;
      if (i.operation === "ENTRADA") {
        const source = i.kind === "FLUXOMETRO_INTUBACAO" ? "NOVO" : (i.source ?? "CENTRAL");
        if (source === "CENTRAL") {
          if (size) { const { H, T } = await hosp(); await dec(tx, H, T, "CHEIO", qty, `Hospital (cheio) — ${size}`);
            await tx.stockMovement.create({ data: { ...base, operation: "MAQUINA_INTUBACAO", cylinderTypeId: T, quantity: qty, fromLocationId: H, fromCondition: "CHEIO", notes: note("entrada") } }); }
          else if (isFlow) { await fdec(tx, "HOSPITAL", qty);
            await tx.flowmeterMovement.create({ data: { ...base, operation: "MAQUINA", quantity: qty, fromLocation: "HOSPITAL", notes: note("entrada") } }); }
        }
        await mInc(i.machineId, qty); delta = qty;
        detail = source === "CENTRAL" ? "Saiu do estoque do hospital" : "Entrada nova (cadastro/aquisição)";
      } else if (i.operation === "RETIRADA") {
        await mDec(i.machineId, m.name, qty); delta = -qty; detail = "Baixa: saiu do controle";
      } else if (i.operation === "TRANSFERENCIA") {
        const dest = await tx.machine.findUnique({ where: { id: i.toMachineId! } });
        if (!dest || !dest.active) throw new StockError("Máquina de destino não encontrada ou inativa.");
        await mDec(i.machineId, m.name, qty); await mInc(dest.id, qty); delta = -qty; detail = `Para: ${dest.name}`;
      } else if (i.operation === "DEVOLUCAO") {
        const cond = size ? (i.returnCondition ?? "VAZIO") : null;
        await mDec(i.machineId, m.name, qty);
        if (size) { const { H, T } = await hosp(); await inc(tx, H, T, cond!, qty);
          await tx.stockMovement.create({ data: { ...base, operation: "MAQUINA_INTUBACAO", cylinderTypeId: T, quantity: qty, toLocationId: H, toCondition: cond, notes: note("devolução") } }); }
        else if (isFlow) { await finc(tx, "HOSPITAL", qty);
          await tx.flowmeterMovement.create({ data: { ...base, operation: "MAQUINA", quantity: qty, toLocation: "HOSPITAL", notes: note("devolução") } }); }
        delta = -qty; detail = `Voltou ao estoque do hospital${cond ? ` (${COND_LABEL[cond].toLowerCase()})` : ""}`;
      } else { // AJUSTE: informa a nova quantidade presente na máquina
        const cur = (await tx.machineItem.findUnique({ where: { machineId_kind: { machineId: i.machineId, kind: i.kind } } }))?.quantity ?? 0;
        delta = i.quantity - cur;
        if (delta === 0) throw new StockError(`Nenhuma alteração: a máquina já tem ${cur} (${label}).`);
        await tx.machineItem.upsert({ where: { machineId_kind: { machineId: i.machineId, kind: i.kind } }, create: { machineId: i.machineId, kind: i.kind, quantity: i.quantity }, update: { quantity: i.quantity } });
        qty = Math.abs(delta); detail = `Ajustado de ${cur} para ${i.quantity}`;
      }
      await tx.machineMovement.create({ data: { ...base, machineId: i.machineId, toMachineId: i.operation === "TRANSFERENCIA" ? i.toMachineId! : null, operation: i.operation,
        kind: i.kind, quantity: qty, delta, detail, notes: i.notes?.trim() || null, requestKey: i.requestKey ?? null } });
    }, { isolationLevel: "Serializable" });
    await audit({ userId: i.userId, action: "MAQUINA_" + i.operation, entity: "Machine", entityId: i.machineId, after: { kind: i.kind, quantity: i.quantity, to: i.toMachineId } });
    return { duplicate: false };
  } catch (e) {
    if (isDup(e)) return { duplicate: true };
    if (serialFail(e)) throw new StockError("Outro usuário alterou o estoque neste instante. Tente novamente.");
    throw e;
  }
}

// ---------- 15 LOCAIS INTERNOS ----------
// Garante as linhas em "Location" (idempotente: o código é único, nunca duplica).
export async function ensureInternalLocations(client: Prisma.TransactionClient) {
  for (const l of INTERNAL_LOCATIONS) await client.location.upsert({ where: { code: l.code }, update: {}, create: { code: l.code, name: l.name } });
  return client.location.findMany({ where: { code: { in: INTERNAL_CODES } }, select: { id: true, code: true } });
}

async function lfdec(tx: Tx, locationId: string, kind: FlowmeterKind, qty: number, label: string) {
  const r = await tx.flowmeterStock.updateMany({ where: { locationId, kind, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
  if (r.count !== 1) {
    const b = await tx.flowmeterStock.findUnique({ where: { locationId_kind: { locationId, kind } } });
    throw new StockError(`Saldo insuficiente: ${label} tem ${b?.quantity ?? 0}.`);
  }
}
const lfinc = (tx: Tx, locationId: string, kind: FlowmeterKind, qty: number) =>
  tx.flowmeterStock.upsert({ where: { locationId_kind: { locationId, kind } }, create: { locationId, kind, quantity: qty }, update: { quantity: { increment: qty } } });

export type LocalFlowInput = { operation: LocalFlowOperation; kind: FlowmeterKind; quantity: number; fromCode?: string; toCode?: string;
  occurredAt: Date; responsibleName: string; notes?: string; requestKey?: string; userId: string };

// Fluxômetros: estoque central (HOSPITAL) ⇄ local, local ⇄ local, entrada nova e retirada. Cada unidade fica em um único lugar.
export async function applyLocalFlowMove(i: LocalFlowInput): Promise<{ duplicate: boolean }> {
  if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 1_000_000) throw new StockError("Quantidade deve ser maior que zero.");
  const needFrom = i.operation === "DEVOLUCAO_CENTRAL" || i.operation === "TRANSFERENCIA" || i.operation === "RETIRADA";
  const needTo = i.operation === "SAIDA_CENTRAL" || i.operation === "TRANSFERENCIA" || i.operation === "ENTRADA_NOVA";
  if (needFrom && !(i.fromCode && INTERNAL_CODES.includes(i.fromCode))) throw new StockError("Local de origem inválido.");
  if (needTo && !(i.toCode && INTERNAL_CODES.includes(i.toCode))) throw new StockError("Local de destino inválido.");
  if (needTo && i.toCode && LEGACY_CODES.includes(i.toCode)) throw new StockError(LEGACY_MSG);
  if (i.operation === "TRANSFERENCIA" && i.fromCode === i.toCode) throw new StockError("Origem e destino devem ser diferentes.");
  if ((i.operation === "SAIDA_CENTRAL" || i.operation === "DEVOLUCAO_CENTRAL") && i.kind === "INTUBACAO") throw new StockError("Fluxômetro de intubação não existe no estoque central: use entrada nova ou transferência entre locais.");
  if (i.operation === "RETIRADA" && !(i.notes && i.notes.trim().length >= 3)) throw new StockError("Informe o motivo da retirada.");
  if (i.requestKey && (await db.flowmeterLocationMovement.findUnique({ where: { requestKey: i.requestKey }, select: { id: true } }))) return { duplicate: true };
  try {
    await db.$transaction(async tx => {
      const locs = await ensureInternalLocations(tx);
      const idOf = (c?: string) => locs.find(l => l.code === c)?.id ?? null;
      const fromId = needFrom ? idOf(i.fromCode) : null, toId = needTo ? idOf(i.toCode) : null;
      const q = i.quantity;
      if (needFrom) await lfdec(tx, fromId!, i.kind, q, `${LOC_LABEL[i.fromCode!]} (${FM_KIND_LABEL[i.kind]})`);
      if (needTo) await lfinc(tx, toId!, i.kind, q);
      const base = { occurredAt: i.occurredAt, responsibleName: i.responsibleName, createdById: i.userId };
      if (i.operation === "SAIDA_CENTRAL") { // sai do saldo central; fica registrado também no histórico central
        await fdec(tx, "HOSPITAL", q);
        await tx.flowmeterMovement.create({ data: { ...base, operation: "LOCAL", quantity: q, fromLocation: "HOSPITAL", notes: `Local: ${LOC_LABEL[i.toCode!]} (saída)` } });
      }
      if (i.operation === "DEVOLUCAO_CENTRAL") {
        await finc(tx, "HOSPITAL", q);
        await tx.flowmeterMovement.create({ data: { ...base, operation: "LOCAL", quantity: q, toLocation: "HOSPITAL", notes: `Local: ${LOC_LABEL[i.fromCode!]} (devolução)` } });
      }
      await tx.flowmeterLocationMovement.create({ data: { ...base, operation: i.operation, kind: i.kind, quantity: q, fromLocationId: fromId, toLocationId: toId, notes: i.notes?.trim() || null, requestKey: i.requestKey ?? null } });
    }, { isolationLevel: "Serializable" });
    await audit({ userId: i.userId, action: "FLUXOMETRO_LOCAL_" + i.operation, entity: "FlowmeterStock", after: { kind: i.kind, quantity: i.quantity, from: i.fromCode, to: i.toCode } });
    return { duplicate: false };
  } catch (e) {
    if (isDup(e)) return { duplicate: true };
    if (serialFail(e)) throw new StockError("Outro usuário alterou o estoque neste instante. Tente novamente.");
    throw e;
  }
}

// Resumo de cada um dos locais (cilindros por condição, fluxômetros por tipo e máquinas presentes)
export async function locationOverview() {
  const where = { location: { code: { in: INTERNAL_CODES } } };
  const [bal, fl, mach] = await Promise.all([
    db.stockBalance.findMany({ where, include: { location: { select: { code: true } } } }),
    db.flowmeterStock.findMany({ where, include: { location: { select: { code: true } } } }),
    db.machine.findMany({ where: { ...where, active: true }, select: { location: { select: { code: true } } } }),
  ]);
  return ALL_INTERNAL_LOCATIONS.map(l => {
    const b = bal.filter(x => x.location.code === l.code);
    const c = (cond: string) => b.filter(x => x.condition === cond).reduce((a, x) => a + x.quantity, 0);
    const f = (k: string) => fl.filter(x => x.location.code === l.code && x.kind === k).reduce((a, x) => a + x.quantity, 0);
    return { code: l.code as string, name: l.name as string, cheios: c("CHEIO"), vazios: c("VAZIO"), indisp: c("INDISPONIVEL"), cil: b.reduce((a, x) => a + x.quantity, 0),
      flowComum: f("COMUM"), flowIntub: f("INTUBACAO"), machines: mach.filter(m => m.location.code === l.code).length };
  }).filter(r => !LEGACY_CODES.includes(r.code) || r.cil + r.flowComum + r.flowIntub + r.machines > 0); // o local antigo só aparece enquanto tiver saldo
}
