import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { verify } from "@node-rs/argon2";
import { db } from "./db";
import type { Role } from "@prisma/client";

const COOKIE = "sid";
const IDLE_MIN = Number(process.env.SESSION_IDLE_MINUTES ?? 30);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const fail = { ok: false as const, error: "E-mail ou senha inválidos." };
  if (!user || !user.active) return fail;
  if (user.lockedUntil && user.lockedUntil > new Date())
    return { ok: false as const, error: "Conta bloqueada temporariamente. Tente mais tarde." };
  if (!(await verify(user.passwordHash, password))) {
    const n = user.failedLogins + 1;
    await db.user.update({ where: { id: user.id }, data: {
      failedLogins: n, lockedUntil: n >= 5 ? new Date(Date.now() + 15 * 60000) : null } });
    await db.auditLog.create({ data: { userId: user.id, action: "LOGIN_FALHOU", entity: "User", entityId: user.id } });
    return fail;
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const token = randomBytes(32).toString("hex");
  await db.session.create({ data: { tokenHash: sha(token), userId: user.id,
    expiresAt: new Date(Date.now() + 12 * 3600000) } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/" });
  await db.auditLog.create({ data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id } });
  return { ok: true as const };
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!s || !s.user.active || s.expiresAt < new Date() ||
      Date.now() - s.lastSeenAt.getTime() > IDLE_MIN * 60000) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 60000)
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return s.user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha(token) } });
  jar.delete(COOKIE);
}

// Uso em páginas e ações: garante login e perfil mínimo (checagem no backend)
export async function requireUser(roles?: Role[]) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard?erro=permissao");
  return user;
}
