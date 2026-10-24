import { randomUUID } from "crypto";
import { inputCls } from "@/lib/ui";
import { SIZES, SIZE_LABEL } from "@/lib/labels";
import { todayStr } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/Icon";
import { ReceiptField } from "@/components/ui/ReceiptField";

export function MoveForm({ title, action, back, userName, submit, noSize, notesLabel = "Observações", notesRequired, receipt, children }: {
  title: string; action: (fd: FormData) => Promise<void>; back: string; userName: string; submit: string;
  noSize?: boolean; notesLabel?: string; notesRequired?: boolean; receipt?: boolean; children?: React.ReactNode }) {
  return (
    <form action={action} className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="border-b pb-3 sm:col-span-2 lg:col-span-4">{title}</h2>
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="requestKey" value={randomUUID()} />
      <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={todayStr()} max={todayStr()} className={inputCls} /></label>
      {!noSize && <label className="text-sm">Categoria *<select name="size" className={inputCls}>{SIZES.map(s => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}</select></label>}
      <label className="text-sm">Quantidade *<input name="quantity" type="number" min={1} step={1} required inputMode="numeric" className={inputCls} /></label>
      <label className="text-sm">Responsável *<input name="responsibleName" required defaultValue={userName} className={inputCls} /></label>
      {children}
      {receipt && <div className="sm:col-span-2 lg:col-span-4"><ReceiptField /></div>}
      <label className="text-sm sm:col-span-2 lg:col-span-3">{notesLabel}{notesRequired && " *"}<input name="notes" required={notesRequired} className={inputCls} /></label>
      <SubmitButton icon="check" className="btn btn-primary w-full">{submit}</SubmitButton>
    </form>
  );
}

export function Flash({ erro, ok }: { erro?: string; ok?: string }) {
  return (<>
    {erro && <div role="alert" className="alert alert-error"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{erro}</div>}
    {ok && <div role="status" className="alert alert-ok"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />{ok === "dup" ? "Esta operação já tinha sido registrada (não foi duplicada)." : ok === "estoque" ? "Estoque atualizado com sucesso." : ok === "nenhuma" ? "Nenhuma alteração: os valores são iguais aos atuais." : "Registrado com sucesso."}</div>}
  </>);
}
