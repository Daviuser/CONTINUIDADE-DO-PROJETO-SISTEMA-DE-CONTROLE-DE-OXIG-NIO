import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, parseDate, okDate } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { OP_LABEL, LOC_LABEL, COND_LABEL } from "@/lib/labels";
import { reverseCylinderMovement } from "../estoque-actions";
import type { Prisma, StockOperation } from "@prisma/client";

const PAGE = 30;
type SP = Record<string, string | undefined>;

export async function History({ title, ops, sp, base, canReverse, patients, supplierFilter }: {
  title: string; ops: StockOperation[]; sp: SP; base: string; canReverse: boolean;
  patients?: { id: string; fullName: string }[]; supplierFilter?: boolean }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.StockMovementWhereInput = {
    operation: sp.op && ops.includes(sp.op as StockOperation) ? (sp.op as StockOperation) : { in: ops },
    ...((okDate(sp.from) || okDate(sp.to)) && { occurredAt: { ...(okDate(sp.from) && { gte: parseDate(sp.from!) }), ...(okDate(sp.to) && { lte: parseDate(sp.to!) }) } }),
    ...(supplierFilter && sp.supplier && { supplier: { contains: sp.supplier, mode: "insensitive" } }),
    ...(sp.patient && { patientId: sp.patient }),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE,
      include: { cylinderType: true, fromLocation: true, toLocation: true, patient: { select: { fullName: true } } } }),
    db.stockMovement.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (n: number) => `${base}?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && !["erro", "ok"].includes(k))) as Record<string, string>), page: String(n) })}`;
  const pt = (l?: { code: string } | null, c?: string | null) => (l ? `${LOC_LABEL[l.code]}${c ? ` (${COND_LABEL[c].toLowerCase()})` : ""}` : "—");
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      <form className="card p-3 flex flex-wrap gap-2 items-end text-sm">
        <label>De<input type="date" name="from" defaultValue={sp.from} className={inputCls} /></label>
        <label>Até<input type="date" name="to" defaultValue={sp.to} className={inputCls} /></label>
        {ops.length > 1 && <label>Operação<select name="op" defaultValue={sp.op ?? ""} className={inputCls}><option value="">Todas</option>{ops.map(o => <option key={o} value={o}>{OP_LABEL[o]}</option>)}</select></label>}
        {supplierFilter && <label>Fornecedor<input name="supplier" defaultValue={sp.supplier} className={inputCls} /></label>}
        {patients && <label>Paciente<select name="patient" defaultValue={sp.patient ?? ""} className={inputCls}><option value="">Todos</option>{patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>}
        <button className={btnCls}>Filtrar</button>
      </form>
      <div className="card overflow-x-auto"><table className="w-full text-sm">
        <thead><tr>{["Data", "Operação", "Categoria", "Qtd.", "De → Para", "Fornecedor / Paciente", "Responsável", "Situação"].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(m => (
          <tr key={m.id} className={"border-t align-top " + (m.status === "ESTORNADA" ? "text-neutral-400 line-through" : "")}>
            <td className="whitespace-nowrap">{fmtDate(m.occurredAt)}</td>
            <td>{OP_LABEL[m.operation]}{m.reversalOfId && " (ESTORNO)"}</td>
            <td>{m.cylinderType.size}</td><td>{m.quantity}</td>
            <td>{pt(m.fromLocation, m.fromCondition)} → {pt(m.toLocation, m.toCondition)}</td>
            <td>{m.patient?.fullName ?? m.supplier ?? "—"}</td>
            <td>{m.responsibleName}<div className="text-xs text-neutral-400 no-underline">{fmtDateTime(m.createdAt)}</div></td>
            <td className="no-underline">
              {m.reversalOfId ? <span className="text-xs">Motivo: {m.reversalReason}</span>
                : m.status === "ESTORNADA" ? "Estornada"
                : canReverse ? (
                  <details><summary className="cursor-pointer text-laranja-600">Estornar</summary>
                    <form action={reverseCylinderMovement} className="mt-1 space-y-1">
                      <input type="hidden" name="id" value={m.id} /><input type="hidden" name="back" value={base} />
                      <input name="reason" required minLength={5} placeholder="Justificativa *" className="w-44" />
                      <button className={btn2Cls}>Confirmar estorno</button></form></details>
                ) : "Confirmada"}
            </td></tr>))}
          {!rows.length && <tr><td colSpan={8} className="empty-state">Nenhuma movimentação encontrada.</td></tr>}</tbody></table></div>
      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className={btn2Cls} href={href(page - 1)}>Anterior</Link>}
        <span>Página {page} de {pages} · {total} registro(s)</span>
        {page < pages && <Link className={btn2Cls} href={href(page + 1)}>Próxima</Link>}</div>
    </section>
  );
}
