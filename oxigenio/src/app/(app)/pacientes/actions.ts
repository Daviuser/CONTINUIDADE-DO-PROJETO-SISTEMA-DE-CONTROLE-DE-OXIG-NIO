"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireWriter } from "@/lib/perm";
import { formObj, parseDate } from "@/lib/format";

const schema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(3, "Informe o nome completo."),
  phone: z.string().max(30).optional(),
  address: z.string().min(2, "Informe o endereço."),
  neighborhood: z.string().optional(),
  village: z.string().optional(),
  reference: z.string().optional(),
  cylinderSize: z.enum(["P", "M", "G"]).optional(),
  cylinderQty: z.coerce.number().int().min(0, "Quantidade não pode ser negativa.").default(0),
  flowLpm: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início."),
  notes: z.string().optional(),
  responsibleId: z.string().optional(),
});

export async function savePatient(fd: FormData) {
  const user = await requireWriter();
  const p = schema.safeParse(formObj(fd));
  const rawId = fd.get("id");
  const back = typeof rawId === "string" && rawId ? `/pacientes/${rawId}` : "/pacientes/novo";
  if (!p.success) redirect(`${back}?erro=${encodeURIComponent(p.error.issues[0].message)}`);
  const { id, startDate, ...rest } = p.data;
  const data = { ...rest, startDate: parseDate(startDate) };
  if (id) {
    const before = await db.patient.findUnique({ where: { id } });
    if (!before) redirect("/pacientes");
    const after = await db.patient.update({ where: { id }, data });
    await audit({ userId: user.id, action: "PACIENTE_EDITADO", entity: "Patient", entityId: id, before, after });
    revalidatePath(`/pacientes/${id}`);
    redirect(`/pacientes/${id}?ok=1`);
  }
  const created = await db.patient.create({ data: { ...data, responsibleId: data.responsibleId ?? user.id } });
  await audit({ userId: user.id, action: "PACIENTE_CRIADO", entity: "Patient", entityId: created.id, after: created });
  redirect(`/pacientes/${created.id}?ok=1`);
}

// Encerrar/reativar: nunca apaga histórico
export async function setPatientStatus(fd: FormData) {
  const user = await requireWriter();
  const id = String(fd.get("id"));
  const status = fd.get("status") === "INATIVO" ? "INATIVO" : "ATIVO";
  const reason = String(fd.get("reason") ?? "").trim();
  if (status === "INATIVO" && reason.length < 3) redirect(`/pacientes/${id}?erro=${encodeURIComponent("Informe o motivo do encerramento.")}`);
  const before = await db.patient.findUnique({ where: { id } });
  if (!before) redirect("/pacientes");
  const after = await db.patient.update({ where: { id }, data: { status, endDate: status === "INATIVO" ? new Date() : null } });
  await audit({ userId: user.id, action: status === "INATIVO" ? "PACIENTE_ENCERRADO" : "PACIENTE_REATIVADO",
    entity: "Patient", entityId: id, before: { status: before.status }, after: { status: after.status }, reason });
  redirect(`/pacientes/${id}?ok=1`);
}
