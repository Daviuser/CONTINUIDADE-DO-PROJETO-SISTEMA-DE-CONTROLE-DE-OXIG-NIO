import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { cylinderSummary, flowmeterSummary } from "@/lib/stock";
import { CylinderSummary } from "../_components/Summary";
import { fmtDate } from "@/lib/format";
import { OP_LABEL, FM_OP_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireUser();
  const [{ totals: c }, f, pacientes, mv, fm] = await Promise.all([
    cylinderSummary(), flowmeterSummary(), db.patient.count({ where: { status: "ATIVO" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { cylinderType: true, patient: { select: { fullName: true } } } }),
    db.flowmeterMovement.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const recent = [
    ...mv.map(m => ({ at: m.createdAt, d: m.occurredAt, t: `${OP_LABEL[m.operation]}${m.reversalOfId ? " (estorno)" : ""} — ${m.quantity} × ${m.cylinderType.size}${m.supplier ? ` · ${m.supplier}` : ""}${m.patient ? ` · ${m.patient.fullName}` : ""}` })),
    ...fm.map(m => ({ at: m.createdAt, d: m.occurredAt, t: `Fluxômetros: ${FM_OP_LABEL[m.operation]}${m.reversalOfId ? " (estorno)" : ""} — ${m.quantity}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  const Card = ({ t, v, warn }: { t: string; v: number; warn?: boolean }) => (
    <div className="bg-white rounded-xl border p-4"><p className="text-xs text-neutral-500">{t}</p><p className={"text-3xl font-semibold " + (warn ? "text-laranja-600" : "text-verde-700")}>{v}</p></div>);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Painel</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card t="Cilindros no hospital" v={c.hospital} /><Card t="Cilindros em domicílio" v={c.dom} />
        <Card t="Cilindros cheios (hospital)" v={c.hCheio} /><Card t="Cilindros vazios (hospital)" v={c.hVazio} />
        <Card t="Vazios pendentes com fornecedor" v={c.forn} warn /><Card t="Total geral de cilindros" v={c.total} />
        <Card t="Fluxômetros no hospital" v={f.hospital} /><Card t="Fluxômetros em domicílio" v={f.domicilio} />
        <Card t="Total de fluxômetros" v={f.total} /><Card t="Pacientes ativos (domiciliar)" v={pacientes} />
      </section>
      <section className="space-y-2"><h2 className="font-semibold">Cilindros por categoria</h2><CylinderSummary /></section>
      <section><h2 className="font-semibold mb-2">Movimentações recentes</h2>
        <ul className="bg-white border rounded-xl divide-y text-sm">{recent.map((r, i) => <li key={i} className="p-2">{fmtDate(r.d)} — {r.t}</li>)}
          {!recent.length && <li className="p-3 text-neutral-500">Nenhuma movimentação registrada.</li>}</ul></section>
      <p className="text-xs text-neutral-500">Valores calculados a partir dos saldos registrados no banco. Sem registros, aparecem zerados.</p>
    </div>
  );
}
