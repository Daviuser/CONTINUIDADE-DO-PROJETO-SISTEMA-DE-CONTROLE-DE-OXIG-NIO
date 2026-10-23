import { requireUser } from "@/lib/auth";
import { MoveForm, Flash } from "../_components/MoveForm";
import { History } from "../_components/History";
import { Stat } from "@/components/ui/Stat";
import { registerSupplierSend, registerSupplierReturn } from "../estoque-actions";
import { pendingBySize } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function Trocas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const pend = await pendingBySize();
  const total = pend.reduce((a, p) => a + p.pending, 0);
  return (
    <>
      <div><h1>Trocas com o Fornecedor</h1><p className="mt-1 text-sm text-slate-500">Envie os cilindros <b>vazios</b> e registre a volta dos <b>cheios</b>. O envio e o retorno podem acontecer em dias diferentes.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      <section className="space-y-3" aria-labelledby="h-pend">
        <h2 id="h-pend" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendentes (vazios enviados ainda não devolvidos)</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pend.map(p => <Stat key={p.size} label={p.label} value={Math.max(0, p.pending)} icon="truck" tone="warn" hint={`Enviados ${p.sent} · Recebidos ${p.returned}`} />)}
          <Stat label="Total pendente" value={Math.max(0, total)} icon="box" />
        </div>
      </section>
      {w && (<>
        <MoveForm title="1. Enviar cilindros vazios ao fornecedor" action={registerSupplierSend} back="/trocas" userName={user.name} submit="Registrar envio" />
        <MoveForm title="2. Receber cilindros cheios do fornecedor" action={registerSupplierReturn} back="/trocas" userName={user.name} submit="Registrar retorno" />
      </>)}
      <History title="Histórico de trocas" ops={["ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR"]} sp={sp} base="/trocas" canReverse={w} />
    </>
  );
}
