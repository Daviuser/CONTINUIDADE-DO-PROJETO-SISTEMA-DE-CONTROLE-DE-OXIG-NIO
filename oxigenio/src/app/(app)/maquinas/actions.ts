"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate, todayStr } from "@/lib/format";
import { applyMachineMovement, StockError } from "@/lib/stock";
import { LOC_LABEL, MACHINE_KINDS } from "@/lib/labels";

const machineSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome da máquina.").max(80),
  code: z.string().trim().max(40).optional(),
  location: z.enum(["HOSPITAL", "ENFERMARIAS"], { errorMap: () => ({ message: "Escolha o local." }) }),
  notes: z.string().max(500).optional(),
});
const go = (path: string, q: string): never => redirect(`${path}?${q}`);
const err = (path: string, m: string): never => go(path, `erro=${encodeURIComponent(m)}`);

async function locationId(code: "HOSPITAL" | "ENFERMARIAS") {
  return (await db.location.upsert({ where: { code }, update: {}, create: { code, name: LOC_LABEL[code] }, select: { id: true } })).id;
}

export async function createMachine(fd: FormData) {
  const user = await requireWriter();
  const p = machineSchema.safeParse(formObj(fd));
  if (!p.success) return err("/maquinas", p.error.issues[0].message);
  try {
    const m = await db.machine.create({ data: { name: p.data.name, code: p.data.code || null, notes: p.data.notes || null, locationId: await locationId(p.data.location) } });
    await audit({ userId: user.id, action: "MAQUINA_CRIADA", entity: "Machine", entityId: m.id, after: { name: m.name, code: m.code, location: p.data.location } });
    return go(`/maquinas/${m.id}`, "ok=1");
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return err("/maquinas", "Já existe uma máquina com esta identificação.");
    throw e;
  }
}

export async function updateMachine(fd: FormData) {
  const user = await requireWriter();
  const p = machineSchema.safeParse(formObj(fd));
  const id = String(fd.get("id") ?? "");
  const back = `/maquinas/${id}`;
  if (!p.success) return err(back, p.error.issues[0].message);
  const active = fd.get("active") === "on";
  const before = await db.machine.findUnique({ where: { id }, include: { location: true } });
  if (!before) return go("/maquinas", "erro=" + encodeURIComponent("Máquina não encontrada."));
  if (!active && before.active) {
    const left = (await db.machineItem.aggregate({ where: { machineId: id }, _sum: { quantity: true } }))._sum.quantity ?? 0;
    if (left > 0) return err(back, `A máquina ainda tem ${left} item(ns). Devolva, transfira ou retire antes de desativar.`);
  }
  try {
    const after = await db.machine.update({ where: { id }, data: { name: p.data.name, code: p.data.code || null, notes: p.data.notes || null, active, locationId: await locationId(p.data.location) } });
    await audit({ userId: user.id, action: "MAQUINA_EDITADA", entity: "Machine", entityId: id,
      before: { name: before.name, code: before.code, location: before.location.code, active: before.active }, after: { name: after.name, code: after.code, location: p.data.location, active } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return err(back, "Já existe uma máquina com esta identificação.");
    throw e;
  }
  return go(back, "ok=1");
}

const moveSchema = z.object({
  machineId: z.string().min(1),
  operation: z.enum(["ENTRADA", "RETIRADA", "TRANSFERENCIA", "DEVOLUCAO", "AJUSTE"]),
  kind: z.enum(MACHINE_KINDS),
  quantity: z.coerce.number({ invalid_type_error: "Informe a quantidade." }).int("Quantidade deve ser um número inteiro.").min(0, "Não use números negativos.").max(1000000),
  source: z.enum(["CENTRAL", "NOVO"]).optional(),
  toMachineId: z.string().optional(),
  returnCondition: z.enum(["CHEIO", "VAZIO"]).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  responsibleName: z.string().trim().min(2, "Informe o responsável."),
  notes: z.string().max(500).optional(),
  requestKey: z.string().max(80).optional(),
});

export async function registerMachineMovement(fd: FormData) {
  const user = await requireWriter();
  const raw = formObj(fd);
  const back = `/maquinas/${String(raw.machineId ?? "")}`;
  const p = moveSchema.safeParse(raw);
  if (!p.success) return err(back, p.error.issues[0].message);
  const d = p.data;
  if (d.occurredAt > todayStr()) return err(back, "A data não pode ser futura.");
  let msg: string | null = null, dup = false;
  try {
    dup = (await applyMachineMovement({ machineId: d.machineId, operation: d.operation, kind: d.kind, quantity: d.quantity, source: d.source, toMachineId: d.toMachineId,
      returnCondition: d.returnCondition, occurredAt: parseDate(d.occurredAt), responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id })).duplicate;
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return go(back, msg ? `erro=${encodeURIComponent(msg)}` : `ok=${dup ? "dup" : "1"}`);
}
