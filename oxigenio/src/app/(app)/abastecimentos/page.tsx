import { requireUser } from "@/lib/auth";
import { inputCls } from "@/lib/ui";
import { MoveForm, Flash } from "../_components/MoveForm";
import { History } from "../_components/History";
import { registerSupply } from "../estoque-actions";

export const dynamic = "force-dynamic";

export default async function Abastecimentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  return (
    <div className="space-y-5">
      <h1>Controle de Abastecimento de Oxigênio</h1>
      <Flash erro={sp.erro} ok={sp.ok} />
      <p className="text-sm text-neutral-600">Registra o recebimento de cilindros <b>cheios</b> de fornecedores. Eles entram no estoque cheio do hospital.</p>
      {w && <MoveForm title="Registrar recebimento" action={registerSupply} back="/abastecimentos" userName={user.name} submit="Registrar abastecimento">
        <label className="text-sm">Fornecedor *<input name="supplier" required className={inputCls} /></label></MoveForm>}
      <History title="Histórico de abastecimentos" ops={["ABASTECIMENTO"]} sp={sp} base="/abastecimentos" canReverse={w} supplierFilter />
    </div>
  );
}
