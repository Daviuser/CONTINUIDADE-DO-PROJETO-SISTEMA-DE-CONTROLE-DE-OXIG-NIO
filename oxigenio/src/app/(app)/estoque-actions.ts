"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate, todayStr } from "@/lib/format";
import { applyMovement, reverseMovement, StockError, type MoveInput } from "@/lib/stock";

const base = z.object({
  back: z.enum(["/cilindros", "/abastecimentos", "/trocas", "/domicilio"]),
  requestKey: z.string().max(80).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  size: z.enum(["P", "M", "G"]),
  quantity: z.coerce.number({ invalid_type_error: "Informe a quantidade." }).int("Quantidade deve ser um número inteiro.").min(1, "Quantidade deve ser maior que zero.").max(100000),
  responsibleName: z.string().min(2, "Informe o responsável."),
  notes: z.string().max(500).optional(),
});

async function go<T extends z.ZodRawShape>(fd: FormData, extra: z.ZodObject<T>,
  build: (d: z.infer<typeof base> & z.infer<z.ZodObject<T>>, userId: string) => Promise<Omit<MoveInput, "size" | "quantity" | "occurredAt" | "responsibleName" | "notes" | "requestKey" | "userId">>) {
  const user = await requireWriter();
  const raw = formObj(fd);
  const backRaw = String(raw.back ?? "/cilindros");
  const fail = (m: string): never => redirect(`${backRaw}?erro=${encodeURIComponent(m)}`);
  const p = base.merge(extra).safeParse(raw);
  if (!p.success) return fail(p.error.issues[0].message);
  const d = p.data as z.infer<typeof base> & z.infer<z.ZodObject<T>>;
  if (d.occurredAt > todayStr()) return fail("A data não pode ser futura.");
  let msg: string | null = null; let dup = false;
  try {
    const spec = await build(d, user.id);
    dup = (await applyMovement({ ...spec, size: d.size, quantity: d.quantity, occurredAt: parseDate(d.occurredAt),
      responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id })).duplicate;
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  redirect(msg ? `${d.back}?erro=${encodeURIComponent(msg)}` : `${d.back}?ok=${dup ? "dup" : "1"}`);
}
const none = z.object({});
const supplier = z.object({ supplier: z.string().min(2, "Informe o fornecedor.").max(80) });
const patient = z.object({ patientId: z.string().min(1, "Selecione o paciente.") });

async function activePatient(id: string) {
  const p = await db.patient.findUnique({ where: { id }, select: { status: true } });
  if (!p) throw new StockError("Paciente não encontrado.");
  if (p.status !== "ATIVO") throw new StockError("Paciente inativo: reative o acompanhamento antes de registrar.");
}

// Cadastro/ajuste inicial de quantidade (domicílio = em uso; fornecedor = vazios)
export async function registerInitialStock(fd: FormData) {
  return go(fd, z.object({ location: z.enum(["HOSPITAL", "DOMICILIO", "TRANSPORTE"]), condition: z.enum(["CHEIO", "VAZIO", "INDISPONIVEL"]) }), async d => ({
    operation: "ENTRADA_INICIAL", to: { loc: d.location, cond: d.location === "DOMICILIO" ? "CHEIO" : d.location === "TRANSPORTE" ? "VAZIO" : d.condition } }));
}

export async function registerSupply(fd: FormData) {
  return go(fd, supplier, async d => ({ operation: "ABASTECIMENTO", supplier: d.supplier.trim(), to: { loc: "HOSPITAL", cond: "CHEIO" } }));
}

export async function registerUnavailable(fd: FormData) {
  return go(fd, z.object({ direction: z.enum(["INDISPONIVEL", "DISPONIVEL"]), condition: z.enum(["CHEIO", "VAZIO"]) }), async d => {
    if (d.direction === "INDISPONIVEL" && !d.notes) throw new StockError("Informe o motivo da indisponibilidade.");
    return d.direction === "INDISPONIVEL"
      ? { operation: "BAIXA_INDISPONIVEL", from: { loc: "HOSPITAL", cond: d.condition }, to: { loc: "HOSPITAL", cond: "INDISPONIVEL" } }
      : { operation: "RETORNO_DISPONIVEL", from: { loc: "HOSPITAL", cond: "INDISPONIVEL" }, to: { loc: "HOSPITAL", cond: d.condition } };
  });
}

export async function registerDelivery(fd: FormData) {
  return go(fd, patient, async d => { await activePatient(d.patientId);
    return { operation: "ENTREGA_DOMICILIAR", patientId: d.patientId, from: { loc: "HOSPITAL", cond: "CHEIO" }, to: { loc: "DOMICILIO", cond: "CHEIO" } }; });
}

// Recolhidos são considerados VAZIOS (padrão); pode-se marcar "cheio" se retornou sem uso
export async function registerCollection(fd: FormData) {
  return go(fd, patient.extend({ condition: z.enum(["VAZIO", "CHEIO"]).default("VAZIO") }), async d => { await activePatient(d.patientId);
    return { operation: "RECOLHIMENTO_DOMICILIAR", patientId: d.patientId, from: { loc: "DOMICILIO", cond: "CHEIO" }, to: { loc: "HOSPITAL", cond: d.condition } }; });
}

export async function registerSupplierSend(fd: FormData) {
  return go(fd, supplier, async d => ({ operation: "ENVIO_FORNECEDOR", supplier: d.supplier.trim(), from: { loc: "HOSPITAL", cond: "VAZIO" }, to: { loc: "TRANSPORTE", cond: "VAZIO" } }));
}

export async function registerSupplierReturn(fd: FormData) {
  return go(fd, supplier, async d => ({ operation: "RETORNO_FORNECEDOR", supplier: d.supplier.trim(), from: { loc: "TRANSPORTE", cond: "VAZIO" }, to: { loc: "HOSPITAL", cond: "CHEIO" } }));
}

export async function reverseCylinderMovement(fd: FormData) {
  const user = await requireWriter();
  const back = z.enum(["/cilindros", "/abastecimentos", "/trocas", "/domicilio"]).catch("/cilindros").parse(fd.get("back"));
  let msg: string | null = null;
  try { await reverseMovement({ id: String(fd.get("id")), reason: String(fd.get("reason") ?? ""), userId: user.id, userName: user.name }); }
  catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  redirect(msg ? `${back}?erro=${encodeURIComponent(msg)}` : `${back}?ok=1`);
}
