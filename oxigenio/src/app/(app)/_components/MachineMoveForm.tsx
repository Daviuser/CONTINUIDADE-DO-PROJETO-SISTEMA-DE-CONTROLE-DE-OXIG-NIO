"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MACHINE_KINDS, MACHINE_KIND_LABEL, MACHINE_OP_LABEL } from "@/lib/labels";

const OPS = ["ENTRADA", "DEVOLUCAO", "TRANSFERENCIA", "RETIRADA", "AJUSTE"] as const;
const HELP: Record<string, string> = {
  ENTRADA: "Coloca o item na máquina. “Do estoque do hospital” tira do saldo central (não conta duas vezes); “Novo” é um item que ainda não estava no estoque.",
  DEVOLUCAO: "Tira o item da máquina e devolve ao estoque do hospital.",
  TRANSFERENCIA: "Passa o item desta máquina para outra máquina. O total geral não muda.",
  RETIRADA: "Retira da máquina e dá baixa (sai do controle). Informe o motivo.",
  AJUSTE: "Corrige a quantidade que há nesta máquina. Informe a justificativa; o total geral muda.",
};

export function MachineMoveForm({ machineId, others, action, requestKey, userName, today }: {
  machineId: string; others: { id: string; name: string }[]; action: (fd: FormData) => Promise<void>; requestKey: string; userName: string; today: string }) {
  const [op, setOp] = useState<string>("ENTRADA");
  const [kind, setKind] = useState<string>("CILINDRO_P");
  const isCyl = kind.startsWith("CILINDRO");
  const intub = kind === "FLUXOMETRO_INTUBACAO";
  const notesReq = op === "RETIRADA" || op === "AJUSTE";
  return (
    <form action={action} className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="border-b pb-3 sm:col-span-2 lg:col-span-4">Registrar movimentação</h2>
      <input type="hidden" name="machineId" value={machineId} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <label className="text-sm">Operação *<select name="operation" value={op} onChange={e => setOp(e.target.value)} className="mt-1.5 w-full">{OPS.map(o => <option key={o} value={o}>{MACHINE_OP_LABEL[o]}</option>)}</select></label>
      <label className="text-sm">Item *<select name="kind" value={kind} onChange={e => setKind(e.target.value)} className="mt-1.5 w-full">{MACHINE_KINDS.map(k => <option key={k} value={k}>{MACHINE_KIND_LABEL[k]}</option>)}</select></label>
      <label className="text-sm">{op === "AJUSTE" ? "Nova quantidade na máquina *" : "Quantidade *"}<input name="quantity" type="number" min={op === "AJUSTE" ? 0 : 1} step={1} required inputMode="numeric" className="mt-1.5 w-full" /></label>
      <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={today} max={today} className="mt-1.5 w-full" /></label>
      {op === "ENTRADA" && !intub && <label className="text-sm">Origem *<select name="source" defaultValue="CENTRAL" className="mt-1.5 w-full"><option value="CENTRAL">Do estoque do hospital</option><option value="NOVO">Novo (cadastro / aquisição)</option></select></label>}
      {op === "TRANSFERENCIA" && <label className="text-sm">Máquina de destino *<select name="toMachineId" required defaultValue="" className="mt-1.5 w-full"><option value="" disabled>Selecione…</option>{others.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
      {op === "DEVOLUCAO" && isCyl && <label className="text-sm">Estado ao devolver *<select name="returnCondition" defaultValue="VAZIO" className="mt-1.5 w-full"><option value="VAZIO">Vazio</option><option value="CHEIO">Cheio</option></select></label>}
      <label className="text-sm">Responsável *<input name="responsibleName" required defaultValue={userName} className="mt-1.5 w-full" /></label>
      <label className="text-sm sm:col-span-2 lg:col-span-3">{op === "AJUSTE" ? "Justificativa" : op === "RETIRADA" ? "Motivo" : "Observações"}{notesReq && " *"}<input name="notes" required={notesReq} className="mt-1.5 w-full" /></label>
      <SubmitButton icon="check" className="btn btn-primary w-full">Registrar</SubmitButton>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
        {HELP[op]}{intub && op === "ENTRADA" ? " Fluxômetro de intubação é sempre cadastrado como item novo." : ""}{intub && op === "DEVOLUCAO" ? " Fluxômetro de intubação não volta ao estoque do hospital: use transferência ou retirada." : ""}
      </p>
    </form>
  );
}
