import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { cylinderSummary } from "@/lib/stock";
import { Flash } from "../_components/MoveForm";
import { CylinderSummary } from "../_components/Summary";
import { CylinderEditor } from "../_components/CylinderEditor";
import { History } from "../_components/History";
import { LocationTable } from "../_components/LocationTable";
import { saveCylinderStock } from "./actions";

export const dynamic = "force-dynamic";

export default async function Cilindros({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const { rows } = await cylinderSummary();
  return (
    <>
      <div><h1>Controle de Cilindros</h1><p className="mt-1 text-sm text-slate-500">Quantidade de cilindros por categoria: total, vazios, em domicílio, nas enfermarias e disponíveis.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      {w ? <CylinderEditor rows={rows.map(r => ({ ...r, vazios: r.hVazio, indisp: r.hIndisp }))} action={saveCylinderStock} requestKey={randomUUID()} /> : <CylinderSummary />}
      <LocationTable mode="cyl" />
      <details className="card p-4">
        <summary className="!font-semibold !text-grafite-900">Histórico de alterações e movimentações</summary>
        <div className="mt-4">
          <History title="" ops={["AJUSTE_ESTOQUE", "MAQUINA_INTUBACAO", "SAIDA_LOCAL", "DEVOLUCAO_LOCAL", "TRANSFERENCIA_LOCAL", "ENTRADA_INICIAL", "ABASTECIMENTO", "ENTREGA_DOMICILIAR", "RECOLHIMENTO_DOMICILIAR", "ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR", "BAIXA_INDISPONIVEL", "RETORNO_DISPONIVEL"]} sp={sp} base="/cilindros" canReverse={w} />
        </div>
      </details>
    </>
  );
}
