import { requireUser } from "@/lib/auth";
import { inputCls } from "@/lib/ui";
import { MoveForm, Flash } from "../_components/MoveForm";
import { History } from "../_components/History";
import { registerDelivery, registerCollection } from "../estoque-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Domicilio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const sp = await searchParams; const w = user.role !== "CONSULTA";
  const patients = await db.patient.findMany({ where: { status: "ATIVO" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, neighborhood: true, village: true } });
  const sel = (
    <label className="text-sm md:col-span-2">Paciente *<select name="patientId" required defaultValue={sp.patient ?? ""} className={inputCls}>
      <option value="" disabled>Selecione…</option>
      {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}{p.neighborhood || p.village ? ` — ${p.neighborhood ?? p.village}` : ""}</option>)}</select></label>);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Entregas e Recolhimentos Domiciliares</h1>
      <Flash erro={sp.erro} ok={sp.ok} />
      <p className="text-sm text-neutral-600">Entrega e recolhimento são operações independentes e podem ocorrer em datas diferentes. O controle é por quantidade, sem identificar o cilindro.</p>
      {w && (<>
        <MoveForm title="Registrar entrega (cilindros cheios saem do hospital)" action={registerDelivery} back="/domicilio" userName={user.name} submit="Registrar entrega">{sel}</MoveForm>
        <MoveForm title="Registrar recolhimento (cilindros voltam ao hospital)" action={registerCollection} back="/domicilio" userName={user.name} submit="Registrar recolhimento">{sel}
          <label className="text-sm">Estado ao recolher<select name="condition" className={inputCls}><option value="VAZIO">Vazio (padrão)</option><option value="CHEIO">Cheio (devolvido sem uso)</option></select></label></MoveForm>
      </>)}
      <History title="Histórico de entregas e recolhimentos" ops={["ENTREGA_DOMICILIAR", "RECOLHIMENTO_DOMICILIAR"]} sp={sp} base="/domicilio" canReverse={w} patients={patients} />
    </div>
  );
}
