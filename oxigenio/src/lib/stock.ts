import "server-only";
import { Prisma } from "@prisma/client";
import type { CylinderSize, StockCondition, StockOperation, FlowmeterLocation, FlowmeterOperation } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { LOC_LABEL, COND_LABEL, FM_LOC_LABEL } from "./labels";

export class StockError extends Error {}
export type LocCode = "HOSPITAL" | "DOMICILIO" | "TRANSPORTE";
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
  supplier?: string; patientId?: string; responsibleName: string; notes?: string; requestKey?: string; userId: string };

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
      return tx.stockMovement.create({ data: {
        operation: i.operation, cylinderTypeId: t.id, quantity: i.quantity,
        fromLocationId: i.from ? L(i.from.loc) : null, fromCondition: i.from?.cond ?? null,
        toLocationId: i.to ? L(i.to.loc) : null, toCondition: i.to?.cond ?? null,
        occurredAt: i.occurredAt, supplier: i.supplier ?? null, patientId: i.patientId ?? null,
        responsibleName: i.responsibleName, notes: i.notes ?? null, requestKey: i.requestKey ?? null, createdById: i.userId } });
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
  const [types, bal] = await Promise.all([db.cylinderType.findMany({ orderBy: { size: "asc" } }), db.stockBalance.findMany({ include: { location: { select: { code: true } } } })]);
  const rows = types.map(t => {
    const q = (loc: string, cond?: string) => bal.filter(b => b.cylinderTypeId === t.id && b.location.code === loc && (!cond || b.condition === cond)).reduce((a, b) => a + b.quantity, 0);
    const r = { size: t.size as string, label: t.label, hCheio: q("HOSPITAL", "CHEIO"), hVazio: q("HOSPITAL", "VAZIO"), hIndisp: q("HOSPITAL", "INDISPONIVEL"), dom: q("DOMICILIO"), forn: q("TRANSPORTE"), total: 0 };
    r.total = r.hCheio + r.hVazio + r.hIndisp + r.dom + r.forn;
    return r;
  });
  type K = "hCheio" | "hVazio" | "hIndisp" | "dom" | "forn" | "total";
  const s = (k: K) => rows.reduce((a, r) => a + r[k], 0);
  const totals = { hCheio: s("hCheio"), hVazio: s("hVazio"), hIndisp: s("hIndisp"), dom: s("dom"), forn: s("forn"), total: s("total"), hospital: s("hCheio") + s("hVazio") + s("hIndisp") };
  return { rows, totals };
}

// Pendência por fornecedor = vazios enviados − cheios recebidos de volta (apenas registros confirmados e não estornados)
export async function pendingBySupplier() {
  const base = { status: "CONFIRMADA" as const, reversalOfId: null };
  const [sent, ret, types] = await Promise.all([
    db.stockMovement.groupBy({ by: ["supplier", "cylinderTypeId"], where: { ...base, operation: "ENVIO_FORNECEDOR" }, _sum: { quantity: true } }),
    db.stockMovement.groupBy({ by: ["supplier", "cylinderTypeId"], where: { ...base, operation: "RETORNO_FORNECEDOR" }, _sum: { quantity: true } }),
    db.cylinderType.findMany(),
  ]);
  const map = new Map<string, { supplier: string; size: string; sent: number; returned: number }>();
  const add = (arr: typeof sent, k: "sent" | "returned") => arr.forEach(r => {
    const name = (r.supplier ?? "—").trim(); const size = types.find(t => t.id === r.cylinderTypeId)?.size ?? "?";
    const key = name.toLowerCase() + "|" + size; const cur = map.get(key) ?? { supplier: name, size, sent: 0, returned: 0 };
    cur[k] += r._sum.quantity ?? 0; map.set(key, cur); });
  add(sent, "sent"); add(ret, "returned");
  return [...map.values()].map(r => ({ ...r, pending: r.sent - r.returned })).sort((a, b) => a.supplier.localeCompare(b.supplier) || a.size.localeCompare(b.size));
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
  const b = await db.flowmeterBalance.findMany();
  const q = (l: string) => b.find(x => x.location === l)?.quantity ?? 0;
  return { hospital: q("HOSPITAL"), domicilio: q("DOMICILIO"), total: q("HOSPITAL") + q("DOMICILIO") };
}
