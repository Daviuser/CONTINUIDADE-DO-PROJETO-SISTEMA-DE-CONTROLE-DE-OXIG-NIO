import { randomUUID } from "crypto";
import { inputCls, btnCls } from "@/lib/ui";
import { SIZES, SIZE_LABEL } from "@/lib/labels";
import { todayStr } from "@/lib/format";

export function MoveForm({ title, action, back, userName, submit, noSize, notesLabel = "Observações", notesRequired, children }: {
  title: string; action: (fd: FormData) => Promise<void>; back: string; userName: string; submit: string;
  noSize?: boolean; notesLabel?: string; notesRequired?: boolean; children?: React.ReactNode }) {
  return (
    <form action={action} className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end">
      <h2 className="font-semibold md:col-span-4">{title}</h2>
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="requestKey" value={randomUUID()} />
      <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={todayStr()} max={todayStr()} className={inputCls} /></label>
      {!noSize && <label className="text-sm">Categoria *<select name="size" className={inputCls}>{SIZES.map(s => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}</select></label>}
      <label className="text-sm">Quantidade *<input name="quantity" type="number" min={1} step={1} required className={inputCls} /></label>
      <label className="text-sm">Responsável *<input name="responsibleName" required defaultValue={userName} className={inputCls} /></label>
      {children}
      <label className="text-sm md:col-span-3">{notesLabel}{notesRequired && " *"}<input name="notes" required={notesRequired} className={inputCls} /></label>
      <button className={btnCls}>{submit}</button>
    </form>
  );
}

export function Flash({ erro, ok }: { erro?: string; ok?: string }) {
  return (<>
    {erro && <p role="alert" className="bg-red-50 text-red-700 rounded p-2 text-sm">{erro}</p>}
    {ok && <p className="bg-verde-50 text-verde-700 rounded p-2 text-sm">{ok === "dup" ? "Esta operação já tinha sido registrada (não foi duplicada)." : "Registrado com sucesso."}</p>}
  </>);
}
