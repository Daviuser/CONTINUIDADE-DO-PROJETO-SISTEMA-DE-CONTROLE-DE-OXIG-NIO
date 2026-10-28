import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { Flash } from "../_components/MoveForm";
import { SupplyForm } from "../_components/SupplyForm";
import { History } from "../_components/History";
import { Icon } from "@/components/Icon";
import { registerSupplyBatch } from "../estoque-actions";
import { todayStr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Abastecimentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  return (
    <>
      <div><h1>Controle de Abastecimento de Oxigênio</h1><p className="mt-1 text-sm text-slate-500">Registre os cilindros <b>cheios</b> recebidos do fornecedor, nas três categorias de uma só vez. Cheios recebidos baixam primeiro os vazios que estavam pendentes com o fornecedor; o restante entra como novo no estoque cheio do hospital.</p></div>
      <Flash erro={sp.erro} ok={sp.ok === "lote" ? undefined : sp.ok} />
      {sp.ok === "lote" && <div role="status" className="alert alert-ok"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" /><span>Abastecimento registrado com sucesso{sp.resumo ? <>: <b>{sp.resumo}</b></> : ""}.</span></div>}
      {w && <SupplyForm action={registerSupplyBatch} requestKey={randomUUID()} userName={user.name} today={todayStr()} />}
      <History title="Histórico de abastecimentos" ops={["ABASTECIMENTO"]} sp={sp} base="/abastecimentos" canReverse={w} />
    </>
  );
}
