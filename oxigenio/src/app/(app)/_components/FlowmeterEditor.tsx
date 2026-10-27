"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";

const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function FlowmeterEditor({ current, action, requestKey }: { current: { total: number; domicilio: number; enfermarias: number; maquinas: number; locais: number }; action: (fd: FormData) => Promise<void>; requestKey: string }) {
  const [total, setTotal] = useState(String(current.total));
  const [dom, setDom] = useState(String(current.domicilio));
  const [enf, setEnf] = useState(String(current.enfermarias));
  const d = num(total) - num(dom) - num(enf) - current.maquinas - current.locais;
  const bad = Number.isNaN(d) || d < 0;
  const F = ({ name, label, value, set, wide }: { name: string; label: string; value: string; set: (v: string) => void; wide?: boolean }) => (
    <label className={"text-sm " + (wide ? "sm:col-span-3" : "")}>{label}
      <input name={name} inputMode="numeric" pattern="[0-9]*" required value={value} onChange={e => set(e.target.value)} className="mt-1.5 w-full tabular-nums" /></label>);
  return (
    <form action={action} className="card space-y-5 p-5">
      <input type="hidden" name="requestKey" value={requestKey} />
      <p className="text-sm text-slate-600">Informe o <b>total</b> de fluxômetros e <b>onde estão</b>. Os <b>disponíveis no hospital</b> são calculados automaticamente.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <F name="total" label="Total de fluxômetros" value={total} set={setTotal} wide />
        <F name="dom" label="Em domicílio" value={dom} set={setDom} />
        <F name="enf" label="Nas enfermarias (sem local definido)" value={enf} set={setEnf} />
        <div className={"rounded-xl p-3 text-center " + (bad ? "bg-red-50 text-red-700" : "bg-verde-50 text-verde-800")}>
          <p className="text-xs font-medium">Disponíveis no hospital</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">{Number.isNaN(d) ? "—" : d}</p>
          {!Number.isNaN(d) && d < 0 && <p className="text-xs">A soma passa do total em {-d}.</p>}
        </div>
      </div>
      {current.locais > 0 && <p className="text-xs text-slate-500">Distribuídos nos locais internos: <b>{current.locais}</b> (ajustado em “Localização”).</p>}
      {current.maquinas > 0 && <p className="text-xs text-slate-500">Nas máquinas de intubação: <b>{current.maquinas}</b> (ajustado em “Máquinas de intubação”).</p>}
      <SubmitButton icon="check" disabled={bad}>Salvar estoque</SubmitButton>
    </form>
  );
}
