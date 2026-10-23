import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { paramsSchema, toQuery, REPORT_TYPES } from "@/lib/reports/params";
import { PdfViewer } from "./PdfViewer";

export const dynamic = "force-dynamic";

export default async function Visualizar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const p = paramsSchema.safeParse(await searchParams);
  if (!p.success) redirect(`/relatorios?erro=${encodeURIComponent(p.error.issues[0].message)}`);
  const meta = REPORT_TYPES.find(t => t.id === p.data.type)!;
  if (meta.personal && user.role === "CONSULTA") redirect(`/relatorios?erro=${encodeURIComponent("Seu perfil não tem acesso a este relatório.")}`);
  const q = toQuery(p.data);
  return (
    <>
      <div><h1>{meta.label}</h1><p className="mt-1 text-sm text-slate-500">Visualização do PDF (A4, pronto para impressão e assinatura).</p></div>
      <PdfViewer src={`/relatorios/pdf?${q}`} downloadHref={`/relatorios/pdf?${q}&download=1`} />
    </>
  );
}
