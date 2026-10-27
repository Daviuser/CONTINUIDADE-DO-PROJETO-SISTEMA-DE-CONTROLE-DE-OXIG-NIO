import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { flowmeterSummary } from "@/lib/stock";
import { fmtDate, fmtDateTime, parseDate, okDate } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { FM_OP_LABEL, FM_LOC_LABEL } from "@/lib/labels";
import { Flash } from "../_components/MoveForm";
import { FlowmeterEditor } from "../_components/FlowmeterEditor";
import { LocationTable } from "../_components/LocationTable";
import { Stat } from "@/components/ui/Stat";
import { saveFlowmeterStock, reverseFlowmeterMovement } from "./actions";

export const dynamic = "force-dynamic";

export default async function Fluxometros({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const [s, rows] = await Promise.all([flowmeterSummary(), db.flowmeterMovement.findMany({
    where: (okDate(sp.from) || okDate(sp.to)) ? { occurredAt: { ...(okDate(sp.from) ? { gte: parseDate(sp.from!) } : {}), ...(okDate(sp.to) ? { lte: parseDate(sp.to!) } : {}) } } : {},
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100 })]);
  return (
    <>
      <div><h1>Controle de Fluxômetros</h1><p className="mt-1 text-sm text-slate-500">Quantidade total de fluxômetros e onde estão: hospital, domicílio e enfermarias.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      {w ? <FlowmeterEditor current={{ total: s.total, domicilio: s.domicilio, enfermarias: s.enfermarias, maquinas: s.maquinas + s.maquinasIntub, locais: s.locais }} action={saveFlowmeterStock} requestKey={randomUUID()} /> : (
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total" value={s.total} icon="gauge" tone="neutral" /><Stat label="Disponíveis no hospital" value={s.hospital} icon="gauge" />
          <Stat label="Em domicílio" value={s.domicilio} icon="home" /><Stat label="Nas enfermarias" value={s.enfermarias} icon="building" /></div>)}
      <LocationTable mode="flow" />
      <details className="card p-4">
        <summary className="!font-semibold !text-grafite-900">Histórico de alterações</summary>
        <div className="mt-4 space-y-3">
          <form className="card filters flex flex-wrap items-end gap-2 p-3 text-sm"><label>De<input type="date" name="from" defaultValue={sp.from} className={inputCls} /></label><label>Até<input type="date" name="to" defaultValue={sp.to} className={inputCls} /></label><button className={btnCls}>Filtrar</button></form>
          <div className="card"><table>
            <thead><tr>{["Data", "Operação", "Qtd.", "De → Para", "Responsável", "Observações", "Situação"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(m => (
              <tr key={m.id} className={m.status === "ESTORNADA" ? "text-neutral-400 line-through" : ""}>
                <td className="whitespace-nowrap">{fmtDate(m.occurredAt)}</td><td>{FM_OP_LABEL[m.operation]}{m.reversalOfId && " (ESTORNO)"}</td><td>{m.quantity}</td>
                <td>{m.fromLocation ? FM_LOC_LABEL[m.fromLocation] : "—"} → {m.toLocation ? FM_LOC_LABEL[m.toLocation] : "—"}</td>
                <td>{m.responsibleName}<div className="text-xs text-neutral-400 no-underline">{fmtDateTime(m.createdAt)}</div></td>
                <td>{m.reversalReason ? `Estorno: ${m.reversalReason}` : m.notes}</td>
                <td className="no-underline">{m.reversalOfId ? "Estorno" : m.status === "ESTORNADA" ? <span className="badge badge-warn">Estornada</span> : (w && m.operation !== "AJUSTE" && m.operation !== "MAQUINA" && m.operation !== "LOCAL") ? (
                  <details><summary>Estornar</summary>
                    <form action={reverseFlowmeterMovement}><input type="hidden" name="id" value={m.id} />
                      <input name="reason" required minLength={5} placeholder="Justificativa *" className="w-44" /><button className={btn2Cls}>Confirmar estorno</button></form></details>) : <span className="badge badge-ok">Confirmada</span>}</td></tr>))}
              {!rows.length && <tr><td colSpan={7} className="empty-state">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div>
        </div>
      </details>
    </>
  );
}
