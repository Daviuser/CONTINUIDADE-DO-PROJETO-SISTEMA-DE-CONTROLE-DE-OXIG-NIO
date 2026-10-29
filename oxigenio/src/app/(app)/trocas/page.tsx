import { requireUser } from "@/lib/auth";
import { randomUUID } from "crypto";
import { Flash } from "../_components/MoveForm";
import { SupplierSendBatchForm } from "../_components/SupplierSendBatchForm";
import { History } from "../_components/History";
import { Stat } from "@/components/ui/Stat";
import { registerSupplierSendBatch } from "../estoque-actions";
import { pendingBySize } from "@/lib/stock";
import { todayStr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Trocas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const pend = await pendingBySize();
  const total = pend.reduce((a, p) => a + p.pending, 0);
  return (
    <>
      <div><h1>Troca com o Fornecedor</h1><p className="mt-1 text-sm text-slate-500">Registre aqui somente os cilindros <b>vazios</b> enviados ou entregues ao fornecedor. A chegada dos cilindros <b>cheios</b> é registrada em <b>Abastecimento</b>.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      <section className="space-y-3" aria-labelledby="h-pend">
        <h2 id="h-pend" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vazios com o fornecedor (aguardando troca)</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pend.map(p => <Stat key={p.size} label={p.label} value={Math.max(0, p.pending)} icon="truck" tone="warn" hint={`Enviados ${p.sent} · Trocados ${p.returned}`} />)}
          <Stat label="Total com o fornecedor" value={Math.max(0, total)} icon="box" />
        </div>
      </section>
      {w && <SupplierSendBatchForm action={registerSupplierSendBatch} requestKey={randomUUID()} userName={user.name} today={todayStr()} />}
      <History title="Histórico de trocas" ops={["ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR"]} sp={sp} base="/trocas" canReverse={w} />
    </>
  );
}
