import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireUser();
  const [bal, fm, pacientes] = await Promise.all([
    db.stockBalance.findMany({ include: { location: true, cylinderType: true } }),
    db.flowmeter.groupBy({ by: ["state"], _sum: { quantity: true } }),
    db.patient.count({ where: { status: "ATIVO" } }),
  ]);
  const q = (loc: string, size: string) =>
    bal.find(b => b.location.code === loc && b.cylinderType.size === size)?.quantity ?? 0;
  const f = (s: string) => fm.find(x => x.state === s)?._sum.quantity ?? 0;
  const sizes = ["P", "M", "G"];
  const total = bal.reduce((a, b) => a + b.quantity, 0);
  const Card = ({ t, v }: { t: string; v: number }) => (
    <div className="bg-white rounded-xl border p-4"><p className="text-xs text-neutral-500">{t}</p>
      <p className="text-3xl font-semibold text-verde-700">{v}</p></div>);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Painel</h1>
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sizes.map(s => <Card key={"h"+s} t={`Cilindros ${s} no hospital`} v={q("HOSPITAL", s)} />)}
        {sizes.map(s => <Card key={"d"+s} t={`Cilindros ${s} em domicílio`} v={q("DOMICILIO", s)} />)}
        <Card t="Total geral de cilindros" v={total} />
        <Card t="Fluxômetros no hospital" v={f("HOSPITAL")} />
        <Card t="Fluxômetros em domicílio" v={f("DOMICILIO")} />
        <Card t="Total de fluxômetros" v={fm.reduce((a, x) => a + (x._sum.quantity ?? 0), 0)} />
        <Card t="Pacientes ativos (domiciliar)" v={pacientes} />
      </section>
      <p className="text-sm text-neutral-500">Valores calculados a partir dos registros do banco. Sem registros, aparecem zerados.</p>
    </div>
  );
}
