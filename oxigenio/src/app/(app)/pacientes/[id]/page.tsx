import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { inputCls, btnCls, dangerCls } from "@/lib/ui";
import { PatientForm } from "../PatientForm";
import { setPatientStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function Paciente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const user = await requireUser();
  const { id } = await params; const { erro, ok } = await searchParams;
  const p = await db.patient.findUnique({ where: { id }, include: { exchanges: { orderBy: { exchangeDate: "desc" }, take: 50 } } });
  if (!p) notFound();
  const history = await db.auditLog.findMany({ where: { entity: "Patient", entityId: id }, orderBy: { at: "desc" }, take: 50 });
  const writer = user.role !== "CONSULTA";
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-2xl font-semibold">{p.fullName}</h1>
        <p className="text-sm text-neutral-500">{p.status === "ATIVO" ? "Ativo" : `Inativo desde ${fmtDate(p.endDate)}`} · início em {fmtDate(p.startDate)}</p></div>
      {erro && <p role="alert" className="bg-red-50 text-red-700 rounded p-2 text-sm">{erro}</p>}
      {ok && <p className="bg-verde-50 text-verde-700 rounded p-2 text-sm">Salvo com sucesso.</p>}
      <PatientForm p={p} readOnly={!writer} />
      {writer && (
        <form action={setPatientStatus} className="bg-white border rounded-xl p-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={p.id} />
          {p.status === "ATIVO" ? (<>
            <input type="hidden" name="status" value="INATIVO" />
            <label className="text-sm flex-1 min-w-48">Motivo do encerramento *<input name="reason" required className={inputCls} /></label>
            <button className={dangerCls}>Encerrar acompanhamento</button></>) : (<>
            <input type="hidden" name="status" value="ATIVO" />
            <button className={btnCls}>Reativar acompanhamento</button></>)}
          <p className="text-xs text-neutral-500 w-full">O histórico do paciente é sempre preservado.</p>
        </form>)}
      <section><h2 className="font-semibold mb-2">Histórico de trocas</h2>
        <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-verde-50 text-left"><tr>{["Data", "Tipo", "Entregues", "Recolhidos", "Fluxo", "Responsável"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{p.exchanges.map(e => <tr key={e.id} className="border-t"><td className="p-2">{fmtDate(e.exchangeDate)}</td><td className="p-2">{e.cylinderSize}</td><td className="p-2">{e.delivered}</td><td className="p-2">{e.collected}</td><td className="p-2">{e.flow ?? "—"}</td><td className="p-2">{e.responsibleName}</td></tr>)}
            {!p.exchanges.length && <tr><td colSpan={6} className="p-3 text-neutral-500">Nenhuma troca registrada.</td></tr>}</tbody></table></div></section>
      <section><h2 className="font-semibold mb-2">Histórico de alterações</h2>
        <ul className="bg-white border rounded-xl divide-y text-sm">{history.map(h => (
          <li key={h.id} className="p-2">{fmtDateTime(h.at)} — {h.action.replaceAll("_", " ").toLowerCase()}{h.reason && <> · motivo: {h.reason}</>}</li>))}
          {!history.length && <li className="p-3 text-neutral-500">Sem alterações registradas.</li>}</ul></section>
    </div>
  );
}
