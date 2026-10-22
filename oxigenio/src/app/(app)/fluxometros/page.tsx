import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, toInputDate } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { createFlowmeter, updateFlowmeterInfo } from "./actions";

export const dynamic = "force-dynamic";
const L: Record<string, string> = { HOSPITAL: "Hospital", DOMICILIO: "Domicílio", MANUTENCAO: "Manutenção", INDISPONIVEL: "Indisponível" };

export default async function Fluxometros({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const user = await requireUser(); const { erro, ok } = await searchParams;
  const [items, sums] = await Promise.all([
    db.flowmeter.findMany({ orderBy: [{ state: "asc" }, { code: "asc" }] }),
    db.flowmeter.groupBy({ by: ["state"], _sum: { quantity: true } }),
  ]);
  const s = (k: string) => sums.find(x => x.state === k)?._sum.quantity ?? 0;
  const total = sums.reduce((a, x) => a + (x._sum.quantity ?? 0), 0);
  const writer = user.role !== "CONSULTA";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Controle de Fluxômetros</h1>
      {erro && <p role="alert" className="bg-red-50 text-red-700 rounded p-2 text-sm">{erro}</p>}
      {ok && <p className="bg-verde-50 text-verde-700 rounded p-2 text-sm">Salvo com sucesso.</p>}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.keys(L).map(k => <div key={k} className="bg-white border rounded-xl p-3"><p className="text-xs text-neutral-500">{L[k]}</p><p className="text-2xl font-semibold text-verde-700">{s(k)}</p></div>)}
        <div className="bg-white border rounded-xl p-3"><p className="text-xs text-neutral-500">Total geral</p><p className="text-2xl font-semibold">{total}</p></div>
      </section>
      <p className="text-xs text-neutral-500">Cada fluxômetro (ou lote) está em um único estado, então o total nunca conta o mesmo equipamento duas vezes.</p>
      {writer && (
        <form action={createFlowmeter} className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-3 items-end">
          <label className="text-sm">Nº de patrimônio<input name="code" placeholder="vazio = lote" className={inputCls} /></label>
          <label className="text-sm">Quantidade (lote)<input name="quantity" type="number" min={1} defaultValue={1} className={inputCls} /></label>
          <label className="text-sm">Situação *<select name="state" className={inputCls}>{Object.entries(L).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Última conferência<input name="lastCheck" type="date" className={inputCls} /></label>
          <button className={btnCls}>Cadastrar</button>
          <label className="text-sm md:col-span-5">Observações<input name="notes" className={inputCls} /></label>
        </form>)}
      <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-verde-50 text-left"><tr>{["Patrimônio", "Qtd.", "Situação", "Conferência e observações"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{items.map(f => (
          <tr key={f.id} className="border-t align-top">
            <td className="p-2">{f.code ?? "Lote"}</td><td className="p-2">{f.quantity}</td><td className="p-2">{L[f.state]}</td>
            <td className="p-2">{writer ? (
              <form action={updateFlowmeterInfo} className="flex flex-wrap gap-2 items-center">
                <input type="hidden" name="id" value={f.id} />
                <input name="lastCheck" type="date" defaultValue={toInputDate(f.lastCheck)} className="border rounded p-1" />
                <input name="notes" defaultValue={f.notes ?? ""} className="border rounded p-1 flex-1 min-w-40" />
                <button className={btn2Cls}>Salvar</button></form>
            ) : <>{fmtDate(f.lastCheck)} · {f.notes}</>}</td>
          </tr>))}
          {!items.length && <tr><td colSpan={4} className="p-4 text-neutral-500">Nenhum fluxômetro cadastrado.</td></tr>}</tbody></table></div>
    </div>
  );
}
