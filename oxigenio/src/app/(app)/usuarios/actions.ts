"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/perm";
import { formObj } from "@/lib/format";

const pw = z.string().min(10, "A senha deve ter ao menos 10 caracteres.");
const create = z.object({
  name: z.string().min(3, "Informe o nome."), username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, "Usuário: 3 a 40 caracteres, apenas letras, números, ponto, hífen e sublinhado."),
  jobTitle: z.string().optional(), role: z.enum(["ADMIN", "OPERADOR", "CONSULTA"]), password: pw });
const bad = (m: string): never => redirect(`/usuarios?erro=${encodeURIComponent(m)}`);

export async function createUser(fd: FormData) {
  const admin = await requireAdmin();
  const p = create.safeParse(formObj(fd));
  if (!p.success) return bad(p.error.issues[0].message);
  const { password, username, ...d } = p.data;
  const email = username; // guardado na coluna "email" (sem migration)
  if (await db.user.findUnique({ where: { email } })) return bad("Já existe um usuário com este nome de acesso.");
  const u = await db.user.create({ data: { ...d, email, passwordHash: await hash(password) } });
  await audit({ userId: admin.id, action: "USUARIO_CRIADO", entity: "User", entityId: u.id, after: { email, role: d.role } });
  redirect("/usuarios?ok=1");
}

export async function updateUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const role = z.enum(["ADMIN", "OPERADOR", "CONSULTA"]).safeParse(fd.get("role"));
  const active = fd.get("active") === "on";
  if (!role.success) return bad("Perfil inválido.");
  if (id === admin.id && (!active || role.data !== "ADMIN")) return bad("Você não pode remover seu próprio acesso de administrador.");
  const before = await db.user.findUnique({ where: { id } });
  if (!before) return bad("Usuário não encontrado.");
  await db.user.update({ where: { id }, data: { role: role.data, active } });
  if (!active) await db.session.deleteMany({ where: { userId: id } });
  await audit({ userId: admin.id, action: "USUARIO_EDITADO", entity: "User", entityId: id,
    before: { role: before.role, active: before.active }, after: { role: role.data, active } });
  redirect("/usuarios?ok=1");
}

export async function resetPassword(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const p = pw.safeParse(fd.get("password"));
  if (!p.success) return bad(p.error.issues[0].message);
  await db.user.update({ where: { id }, data: { passwordHash: await hash(p.data), failedLogins: 0, lockedUntil: null } });
  await db.session.deleteMany({ where: { userId: id } });
  await audit({ userId: admin.id, action: "SENHA_REDEFINIDA", entity: "User", entityId: id });
  redirect("/usuarios?ok=1");
}
