"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/perm";

const bad = (m: string): never => redirect(`/configuracoes?erro=${encodeURIComponent(m)}`);

export async function updateCylinderType(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const label = z.string().min(2).safeParse(fd.get("label"));
  const cap = String(fd.get("capacityLiters") ?? "").replace(",", ".").trim();
  if (!label.success || (cap && !(Number(cap) > 0))) return bad("Dados inválidos.");
  const before = await db.cylinderType.findUnique({ where: { id } });
  const after = await db.cylinderType.update({ where: { id }, data: { label: label.data, capacityLiters: cap || null } });
  await audit({ userId: admin.id, action: "TIPO_CILINDRO_EDITADO", entity: "CylinderType", entityId: id, before, after });
  redirect("/configuracoes?ok=1");
}

export async function addLocation(fd: FormData) {
  const admin = await requireAdmin();
  const name = z.string().min(2).max(60).safeParse(fd.get("name"));
  if (!name.success) return bad("Informe o nome da localização.");
  const code = name.data.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (await db.location.findUnique({ where: { code } })) return bad("Localização já existe.");
  const l = await db.location.create({ data: { code, name: name.data } });
  await audit({ userId: admin.id, action: "LOCALIZACAO_CRIADA", entity: "Location", entityId: l.id, after: l });
  redirect("/configuracoes?ok=1");
}

export async function toggleLocation(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const l = await db.location.findUnique({ where: { id } });
  if (!l || ["HOSPITAL", "DOMICILIO", "TRANSPORTE"].includes(l.code)) return bad("Localização padrão não pode ser desativada.");
  await db.location.update({ where: { id }, data: { active: !l.active } });
  await audit({ userId: admin.id, action: "LOCALIZACAO_ALTERADA", entity: "Location", entityId: id, before: { active: l.active }, after: { active: !l.active } });
  redirect("/configuracoes?ok=1");
}
