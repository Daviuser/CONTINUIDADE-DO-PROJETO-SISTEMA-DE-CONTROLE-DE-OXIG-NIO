"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate, todayStr } from "@/lib/format";
import { applyMovement, applySupplyBatch, reverseMovement, StockError, type MoveInput } from "@/lib/stock";
import { saveReceipt, removeReceipt, type ReceiptMeta } from "@/lib/receipts";

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
  build: (d: z.infer<typeof base> & z.infer<z.ZodObject<T>>, userId: string) => Promise<Omit<MoveInput, "size" | "quantity" | "occurredAt" | "responsibleName" | "notes" | "requestKey" | "userId" | "receipt">>,
  opts?: { receipt?: boolean }) {
  const user = await requireWriter();
  const raw = formObj(fd);
  const backRaw = String(raw.back ?? "/cilindros");
  const fail = (m: string): never => redirect(`${backRaw}?erro=${encodeURIComponent(m)}`);
  const p = base.merge(extra).safeParse(raw);
  if (!p.success) return fail(p.error.issues[0].message);
  const d = p.data as z.infer<typeof base> & z.infer<z.ZodObject<T>>;
  if (d.occurredAt > todayStr()) return fail("A data não pode ser futura.");
  // Foto do recibo (opcional): validada e enviada ANTES de registrar. Se o envio falhar, nada é registrado.
  let receipt: ReceiptMeta | undefined;
  const file = opts?.receipt ? fd.get("receipt") : null;
  if (file instanceof File && file.size > 0) {
    try { receipt = await saveReceipt(file); }
    catch (e) {
      if (e instanceof StockError) return fail(e.message);
      console.error("Falha no envio do recibo:", e instanceof Error ? e.message : "erro");
      return fail("Não foi possível enviar a foto do recibo. Nada foi registrado; tente novamente ou registre sem a foto.");
    }
  }
  let msg: string | null = null; let dup = false;
  try {
    const spec = await build(d, user.id);
    dup = (await applyMovement({ ...spec, size: d.size, quantity: d.quantity, occurredAt: parseDate(d.occurredAt),
      responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id, receipt })).duplicate;
  } catch (e) {
    if (e instanceof StockError) msg = e.message;
    else { if (receipt) await removeReceipt(receipt.pathname); throw e; }
  }
  if (receipt && (dup || msg)) await removeReceipt(receipt.pathname); // não deixa arquivo órfão
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
  return go(fd, none, async () => ({ operation: "ENVIO_FORNECEDOR", from: { loc: "HOSPITAL", cond: "VAZIO" }, to: { loc: "TRANSPORTE", cond: "VAZIO" } }));
}

export async function reverseCylinderMovement(fd: FormData) {
  const user = await requireWriter();
  const back = z.enum(["/cilindros", "/abastecimentos", "/trocas", "/domicilio"]).catch("/cilindros").parse(fd.get("back"));
  let msg: string | null = null;
  try { await reverseMovement({ id: String(fd.get("id")), reason: String(fd.get("reason") ?? ""), userId: user.id, userName: user.name }); }
  catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  redirect(msg ? `${back}?erro=${encodeURIComponent(msg)}` : `${back}?ok=1`);
}

// Abastecimento: P, M e G no mesmo formulário. Campos vazios = sem abastecimento; só números inteiros >= 0.
const supplyBase = z.object({
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  responsibleName: z.string().trim().min(2, "Informe o responsável."),
  notes: z.string().max(500).optional(),
  requestKey: z.string().max(80).optional(),
});

export async function registerSupplyBatch(fd: FormData) {
  const user = await requireWriter();
  const fail = (m: string): never => redirect(`/abastecimentos?erro=${encodeURIComponent(m)}`);
  const p = supplyBase.safeParse(formObj(fd));
  if (!p.success) return fail(p.error.issues[0].message);
  if (p.data.occurredAt > todayStr()) return fail("A data não pode ser futura.");
  const quantities: Partial<Record<"P" | "M" | "G", number>> = {};
  for (const sz of ["P", "M", "G"] as const) {
    const v = String(fd.get(`qty_${sz}`) ?? "").trim();
    if (v === "") continue;
    if (!/^\d+$/.test(v)) return fail(`Categoria ${sz}: use apenas números inteiros, sem decimais nem valores negativos.`);
    const n = Number(v);
    if (n > 100000) return fail(`Categoria ${sz}: quantidade muito alta.`);
    if (n > 0) quantities[sz] = n;
  }
  if (!Object.keys(quantities).length) return fail("Informe pelo menos uma quantidade maior que zero (P, M ou G).");

  // Foto do recibo (opcional): enviada antes; se falhar, nada é registrado. Uma foto vale para todo o abastecimento.
  let receipt: ReceiptMeta | undefined;
  const file = fd.get("receipt");
  if (file instanceof File && file.size > 0) {
    try { receipt = await saveReceipt(file); }
    catch (e) {
      if (e instanceof StockError) return fail(e.message);
      console.error("Falha no envio do recibo:", e instanceof Error ? e.message : "erro");
      return fail("Não foi possível enviar a foto do recibo. Nada foi registrado; tente novamente ou salve sem a foto.");
    }
  }
  let msg: string | null = null, dup = false, resumo = "";
  try {
    const r = await applySupplyBatch({ quantities, occurredAt: parseDate(p.data.occurredAt), responsibleName: p.data.responsibleName, notes: p.data.notes, requestKey: p.data.requestKey, userId: user.id, receipt });
    dup = r.duplicate; resumo = r.saved.map(x => `${x.size}: ${x.quantity}`).join(" · ");
  } catch (e) {
    if (e instanceof StockError) msg = e.message;
    else { if (receipt) await removeReceipt(receipt.pathname); throw e; }
  }
  if (receipt && (dup || msg)) await removeReceipt(receipt.pathname);
  redirect(msg ? `/abastecimentos?erro=${encodeURIComponent(msg)}` : dup ? "/abastecimentos?ok=dup" : `/abastecimentos?ok=lote&resumo=${encodeURIComponent(resumo)}`);
}
