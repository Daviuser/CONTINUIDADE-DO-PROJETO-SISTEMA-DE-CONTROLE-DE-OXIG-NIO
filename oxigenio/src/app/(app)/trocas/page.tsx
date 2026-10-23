import { requireUser } from "@/lib/auth";
import { inputCls } from "@/lib/ui";
import { MoveForm, Flash } from "../_components/MoveForm";
import { History } from "../_components/History";
import { registerSupplierSend, registerSupplierReturn } from "../estoque-actions";
import { cylinderSummary, pendingBySupplier } from "@/lib/stock";
import { SIZE_LABEL } from "@/lib/labels";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Trocas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const [{ rows, totals }, pend, suppliers] = await Promise.all([
    cylinderSummary(), pendingBySupplier(),
    db.stockMovement.findMany({ where: { operation: { in: ["ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR", "ABASTECIMENTO"] }, supplier: { not: null } }, distinct: ["supplier"], select: { supplier: true }, take: 50 }),
  ]);
  const open = pend.filter(p => p.pending !== 0);
  const sup = <><datalist id="sup">{suppliers.map(s => <option key={s.supplier} value={s.supplier!} />)}</datalist>
    <label className="text-sm">Fornecedor *<input name="supplier" list="sup" required className={inputCls} /></label></>;
  return (
    <div className="space-y-5">
      <h1>Trocas com Fornecedores</h1>
      <Flash erro={sp.erro} ok={sp.ok} />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map(r => <div key={r.size} className="card p-3"><p className="text-xs text-neutral-500">Vazios pendentes — {SIZE_LABEL[r.size]}</p><p className="text-2xl font-semibold text-laranja-600">{r.forn}</p></div>)}
        <div className="card p-3"><p className="text-xs text-neutral-500">Total pendente</p><p className="text-2xl font-semibold">{totals.forn}</p></div>
      </section>
      <section><h2 className="font-semibold mb-2">Pendências por fornecedor</h2>
        <div className="card overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{["Fornecedor", "Categoria", "Vazios enviados", "Cheios recebidos", "Pendente"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{open.map(p => <tr key={p.supplier + p.size} className="border-t"><td>{p.supplier}</td><td>{p.size}</td><td>{p.sent}</td><td>{p.returned}</td><td className="font-semibold">{p.pending}</td></tr>)}
            {!open.length && <tr><td colSpan={5} className="empty-state">Nenhuma pendência registrada.</td></tr>}</tbody></table></div></section>
      {w && (<>
        <MoveForm title="1. Enviar cilindros vazios ao fornecedor" action={registerSupplierSend} back="/trocas" userName={user.name} submit="Registrar envio">{sup}</MoveForm>
        <MoveForm title="2. Receber cilindros cheios do fornecedor (retorno da troca)" action={registerSupplierReturn} back="/trocas" userName={user.name} submit="Registrar retorno">{sup}</MoveForm>
      </>)}
      <History title="Histórico de trocas" ops={["ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR"]} sp={sp} base="/trocas" canReverse={w} supplierFilter />
    </div>
  );
}
