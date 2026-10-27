"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SIZES, SIZE_LABEL, COND_LABEL, FM_KIND_LABEL } from "@/lib/labels";

const CYL_OPS: [string, string][] = [["RECEBER_CENTRAL", "Receber do estoque central"], ["DEVOLVER_CENTRAL", "Devolver ao estoque central"], ["TRANSFERIR", "Transferir para outro local"], ["RECEBER_OUTRO", "Receber de outro local"], ["MUDAR_CONDICAO", "Mudar a condição neste local"]];
const FLOW_OPS: [string, string][] = [["RECEBER_CENTRAL", "Receber do estoque central"], ["DEVOLVER_CENTRAL", "Devolver ao estoque central"], ["TRANSFERIR", "Transferir para outro local"], ["RECEBER_OUTRO", "Receber de outro local"], ["ENTRADA_NOVA", "Entrada nova neste local"], ["RETIRADA", "Retirada (baixa) deste local"]];
const HELP: Record<string, string> = {
  RECEBER_CENTRAL: "Tira do estoque central do hospital e coloca neste local.",
  DEVOLVER_CENTRAL: "Tira deste local e devolve ao estoque central do hospital.",
  TRANSFERIR: "Passa deste local para outro local.",
  RECEBER_OUTRO: "Traz de outro local para este.",
  MUDAR_CONDICAO: "Muda a condição dos cilindros que já estão aqui (ex.: cheio → vazio quando acabou o oxigênio).",
  ENTRADA_NOVA: "Item que ainda não estava no controle (cadastro). Entra direto neste local.",
  RETIRADA: "Dá baixa (sai do controle). Informe o motivo.",
};

export function LocationMoveForm({ mode, code, others, action, requestKey, userName, today }: {
  mode: "cyl" | "flow"; code: string; others: { code: string; name: string }[]; action: (fd: FormData) => Promise<void>; requestKey: string; userName: string; today: string }) {
  const ops = mode === "cyl" ? CYL_OPS : FLOW_OPS;
  const [op, setOp] = useState(ops[0][0]);
  const [kind, setKind] = useState("COMUM");
  const needOther = op === "TRANSFERIR" || op === "RECEBER_OUTRO";
  const central = op === "RECEBER_CENTRAL" || op === "DEVOLVER_CENTRAL";
  const intubCentral = mode === "flow" && kind === "INTUBACAO" && central;
  return (
    <form action={action} className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="border-b pb-3 sm:col-span-2 lg:col-span-4">{mode === "cyl" ? "Movimentar cilindros" : "Movimentar fluxômetros"}</h2>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <label className="text-sm">Operação *<select name="op" value={op} onChange={e => setOp(e.target.value)} className="mt-1.5 w-full">{ops.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {mode === "cyl"
        ? <label className="text-sm">Tamanho *<select name="size" className="mt-1.5 w-full">{SIZES.map(s => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}</select></label>
        : <label className="text-sm">Tipo *<select name="kind" value={kind} onChange={e => setKind(e.target.value)} className="mt-1.5 w-full"><option value="COMUM">{FM_KIND_LABEL.COMUM}</option><option value="INTUBACAO">{FM_KIND_LABEL.INTUBACAO}</option></select></label>}
      <label className="text-sm">Quantidade *<input name="quantity" type="number" min={1} step={1} required inputMode="numeric" className="mt-1.5 w-full" /></label>
      <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={today} max={today} className="mt-1.5 w-full" /></label>
      {mode === "cyl" && <label className="text-sm">{op === "MUDAR_CONDICAO" ? "Condição atual *" : "Condição *"}<select name="cond" defaultValue="CHEIO" className="mt-1.5 w-full">{Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
      {mode === "cyl" && op === "MUDAR_CONDICAO" && <label className="text-sm">Nova condição *<select name="cond2" defaultValue="VAZIO" className="mt-1.5 w-full">{Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
      {needOther && <label className="text-sm">{op === "TRANSFERIR" ? "Local de destino *" : "Local de origem *"}<select name="other" required defaultValue="" className="mt-1.5 w-full"><option value="" disabled>Selecione…</option>{others.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}</select></label>}
      <label className="text-sm">Responsável *<input name="responsibleName" required defaultValue={userName} className="mt-1.5 w-full" /></label>
      <label className="text-sm sm:col-span-2 lg:col-span-2">{op === "RETIRADA" ? "Motivo *" : "Observações"}<input name="notes" required={op === "RETIRADA"} className="mt-1.5 w-full" /></label>
      <SubmitButton icon="check" disabled={intubCentral} className="btn btn-primary w-full">Registrar</SubmitButton>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">{HELP[op]}{intubCentral ? " Fluxômetro de intubação não existe no estoque central: use entrada nova ou transferência entre locais." : ""}</p>
    </form>
  );
}
