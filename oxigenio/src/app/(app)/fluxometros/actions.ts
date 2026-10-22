"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate } from "@/lib/format";

const create = z.object({
  code: z.string().max(60).optional(),
  quantity: z.coerce.number().int().min(1, "Quantidade deve ser ao menos 1.").default(1),
  state: z.enum(["HOSPITAL", "DOMICILIO", "MANUTENCAO", "INDISPONIVEL"]),
  lastCheck: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

// Cadastro inicial. Mudanças de local acontecem por movimentação (Etapa 3), para não contar o mesmo item 2x.
export async function createFlowmeter(fd: FormData) {
  const user = await requireWriter();
  const p = create.safeParse(formObj(fd));
  if (!p.success) redirect(`/fluxometros?erro=${encodeURIComponent(p.error.issues[0].message)}`);
  const { code, lastCheck, ...rest } = p.data;
  if (code && (await db.flowmeter.findUnique({ where: { code } })))
    redirect(`/fluxometros?erro=${encodeURIComponent("Este patrimônio já está cadastrado.")}`);
  const f = await db.flowmeter.create({ data: { ...rest, code: code ?? null, quantity: code ? 1 : rest.quantity, lastCheck: lastCheck ? parseDate(lastCheck) : null } });
  await audit({ userId: user.id, action: "FLUXOMETRO_CRIADO", entity: "Flowmeter", entityId: f.id, after: f });
  redirect("/fluxometros?ok=1");
}

export async function updateFlowmeterInfo(fd: FormData) {
  const user = await requireWriter();
  const id = String(fd.get("id"));
  const lc = String(fd.get("lastCheck") ?? "");
  const before = await db.flowmeter.findUnique({ where: { id } });
  if (!before) redirect("/fluxometros");
  const after = await db.flowmeter.update({ where: { id }, data: {
    lastCheck: /^\d{4}-\d{2}-\d{2}$/.test(lc) ? parseDate(lc) : before.lastCheck,
    notes: String(fd.get("notes") ?? "").trim() || null } });
  await audit({ userId: user.id, action: "FLUXOMETRO_EDITADO", entity: "Flowmeter", entityId: id, before, after });
  redirect("/fluxometros?ok=1");
}
