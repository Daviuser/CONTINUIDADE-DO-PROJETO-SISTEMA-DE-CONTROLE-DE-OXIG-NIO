import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Flash } from "../../_components/MoveForm";
import { MachineMoveForm } from "../../_components/MachineMoveForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/Icon";
import { Stat } from "@/components/ui/Stat";
import { inputCls } from "@/lib/ui";
import { fmtDate, fmtDateTime, todayStr } from "@/lib/format";
import { MACHINE_KINDS, MACHINE_KIND_LABEL, MACHINE_OP_LABEL, LOC_LABEL } from "@/lib/labels";
import { updateMachine, registerMachineMovement } from "../actions";

export const dynamic = "force-dynamic";

export default async function Maquina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const { id } = await params; const sp = await searchParams; const w = user.role !== "CONSULTA";
  const m = await db.machine.findUnique({ where: { id }, include: { location: true, items: true } });
  if (!m) notFound();
  const [moves, others] = await Promise.all([
    db.machineMovement.findMany({ where: { OR: [{ machineId: id }, { toMachineId: id }] }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100,
      include: { machine: { select: { name: true } }, toMachine: { select: { name: true } } } }),
    w ? db.machine.findMany({ where: { active: true, NOT: { id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const qty = (k: string) => m.items.find(i => i.kind === k)?.quantity ?? 0;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1>{m.name}</h1><p className="mt-1 text-sm text-slate-500">{m.code ? `Identificação: ${m.code} · ` : ""}Local: {LOC_LABEL[m.location.code]} · <span className={"badge " + (m.active ? "badge-ok" : "badge-muted")}>{m.active ? "Ativa" : "Inativa"}</span></p></div>
        <Link href="/maquinas" className="btn btn-secondary"><Icon name="arrowLeft" className="h-4 w-4" />Voltar</Link>
      </div>
      {m.notes && <p className="text-sm text-slate-600">{m.notes}</p>}
      <Flash erro={sp.erro} ok={sp.ok} />
      <section className="space-y-3" aria-labelledby="h-itens">
        <h2 id="h-itens" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Itens nesta máquina</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
          {MACHINE_KINDS.map(k => <Stat key={k} label={MACHINE_KIND_LABEL[k]} value={qty(k)} icon={k.startsWith("CILINDRO") ? "cylinder" : "gauge"} tone={qty(k) ? "brand" : "neutral"} />)}
        </div>
      </section>
      {w && <MachineMoveForm machineId={id} others={others} action={registerMachineMovement} requestKey={randomUUID()} userName={user.name} today={todayStr()} />}
      {w && (
        <details className="card p-4">
          <summary className="!font-semibold !text-grafite-900">Editar cadastro da máquina</summary>
          <form action={updateMachine} className="mt-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="id" value={m.id} />
            <label className="text-sm">Nome *<input name="name" required defaultValue={m.name} className={inputCls} /></label>
            <label className="text-sm">Identificação / patrimônio<input name="code" defaultValue={m.code ?? ""} className={inputCls} /></label>
            <label className="text-sm">Local *<select name="location" defaultValue={m.location.code === "ENFERMARIAS" ? "ENFERMARIAS" : "HOSPITAL"} className={inputCls}><option value="HOSPITAL">{LOC_LABEL.HOSPITAL}</option><option value="ENFERMARIAS">{LOC_LABEL.ENFERMARIAS}</option></select></label>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={m.active} /> Máquina ativa</label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">Observações<input name="notes" defaultValue={m.notes ?? ""} className={inputCls} /></label>
            <SubmitButton icon="check" className="btn btn-primary w-full">Salvar</SubmitButton>
          </form>
        </details>)}
      <section className="space-y-3"><h2>Histórico de movimentações</h2>
        <div className="card"><table>
          <thead><tr>{["Data", "Operação", "Item", "Qtd.", "Responsável", "Detalhes"].map((h, i) => <th key={h} className={i === 3 ? "num" : ""}>{h}</th>)}</tr></thead>
          <tbody>{moves.map(mv => {
            const incoming = mv.toMachineId === id && mv.machineId !== id; // recebido de outra máquina
            const d = incoming ? mv.quantity : mv.delta;
            return (
              <tr key={mv.id}>
                <td className="whitespace-nowrap">{fmtDate(mv.occurredAt)}</td>
                <td>{incoming ? "Recebido de outra máquina" : MACHINE_OP_LABEL[mv.operation]}</td>
                <td>{MACHINE_KIND_LABEL[mv.kind]}</td>
                <td className={"num font-semibold " + (d >= 0 ? "text-verde-700" : "text-laranja-600")}>{d > 0 ? "+" : ""}{d}</td>
                <td>{mv.responsibleName}<div className="text-xs text-slate-400">{fmtDateTime(mv.createdAt)}</div></td>
                <td className="text-slate-600">{incoming ? `De: ${mv.machine.name}` : mv.detail}{mv.notes ? <div className="text-xs text-slate-500">{mv.notes}</div> : null}</td>
              </tr>);
          })}
            {!moves.length && <tr><td colSpan={6} className="empty-state">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div>
      </section>
    </>
  );
}
