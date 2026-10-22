import { requireUser } from "@/lib/auth";
import { inputCls } from "@/lib/ui";
import { MoveForm, Flash } from "../_components/MoveForm";
import { CylinderSummary } from "../_components/Summary";
import { History } from "../_components/History";
import { registerInitialStock, registerUnavailable } from "../estoque-actions";
import { LOC_LABEL, COND_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;

export default async function Cilindros({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Controle de Cilindros</h1>
      <Flash erro={sp.erro} ok={sp.ok} />
      <CylinderSummary />
      <p className="text-xs text-neutral-500">Em domicílio, os cilindros entregues contam como “em uso”. Os saldos só mudam quando uma movimentação é registrada.</p>
      {w && (<>
        <MoveForm title="Cadastrar quantidade existente (inventário inicial)" action={registerInitialStock} back="/cilindros" userName={user.name} submit="Cadastrar">
          <label className="text-sm">Local *<select name="location" className={inputCls}><option value="HOSPITAL">{LOC_LABEL.HOSPITAL}</option><option value="DOMICILIO">{LOC_LABEL.DOMICILIO}</option><option value="TRANSPORTE">{LOC_LABEL.TRANSPORTE} (vazios)</option></select></label>
          <label className="text-sm">Estado (hospital) *<select name="condition" className={inputCls}>{Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </MoveForm>
        <MoveForm title="Indisponibilidade no hospital" action={registerUnavailable} back="/cilindros" userName={user.name} submit="Registrar" notesLabel="Motivo (obrigatório ao marcar indisponível)">
          <label className="text-sm">Ação *<select name="direction" className={inputCls}><option value="INDISPONIVEL">Marcar como indisponível</option><option value="DISPONIVEL">Voltar a ficar disponível</option></select></label>
          <label className="text-sm">Estado do cilindro *<select name="condition" className={inputCls}><option value="CHEIO">Cheio</option><option value="VAZIO">Vazio</option></select></label>
        </MoveForm>
      </>)}
      <History title="Histórico de movimentações de cilindros" ops={["ENTRADA_INICIAL", "ABASTECIMENTO", "ENTREGA_DOMICILIAR", "RECOLHIMENTO_DOMICILIAR", "ENVIO_FORNECEDOR", "RETORNO_FORNECEDOR", "BAIXA_INDISPONIVEL", "RETORNO_DISPONIVEL"]} sp={sp} base="/cilindros" canReverse={w} />
    </div>
  );
}
