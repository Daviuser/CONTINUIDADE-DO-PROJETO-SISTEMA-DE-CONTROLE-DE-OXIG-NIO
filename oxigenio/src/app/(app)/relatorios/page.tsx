import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/Icon";
export default async function Relatorios() {
  await requireUser();
  return (<>
    <h1>Relatórios</h1>
    <div className="card p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-verde-50 text-verde-700"><Icon name="chart" className="h-6 w-6" /></span>
      <p className="mt-4 font-display font-semibold">Relatórios e PDFs</p>
      <p className="mt-1 text-sm text-slate-500">Este módulo será disponibilizado em uma próxima etapa.</p>
    </div></>);
}
