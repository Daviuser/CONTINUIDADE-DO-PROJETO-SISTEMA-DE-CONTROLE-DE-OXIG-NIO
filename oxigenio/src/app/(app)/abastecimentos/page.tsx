import { requireUser } from "@/lib/auth";
import { MoveForm, Flash } from "../_components/MoveForm";
import { History } from "../_components/History";
import { registerSupply } from "../estoque-actions";

export const dynamic = "force-dynamic";

export default async function Abastecimentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  return (
    <>
      <div><h1>Controle de Abastecimento de Oxigênio</h1><p className="mt-1 text-sm text-slate-500">Registre o recebimento de cilindros <b>cheios</b>. Eles entram no estoque de cilindros cheios do hospital.</p></div>
      <Flash erro={sp.erro} ok={sp.ok} />
      {w && <MoveForm title="Registrar recebimento" action={registerSupply} back="/abastecimentos" userName={user.name} submit="Registrar abastecimento" />}
      <History title="Histórico de abastecimentos" ops={["ABASTECIMENTO"]} sp={sp} base="/abastecimentos" canReverse={w} />
    </>
  );
}
