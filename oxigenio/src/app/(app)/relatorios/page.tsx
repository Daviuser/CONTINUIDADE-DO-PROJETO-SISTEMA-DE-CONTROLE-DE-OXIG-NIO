import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { Flash } from "../_components/MoveForm";
import { inputCls } from "@/lib/ui";
import { todayStr, fmtDateTime } from "@/lib/format";
import { SIZES, SIZE_LABEL } from "@/lib/labels";
import { REPORT_TYPES, paramsSchema, toQuery } from "@/lib/reports/params";

export const dynamic = "force-dynamic";

export default async function Relatorios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams;
  const w = user.role !== "CONSULTA";
  const types = REPORT_TYPES.filter(t => w || !t.personal);
  const today = todayStr();
  const [patients, issued] = await Promise.all([
    w ? db.patient.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }) : Promise.resolve([]),
    w ? db.issuedReport.findMany({ orderBy: { issuedAt: "desc" }, take: 10 }) : Promise.resolve([]),
  ]);
  const users = await db.user.findMany({ where: { id: { in: issued.map(i => i.issuedById) } }, select: { id: true, name: true } });
  return (
    <>
      <div><h1>Relatórios</h1><p className="mt-1 text-sm text-slate-500">Gere documentos em PDF (A4) com espaço para assinatura física. Os dados refletem os registros existentes no momento da emissão.</p></div>
      <Flash erro={sp.erro} />
      <form action="/relatorios/visualizar" method="get" className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">1. Tipo de relatório</legend>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {types.map((t, i) => (
              <label key={t.id} className="relative cursor-pointer">
                <input type="radio" name="type" value={t.id} required defaultChecked={sp.type ? sp.type === t.id : i === 0} className="peer sr-only" />
                <div className="card flex h-full items-start gap-3 p-4 transition peer-checked:border-verde-600 peer-checked:ring-2 peer-checked:ring-verde-600/20 peer-focus-visible:ring-2 peer-focus-visible:ring-verde-600/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-verde-50 text-verde-700"><Icon name={t.icon} className="h-[1.15rem] w-[1.15rem]" /></span>
                  <div><p className="font-display text-sm font-semibold">{t.label}</p><p className="mt-0.5 text-xs text-slate-500">{t.desc}</p></div>
                </div>
              </label>))}
          </div>
        </fieldset>
        <fieldset className="card grid gap-4 p-5 md:grid-cols-4">
          <legend className="sr-only">Filtros</legend>
          <h2 className="border-b pb-3 md:col-span-4">2. Período e filtros <span className="text-xs font-normal text-slate-500">(aplicados quando fizerem sentido para o relatório; o inventário usa a posição atual)</span></h2>
          <label className="text-sm">Data inicial<input type="date" name="from" defaultValue={sp.from ?? today.slice(0, 8) + "01"} max={today} className={inputCls} /></label>
          <label className="text-sm">Data final<input type="date" name="to" defaultValue={sp.to ?? today} max={today} className={inputCls} /></label>
          <label className="text-sm">Categoria de cilindro<select name="size" defaultValue={sp.size ?? ""} className={inputCls}><option value="">Todas</option>{SIZES.map(s => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}</select></label>
          <label className="text-sm">Responsável<input name="responsible" defaultValue={sp.responsible} placeholder="Nome (contém)" className={inputCls} /></label>
          <label className="text-sm">Fornecedor<input name="supplier" defaultValue={sp.supplier} placeholder="Abastecimento e trocas" className={inputCls} /></label>
          {w && <>
            <label className="text-sm">Paciente<select name="patient" defaultValue={sp.patient ?? ""} className={inputCls}><option value="">Todos</option>{patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
            <label className="text-sm">Bairro<input name="bairro" defaultValue={sp.bairro} className={inputCls} /></label>
            <label className="text-sm">Povoado<input name="povoado" defaultValue={sp.povoado} className={inputCls} /></label></>}
          <div className="md:col-span-4"><button className="btn btn-primary"><Icon name="chart" className="h-4 w-4" />Gerar PDF</button></div>
        </fieldset>
      </form>
      {w && (
        <section className="space-y-3"><h2>Emissões recentes</h2>
          <ul className="card divide-y text-sm">
            {issued.map(i => {
              const pr = paramsSchema.safeParse(i.params);
              const meta = REPORT_TYPES.find(t => t.id === i.type);
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span><span className="font-medium">{meta?.label ?? i.type}</span> <span className="text-slate-500">· {fmtDateTime(i.issuedAt)} · {users.find(u => u.id === i.issuedById)?.name ?? "—"}</span></span>
                  {pr.success && <Link className="btn btn-secondary !py-1" href={`/relatorios/visualizar?${toQuery(pr.data)}`}>Emitir novamente</Link>}
                </li>);
            })}
            {!issued.length && <li className="empty-state">Nenhum relatório emitido ainda.</li>}
          </ul></section>)}
    </>
  );
}
