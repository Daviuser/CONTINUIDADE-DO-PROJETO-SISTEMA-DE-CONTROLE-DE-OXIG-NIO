import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { flowmeterSummary } from "@/lib/stock";
import { fmtDate, fmtDateTime, parseDate, okDate, todayStr } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { FM_OP_LABEL, FM_LOC_LABEL } from "@/lib/labels";
import { Flash } from "../_components/MoveForm";
import { registerFlowmeter, reverseFlowmeterMovement } from "./actions";

export const dynamic = "force-dynamic";

export default async function Fluxometros({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const [s, rows] = await Promise.all([flowmeterSummary(), db.flowmeterMovement.findMany({
    where: (okDate(sp.from) || okDate(sp.to)) ? { occurredAt: { ...(okDate(sp.from) && { gte: parseDate(sp.from!) }), ...(okDate(sp.to) && { lte: parseDate(sp.to!) }) } } : {},
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100 })]);
  const Card = ({ t, v }: { t: string; v: number }) => <div className="bg-white border rounded-xl p-3"><p className="text-xs text-neutral-500">{t}</p><p className="text-3xl font-semibold text-verde-700">{v}</p></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Controle de Fluxômetros</h1>
      <Flash erro={sp.erro} ok={sp.ok} />
      <section className="grid grid-cols-3 gap-3"><Card t="Total cadastrado" v={s.total} /><Card t="No hospital (disponíveis)" v={s.hospital} /><Card t="Em domicílio" v={s.domicilio} /></section>
      {w && (
        <form action={registerFlowmeter} className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end">
          <h2 className="font-semibold md:col-span-4">Registrar movimentação</h2>
          <input type="hidden" name="requestKey" value={randomUUID()} />
          <label className="text-sm md:col-span-2">Operação *<select name="kind" className={inputCls}>
            <option value="ADD_HOSPITAL">Cadastrar/adicionar no hospital</option><option value="ADD_DOMICILIO">Cadastrar/adicionar em domicílio</option>
            <option value="HOSP_DOM">Hospital → Domicílio (saída)</option><option value="DOM_HOSP">Domicílio → Hospital (devolução)</option>
            <option value="BAIXA_HOSPITAL">Baixa do hospital (motivo obrigatório)</option><option value="BAIXA_DOMICILIO">Baixa do domicílio (motivo obrigatório)</option></select></label>
          <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={todayStr()} max={todayStr()} className={inputCls} /></label>
          <label className="text-sm">Quantidade *<input name="quantity" type="number" min={1} required className={inputCls} /></label>
          <label className="text-sm">Responsável *<input name="responsibleName" required defaultValue={user.name} className={inputCls} /></label>
          <label className="text-sm md:col-span-2">Observações / motivo<input name="notes" className={inputCls} /></label>
          <button className={btnCls}>Registrar</button>
        </form>)}
      <section className="space-y-3"><h2 className="font-semibold">Histórico</h2>
        <form className="bg-white border rounded-xl p-3 flex gap-2 items-end text-sm"><label>De<input type="date" name="from" defaultValue={sp.from} className={inputCls} /></label><label>Até<input type="date" name="to" defaultValue={sp.to} className={inputCls} /></label><button className={btnCls}>Filtrar</button></form>
        <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-verde-50 text-left"><tr>{["Data", "Operação", "Qtd.", "De → Para", "Responsável", "Observações", "Situação"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{rows.map(m => (
            <tr key={m.id} className={"border-t align-top " + (m.status === "ESTORNADA" ? "text-neutral-400 line-through" : "")}>
              <td className="p-2 whitespace-nowrap">{fmtDate(m.occurredAt)}</td><td className="p-2">{FM_OP_LABEL[m.operation]}{m.reversalOfId && " (ESTORNO)"}</td><td className="p-2">{m.quantity}</td>
              <td className="p-2">{m.fromLocation ? FM_LOC_LABEL[m.fromLocation] : "—"} → {m.toLocation ? FM_LOC_LABEL[m.toLocation] : "—"}</td>
              <td className="p-2">{m.responsibleName}<div className="text-xs text-neutral-400 no-underline">{fmtDateTime(m.createdAt)}</div></td>
              <td className="p-2">{m.reversalReason ? `Estorno: ${m.reversalReason}` : m.notes}</td>
              <td className="p-2 no-underline">{m.reversalOfId ? "Estorno" : m.status === "ESTORNADA" ? "Estornada" : w ? (
                <details><summary className="cursor-pointer text-laranja-600">Estornar</summary>
                  <form action={reverseFlowmeterMovement} className="mt-1 space-y-1"><input type="hidden" name="id" value={m.id} />
                    <input name="reason" required minLength={5} placeholder="Justificativa *" className="border rounded p-1 w-44" /><button className={btn2Cls}>Confirmar estorno</button></form></details>) : "Confirmada"}</td></tr>))}
            {!rows.length && <tr><td colSpan={7} className="p-4 text-neutral-500">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
