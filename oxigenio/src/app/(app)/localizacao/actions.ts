"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { LocalFlowOperation, StockOperation } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate, todayStr } from "@/lib/format";
import { applyMovement, applyLocalFlowMove, ensureInternalLocations, StockError, type Pt } from "@/lib/stock";
import { INTERNAL_CODES, LEGACY_CODES, LEGACY_MSG } from "@/lib/labels";

const code = z.string().refine(v => INTERNAL_CODES.includes(v), "Local inválido.");
const qty = z.coerce.number({ invalid_type_error: "Informe a quantidade." }).int("Quantidade deve ser um número inteiro.").min(1, "Quantidade deve ser maior que zero.").max(1000000);
const cond = z.enum(["CHEIO", "VAZIO", "INDISPONIVEL"]);
const common = {
  code, other: code.optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  responsibleName: z.string().trim().min(2, "Informe o responsável."),
  notes: z.string().max(500).optional(), requestKey: z.string().max(80).optional(),
};
const cylSchema = z.object({ ...common, op: z.enum(["RECEBER_CENTRAL", "DEVOLVER_CENTRAL", "TRANSFERIR", "RECEBER_OUTRO", "MUDAR_CONDICAO"]), size: z.enum(["P", "M", "G"]), quantity: qty, cond, cond2: cond.optional() });
const flowSchema = z.object({ ...common, op: z.enum(["RECEBER_CENTRAL", "DEVOLVER_CENTRAL", "TRANSFERIR", "RECEBER_OUTRO", "ENTRADA_NOVA", "RETIRADA"]), kind: z.enum(["COMUM", "INTUBACAO"]), quantity: qty });

const to = (rawCode: unknown, q: string): never => redirect(`${INTERNAL_CODES.includes(String(rawCode)) ? `/localizacao/${rawCode}` : "/localizacao"}?${q}`);
const fail = (rawCode: unknown, m: string): never => to(rawCode, `erro=${encodeURIComponent(m)}`);

export async function registerLocationCylinderMove(fd: FormData) {
  const user = await requireWriter();
  const raw = formObj(fd);
  const p = cylSchema.safeParse(raw);
  if (!p.success) return fail(raw.code, p.error.issues[0].message);
  const d = p.data, here = d.code;
  if (d.occurredAt > todayStr()) return fail(here, "A data não pode ser futura.");
  if ((d.op === "TRANSFERIR" || d.op === "RECEBER_OUTRO") && (!d.other || d.other === here)) return fail(here, "Escolha o outro local (diferente deste).");
  let spec: { operation: StockOperation; from: Pt; to: Pt };
  switch (d.op) {
    case "RECEBER_CENTRAL": spec = { operation: "SAIDA_LOCAL", from: { loc: "HOSPITAL", cond: d.cond }, to: { loc: here, cond: d.cond } }; break;
    case "DEVOLVER_CENTRAL": spec = { operation: "DEVOLUCAO_LOCAL", from: { loc: here, cond: d.cond }, to: { loc: "HOSPITAL", cond: d.cond } }; break;
    case "TRANSFERIR": spec = { operation: "TRANSFERENCIA_LOCAL", from: { loc: here, cond: d.cond }, to: { loc: d.other!, cond: d.cond } }; break;
    case "RECEBER_OUTRO": spec = { operation: "TRANSFERENCIA_LOCAL", from: { loc: d.other!, cond: d.cond }, to: { loc: here, cond: d.cond } }; break;
    default:
      if (!d.cond2 || d.cond2 === d.cond) return fail(here, "Escolha duas condições diferentes.");
      spec = { operation: "TRANSFERENCIA_LOCAL", from: { loc: here, cond: d.cond }, to: { loc: here, cond: d.cond2 } };
  }
  if (LEGACY_CODES.includes(spec.to.loc) && spec.from.loc !== spec.to.loc) return fail(here, LEGACY_MSG);
  let msg: string | null = null, dup = false;
  try {
    await ensureInternalLocations(db);
    dup = (await applyMovement({ ...spec, size: d.size, quantity: d.quantity, occurredAt: parseDate(d.occurredAt), responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id })).duplicate;
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return to(here, msg ? `erro=${encodeURIComponent(msg)}` : `ok=${dup ? "dup" : "1"}`);
}

export async function registerLocationFlowmeterMove(fd: FormData) {
  const user = await requireWriter();
  const raw = formObj(fd);
  const p = flowSchema.safeParse(raw);
  if (!p.success) return fail(raw.code, p.error.issues[0].message);
  const d = p.data, here = d.code;
  if (d.occurredAt > todayStr()) return fail(here, "A data não pode ser futura.");
  if ((d.op === "TRANSFERIR" || d.op === "RECEBER_OUTRO") && (!d.other || d.other === here)) return fail(here, "Escolha o outro local (diferente deste).");
  const map: Record<string, { operation: LocalFlowOperation; fromCode?: string; toCode?: string }> = {
    RECEBER_CENTRAL: { operation: "SAIDA_CENTRAL", toCode: here }, DEVOLVER_CENTRAL: { operation: "DEVOLUCAO_CENTRAL", fromCode: here },
    TRANSFERIR: { operation: "TRANSFERENCIA", fromCode: here, toCode: d.other }, RECEBER_OUTRO: { operation: "TRANSFERENCIA", fromCode: d.other, toCode: here },
    ENTRADA_NOVA: { operation: "ENTRADA_NOVA", toCode: here }, RETIRADA: { operation: "RETIRADA", fromCode: here },
  };
  let msg: string | null = null, dup = false;
  try {
    dup = (await applyLocalFlowMove({ ...map[d.op], kind: d.kind, quantity: d.quantity, occurredAt: parseDate(d.occurredAt), responsibleName: d.responsibleName, notes: d.notes, requestKey: d.requestKey, userId: user.id })).duplicate;
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  return to(here, msg ? `erro=${encodeURIComponent(msg)}` : `ok=${dup ? "dup" : "1"}`);
}
