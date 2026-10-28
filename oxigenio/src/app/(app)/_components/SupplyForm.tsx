"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ReceiptField } from "@/components/ui/ReceiptField";
import { SIZES, SIZE_LABEL } from "@/lib/labels";

// Aceita vazio (= sem abastecimento) ou número inteiro >= 0. Decimais e negativos são recusados.
const parse = (s: string) => (s.trim() === "" ? { ok: true, n: 0 } : /^\d+$/.test(s.trim()) ? { ok: true, n: Number(s) } : { ok: false, n: 0 });

export function SupplyForm({ action, requestKey, userName, today }: { action: (fd: FormData) => Promise<void>; requestKey: string; userName: string; today: string }) {
  const [v, setV] = useState<Record<string, string>>({ P: "", M: "", G: "" });
  const st = SIZES.map(s => ({ s, ...parse(v[s]) }));
  const invalid = st.some(x => !x.ok);
  const total = st.reduce((a, x) => a + x.n, 0);
  const canSave = !invalid && total > 0;
  return (
    <form action={action} className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="border-b pb-3 sm:col-span-2 lg:col-span-4">Registrar abastecimento (cilindros cheios recebidos)</h2>
      <input type="hidden" name="requestKey" value={requestKey} />
      <label className="text-sm">Data *<input name="occurredAt" type="date" required defaultValue={today} max={today} className="mt-1.5 w-full" /></label>
      <label className="text-sm sm:col-span-1 lg:col-span-3">Responsável *<input name="responsibleName" required defaultValue={userName} className="mt-1.5 w-full" /></label>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3 lg:col-span-4">
        {st.map(x => (
          <label key={x.s} className="text-sm">{SIZE_LABEL[x.s]}
            <input name={`qty_${x.s}`} inputMode="numeric" pattern="[0-9]*" placeholder="0" value={v[x.s]} onChange={e => setV(p => ({ ...p, [x.s]: e.target.value }))}
              aria-invalid={!x.ok} className="mt-1.5 w-full tabular-nums" />
            {!x.ok && <span role="alert" className="mt-1 block text-xs text-red-700">Use apenas números inteiros (sem decimais ou negativos).</span>}
          </label>))}
      </div>
      <label className="text-sm sm:col-span-2 lg:col-span-4">Observações<input name="notes" maxLength={500} className="mt-1.5 w-full" /></label>
      <div className="sm:col-span-2 lg:col-span-4"><ReceiptField /></div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
        <SubmitButton icon="check" disabled={!canSave} className="btn btn-primary">Salvar abastecimento</SubmitButton>
        <p className={"text-sm " + (!invalid && total === 0 ? "text-slate-500" : "text-slate-600")}>
          {invalid ? "Corrija os campos destacados." : total === 0 ? "Preencha pelo menos uma categoria com quantidade maior que zero. Campos vazios não geram registro." : `Total a registrar: ${total} cilindro(s).`}
        </p>
      </div>
    </form>
  );
}
