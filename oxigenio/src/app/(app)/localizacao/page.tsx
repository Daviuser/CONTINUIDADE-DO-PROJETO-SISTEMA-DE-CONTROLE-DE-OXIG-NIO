import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { locationOverview } from "@/lib/stock";
import { Icon } from "@/components/Icon";
import { LEGACY_CODES } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Localizacao() {
  await requireUser();
  const rows = await locationOverview();
  return (
    <>
      <div><h1>Localização de Equipamentos</h1><p className="mt-1 text-sm text-slate-500">Escolha um dos locais do hospital para ver os cilindros, fluxômetros e máquinas de intubação que estão lá e registrar movimentações.</p></div>
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(r => (
          <Link key={r.code} href={`/localizacao/${r.code}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-verde-50 text-verde-700"><Icon name="building" /></span><p className="font-display font-bold leading-tight">{r.name}</p></div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="badge badge-ok">Cilindros: {r.cil}</span>
              <span className="badge badge-muted">Fluxôm.: {r.flowComum + r.flowIntub}</span>
              <span className="badge badge-muted">Máquinas: {r.machines}</span>
            </div>
            {LEGACY_CODES.includes(r.code) && <p className="mt-2 text-xs font-medium text-laranja-600">Saldo anterior: transfira para Emergência ou Estabilização.</p>}
            {r.cil > 0 && <p className="mt-2 text-xs text-slate-500">Cheios {r.cheios} · Vazios {r.vazios}{r.indisp ? ` · Indisp. ${r.indisp}` : ""}</p>}
          </Link>))}
      </div>
      <p className="text-xs text-slate-500">Cilindros e fluxômetros que estão dentro de máquinas de intubação aparecem na tela da máquina, para nunca serem contados duas vezes.</p>
    </>
  );
}
