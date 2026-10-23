import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { paramsSchema } from "@/lib/reports/params";
import { buildReport, ReportError } from "@/lib/reports/data";
import { renderPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const msg = (m: string, status: number) => new NextResponse(m, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const user = await getSession(); // autenticação e perfil verificados no servidor
  if (!user) return msg("Sessão expirada. Faça login novamente.", 401);
  const parsed = paramsSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return msg(parsed.error.issues[0].message, 400);
  try {
    const report = await buildReport(parsed.data, { role: user.role, name: user.name });
    const pdf = await renderPdf(report, { name: user.name });
    await audit({ userId: user.id, action: "RELATORIO_EMITIDO", entity: "Relatorio", after: { type: parsed.data.type, from: parsed.data.from, to: parsed.data.to } });
    const disp = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `${disp}; filename="${report.filename}.pdf"`, "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ReportError) return msg(e.message, e.status);
    console.error("Falha ao gerar PDF:", e instanceof Error ? e.message : "erro desconhecido");
    return msg("Não foi possível gerar o PDF. Tente novamente ou avise o administrador.", 500);
  }
}
