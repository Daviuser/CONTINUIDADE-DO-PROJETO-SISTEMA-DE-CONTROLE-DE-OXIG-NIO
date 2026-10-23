import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { cylinderSummary, flowmeterSummary } from "@/lib/stock";
import { CylinderSummary } from "../_components/Summary";
import { Stat } from "@/components/ui/Stat";
import { WelcomeBanner } from "@/components/ui/WelcomeBanner";
import { fmtDate } from "@/lib/format";
import { OP_LABEL, FM_OP_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
const ROLE: Record<string, string> = { ADMIN: "Administrador", OPERADOR: "Operador", CONSULTA: "Consulta" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const user = await requireUser();
  const { bemvindo } = await searchParams;
  const [{ totals: c }, f, pacientes, mv, fm] = await Promise.all([
    cylinderSummary(), flowmeterSummary(), db.patient.count({ where: { status: "ATIVO" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { cylinderType: true, patient: { select: { fullName: true } } } }),
    db.flowmeterMovement.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const recent = [
    ...mv.map(m => ({ at: m.createdAt, d: m.occurredAt, rev: !!m.reversalOfId, t: `${OP_LABEL[m.operation]} — ${m.quantity} × ${m.cylinderType.size}${m.supplier ? ` · ${m.supplier}` : ""}${m.patient ? ` · ${m.patient.fullName}` : ""}` })),
    ...fm.map(m => ({ at: m.createdAt, d: m.occurredAt, rev: !!m.reversalOfId, t: `Fluxômetros: ${FM_OP_LABEL[m.operation]} — ${m.quantity}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);

  return (
    <>
      {bemvindo === "1" && <WelcomeBanner name={user.name} role={ROLE[user.role] ?? user.role} />}
      <div><h1>Painel</h1><p className="mt-1 text-sm text-slate-500">Situação atual do estoque de oxigênio, calculada a partir dos registros do sistema.</p></div>
      <section className="space-y-3" aria-labelledby="h-cil">
        <h2 id="h-cil" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cilindros (todas as categorias)</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total de cilindros" value={c.total} icon="box" />
          <Stat label="Disponíveis (cheios)" value={c.hCheio} icon="cylinder" />
          <Stat label="Vazios" value={c.hVazio} icon="cylinder" tone="neutral" />
          <Stat label="Em domicílio" value={c.dom} icon="home" />
          <Stat label="Nas enfermarias" value={c.enf} icon="building" />
          <Stat label="Com o fornecedor" value={c.forn} icon="truck" tone="warn" hint="Trocas pendentes" />
          <Stat label="Indisponíveis" value={c.hIndisp} icon="alert" tone="neutral" />
        </div>
      </section>
      <section className="space-y-3" aria-labelledby="h-fm">
        <h2 id="h-fm" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fluxômetros e pacientes</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total de fluxômetros" value={f.total} icon="gauge" tone="neutral" />
          <Stat label="Disponíveis no hospital" value={f.hospital} icon="gauge" />
          <Stat label="Em domicílio" value={f.domicilio} icon="home" />
          <Stat label="Nas enfermarias" value={f.enfermarias} icon="building" />
          <Stat label="Pacientes ativos" value={pacientes} icon="users" />
        </div>
      </section>
      <section className="space-y-3"><h2>Cilindros por categoria</h2><CylinderSummary /></section>
      <section className="space-y-3"><h2>Movimentações recentes</h2>
        <ul className="card divide-y text-sm">
          {recent.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span className={"h-2 w-2 shrink-0 rounded-full " + (r.rev ? "bg-laranja-500" : "bg-verde-500")} aria-hidden="true" />
              <span className="min-w-0 flex-1">{r.t}{r.rev && <span className="ml-2 text-xs text-laranja-600">estorno</span>}</span>
              <time className="shrink-0 text-xs tabular-nums text-slate-400">{fmtDate(r.d)}</time>
            </li>))}
          {!recent.length && <li className="empty-state">Nenhuma movimentação registrada.</li>}
        </ul></section>
    </>
  );
}
