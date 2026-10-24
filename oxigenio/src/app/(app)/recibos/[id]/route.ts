import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { openReceipt } from "@/lib/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A foto fica em armazenamento privado: só é entregue por esta rota, a usuários autenticados.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const text = (m: string, status: number) => new NextResponse(m, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  const user = await getSession();
  if (!user) return text("Sessão expirada. Faça login novamente.", 401);
  const { id } = await ctx.params;
  const r = await db.receiptPhoto.findUnique({ where: { id } });
  if (!r) return text("Recibo não encontrado.", 404);
  try {
    const stream = await openReceipt(r.pathname);
    if (!stream) return text("Arquivo do recibo indisponível.", 404);
    return new NextResponse(stream, { headers: { "Content-Type": r.contentType, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    console.error("Falha ao ler recibo:", e instanceof Error ? e.message : "erro");
    return text("Não foi possível carregar o recibo.", 502);
  }
}
