"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate, todayStr } from "@/lib/format";
import { applyFlowmeter, reverseFlowmeter, setFlowmeterStock, StockError, type FlowInput } from "@/lib/stock";

const MAP: Record<string, Pick<FlowInput, "operation" | "from" | "to">> = {
  ADD_HOSPITAL: { operation: "ENTRADA", to: "HOSPITAL" }, ADD_DOMICILIO: { operation: "ENTRADA", to: "DOMICILIO" },
  HOSP_DOM: { operation: "ENVIO_DOMICILIO", from: "HOSPITAL", to: "DOMICILIO" }, DOM_HOSP: { operation: "RETORNO_DOMICILIO", from: "DOMICILIO", to: "HOSPITAL" },
  BAIXA_HOSPITAL: { operation: "BAIXA", from: "HOSPITAL" }, BAIXA_DOMICILIO: { operation: "BAIXA", from: "DOMICILIO" },
};
const schema = z.object({
  kind: z.enum(["ADD_HOSPITAL", "ADD_DOMICILIO", "HOSP_DOM", "DOM_HOSP", "BAIXA_HOSPITAL", "BAIXA_DOMICILIO"]),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  quantity: z.coerce.number({ invalid_type_error: "Informe a quantidade." }).int().min(1, "Quantidade deve ser maior que zero.").max(100000),
  responsibleName: z.string().min(2, "Informe o responsável."),
  notes: z.string().max(500).optional(), requestKey: z.string().max(80).optional(),
});
const done = (msg: string | null, dup = false): never => redirect(msg ? `/fluxometros?erro=${encodeURIComponent(msg)}` : `/fluxometros?ok=${dup ? "dup" : "1"}`);

export async function registerFlowmeter(fd: FormData) {
  const user = await requireWriter();
  const p = schema.safeParse(formObj(fd));
  if (!p.success) return done(p.error.issues[0].message);
  const d = p.data;
  if (d.occurredAt > todayStr()) return done("A data não pode ser futura.");
  if (d.kind.startsWith("BAIXA") && !d.notes) return done("Informe o motivo da baixa.");
  let msg: string | null = null; let dup = false;
  try { dup = (await applyFlowmeter({ ...MAP[d.kind], quantity: d.quantity, occurredAt: parseDate(d.occurredAt), responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id })).duplicate; }
  catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return done(msg, dup);
}

export async function reverseFlowmeterMovement(fd: FormData) {
  const user = await requireWriter();
  let msg: string | null = null;
  try { await reverseFlowmeter({ id: String(fd.get("id")), reason: String(fd.get("reason") ?? ""), userId: user.id, userName: user.name }); }
  catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return done(msg);
}

const num = z.coerce.number({ invalid_type_error: "Use apenas números." }).int("Use apenas números inteiros.").min(0, "Não use números negativos.").max(1000000);
const stockSchema = z.object({ total: num, dom: num, enf: num, requestKey: z.string().max(80).optional() });

export async function saveFlowmeterStock(fd: FormData) {
  const user = await requireWriter();
  const p = stockSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return done(p.error.issues[0].message);
  let msg: string | null = null; let ok = "estoque";
  try {
    const r = await setFlowmeterStock({ total: p.data.total, dom: p.data.dom, enf: p.data.enf }, { userId: user.id, userName: user.name }, p.data.requestKey);
    if (r.duplicate) ok = "dup"; else if (r.changed === 0) ok = "nenhuma";
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return msg ? done(msg) : redirect(`/fluxometros?ok=${ok}`);
}
