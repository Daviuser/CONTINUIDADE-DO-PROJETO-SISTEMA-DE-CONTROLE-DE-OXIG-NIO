import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/perm";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { updateCylinderType, addLocation, toggleLocation } from "./actions";

export const dynamic = "force-dynamic";

export default async function Config({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireAdmin(); const { erro, ok } = await searchParams;
  const [types, locs] = await Promise.all([db.cylinderType.findMany({ orderBy: { size: "asc" } }), db.location.findMany({ orderBy: { name: "asc" } })]);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1>Configurações</h1>
      {erro && <p role="alert" className="alert alert-error">{erro}</p>}
      {ok && <p className="alert alert-ok">Salvo com sucesso.</p>}
      <section className="space-y-2"><h2 className="font-semibold">Tipos de cilindro</h2>
        <p className="text-xs text-neutral-500">Capacidade em litros é opcional; preencha apenas se o hospital tiver o dado confirmado.</p>
        {types.map(t => (
          <form key={t.id} action={updateCylinderType} className="card p-3 flex flex-wrap gap-3 items-end">
            <input type="hidden" name="id" value={t.id} />
            <span className="font-bold w-8">{t.size}</span>
            <label className="text-sm">Nome<input name="label" defaultValue={t.label} className={inputCls} /></label>
            <label className="text-sm">Capacidade (L)<input name="capacityLiters" defaultValue={t.capacityLiters?.toString() ?? ""} className={inputCls} /></label>
            <button className={btn2Cls}>Salvar</button></form>))}</section>
      <section className="space-y-2"><h2 className="font-semibold">Localizações</h2>
        <ul className="card divide-y text-sm">{locs.map(l => (
          <li key={l.id} className="p-2 flex justify-between items-center"><span>{l.name} {!l.active && <i className="text-neutral-500">(inativa)</i>}</span>
            <form action={toggleLocation}><input type="hidden" name="id" value={l.id} /><button className={btn2Cls}>{l.active ? "Desativar" : "Ativar"}</button></form></li>))}</ul>
        <form action={addLocation} className="flex gap-2 items-end"><label className="text-sm flex-1">Nova localização<input name="name" required className={inputCls} /></label><button className={btnCls}>Adicionar</button></form></section>
    </div>
  );
}
