import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Flash } from "../_components/MoveForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/Icon";
import { inputCls } from "@/lib/ui";
import { MACHINE_KINDS, MACHINE_KIND_SHORT, LOC_LABEL } from "@/lib/labels";
import { createMachine } from "./actions";

export const dynamic = "force-dynamic";

export default async function Maquinas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const machines = await db.machine.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { location: true, items: true } });
  return (
    <>
      <div><h1>Máquinas de Intubação</h1><p className="mt-1 text-sm text-slate-500">Cadastro das máquinas e dos cilindros e fluxômetros que cada uma utiliza. Os itens saem do estoque do hospital e voltam por devolução, sem contar duas vezes.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      {w && (
        <form action={createMachine} className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="border-b pb-3 sm:col-span-2 lg:col-span-4">Cadastrar máquina</h2>
          <label className="text-sm">Nome *<input name="name" required maxLength={80} className={inputCls} /></label>
          <label className="text-sm">Identificação / patrimônio<input name="code" maxLength={40} className={inputCls} /></label>
          <label className="text-sm">Local *<select name="location" className={inputCls}><option value="HOSPITAL">{LOC_LABEL.HOSPITAL}</option><option value="ENFERMARIAS">{LOC_LABEL.ENFERMARIAS}</option></select></label>
          <SubmitButton icon="check" className="btn btn-primary w-full">Cadastrar</SubmitButton>
          <label className="text-sm sm:col-span-2 lg:col-span-4">Observações<input name="notes" maxLength={500} className={inputCls} /></label>
        </form>)}
      <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {machines.map(m => {
          const chips = MACHINE_KINDS.map(k => [k, m.items.find(i => i.kind === k)?.quantity ?? 0] as const).filter(([, q]) => q > 0);
          return (
            <Link key={m.id} href={`/maquinas/${m.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-verde-50 text-verde-700"><Icon name="activity" /></span>
                  <div><p className="font-display font-bold leading-tight">{m.name}</p><p className="text-xs text-slate-500">{m.code ? `Ident.: ${m.code}` : "Sem identificação"}</p></div></div>
                <span className={"badge " + (m.active ? "badge-ok" : "badge-muted")}>{m.active ? "Ativa" : "Inativa"}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">Local: <b className="text-slate-700">{LOC_LABEL[m.location.code]}</b></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map(([k, q]) => <span key={k} className="badge badge-muted">{MACHINE_KIND_SHORT[k]}: {q}</span>)}
                {!chips.length && <span className="text-xs text-slate-400">Sem itens associados</span>}
              </div>
            </Link>);
        })}
        {!machines.length && <p className="card empty-state md:col-span-2 xl:col-span-3">Nenhuma máquina cadastrada.</p>}
      </div>
    </>
  );
}
