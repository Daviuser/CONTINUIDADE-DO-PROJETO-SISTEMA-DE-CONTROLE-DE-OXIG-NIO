import { inputCls, btnCls } from "@/lib/ui";
import { toInputDate } from "@/lib/format";
import { savePatient } from "./actions";
import type { Patient } from "@prisma/client";

export function PatientForm({ p, readOnly }: { p?: Patient; readOnly?: boolean }) {
  const F = ({ n, label, req, type = "text", def }: { n: string; label: string; req?: boolean; type?: string; def?: string | number | null }) => (
    <label className="block text-sm">{label}{req && " *"}
      <input name={n} type={type} required={req} defaultValue={def ?? ""} disabled={readOnly} className={inputCls} /></label>);
  return (
    <form action={savePatient} className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="md:col-span-2"><F n="fullName" label="Nome completo" req def={p?.fullName} /></div>
      <F n="phone" label="Telefone de contato" type="tel" def={p?.phone} />
      <F n="address" label="Endereço" req def={p?.address} />
      <F n="neighborhood" label="Bairro" def={p?.neighborhood} />
      <F n="village" label="Povoado / localidade" def={p?.village} />
      <div className="md:col-span-2"><F n="reference" label="Referência para localização" def={p?.reference} /></div>
      <label className="block text-sm">Tipo de cilindro
        <select name="cylinderSize" defaultValue={p?.cylinderSize ?? ""} disabled={readOnly} className={inputCls}>
          <option value="">—</option><option value="P">Pequeno (P)</option><option value="M">Médio (M)</option><option value="G">Grande (G)</option></select></label>
      <F n="cylinderQty" label="Quantidade de cilindros vinculados" type="number" def={p?.cylinderQty ?? 0} />
      <F n="flowLpm" label="Fluxo / consumo informado" def={p?.flowLpm} />
      <F n="startDate" label="Data de início do acompanhamento" type="date" req def={toInputDate(p?.startDate)} />
      <label className="block text-sm md:col-span-2">Observações
        <textarea name="notes" defaultValue={p?.notes ?? ""} disabled={readOnly} rows={3} className={inputCls} /></label>
      {!readOnly && <div className="md:col-span-2"><button className={btnCls}>{p ? "Salvar alterações" : "Cadastrar paciente"}</button></div>}
    </form>
  );
}
