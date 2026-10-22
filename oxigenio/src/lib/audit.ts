import "server-only";
import { db } from "./db";
import type { Prisma } from "@prisma/client";
export async function audit(p: { userId?: string; action: string; entity: string; entityId?: string;
  before?: unknown; after?: unknown; reason?: string }) {
  await db.auditLog.create({ data: { userId: p.userId, action: p.action, entity: p.entity, entityId: p.entityId,
    before: (p.before ?? undefined) as Prisma.InputJsonValue | undefined,
    after: (p.after ?? undefined) as Prisma.InputJsonValue | undefined, reason: p.reason } });
}
