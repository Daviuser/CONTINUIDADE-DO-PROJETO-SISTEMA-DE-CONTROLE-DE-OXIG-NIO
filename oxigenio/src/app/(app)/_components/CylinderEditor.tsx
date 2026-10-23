"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type CylRow = { size: string; label: string; total: number; vazios: number; dom: number; enf: number; indisp: number; forn: number };
const FIELDS = [["total", "Total de cilindros"], ["vazios", "Vazios (no hospital)"], ["dom", "Em domicílio"], ["enf", "Nas enfermarias"], ["indisp", "Indisponíveis"]] as const;
type F = (typeof FIELDS)[number][0];
const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function CylinderEditor({ rows, action, requestKey }: { rows: CylRow[]; action: (fd: FormData) => Promise<void>; requestKey: string }) {
  const [v, setV] = useState<Record<string, Record<F, string>>>(() =>
    Object.fromEntries(rows.map(r => [r.size, { total: String(r.total), vazios: String(r.vazios), dom: String(r.dom), enf: String(r.enf), indisp: String(r.indisp) }])));
  const set = (size: string, f: F, val: string) => setV(p => ({ ...p, [size]: { ...p[size], [f]: val } }));
  const calc = rows.map(r => { const x = v[r.size]; return { r, d: num(x.total) - num(x.vazios) - num(x.dom) - num(x.enf) - num(x.indisp) - r.forn }; });
  const invalid = calc.some(c => Number.isNaN(c.d) || c.d < 0);
  const sum = (f: F) => rows.reduce((a, r) => a + (num(v[r.size][f]) || 0), 0);
  const disp = calc.reduce((a, c) => a + (c.d > 0 ? c.d : 0), 0);
  const forn = rows.reduce((a, r) => a + r.forn, 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestKey" value={requestKey} />
      <p className="text-sm text-slate-600">Informe o <b>total</b> de cada categoria e <b>onde estão</b>. Os <b>disponíveis</b> (cheios no hospital) são calculados automaticamente.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {calc.map(({ r, d }) => {
          const bad = Number.isNaN(d) || d < 0;
          return (
            <div key={r.size} className="card space-y-4 p-5">
              <div className="flex items-center justify-between"><h2>{r.label}</h2><span className="badge badge-muted">{r.size}</span></div>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(([f, label]) => (
                  <label key={f} className={"text-sm " + (f === "total" ? "col-span-2" : "")}>{label}
                    <input name={`${f}_${r.size}`} inputMode="numeric" pattern="[0-9]*" required value={v[r.size][f]} onChange={e => set(r.size, f, e.target.value)} className="mt-1.5 w-full tabular-nums" /></label>))}
              </div>
              {r.forn > 0 && <p className="text-xs text-slate-500">Com o fornecedor (troca): <b>{r.forn}</b>. Isso é ajustado em “Trocas com fornecedores”.</p>}
              <div className={"rounded-xl p-3 text-center " + (bad ? "bg-red-50 text-red-700" : "bg-verde-50 text-verde-800")}>
                <p className="text-xs font-medium">Disponíveis (cheios no hospital)</p>
                <p className="font-display text-3xl font-extrabold tabular-nums">{Number.isNaN(d) ? "—" : d}</p>
                {!Number.isNaN(d) && d < 0 && <p className="text-xs">A soma passa do total em {-d}.</p>}
                {Number.isNaN(d) && <p className="text-xs">Preencha todos os campos com números.</p>}
              </div>
            </div>);
        })}
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <p className="text-sm text-slate-600">
          <b className="text-grafite-900">Total geral: {sum("total")}</b> · Disponíveis: {disp} · Vazios: {sum("vazios")} · Em domicílio: {sum("dom")} · Enfermarias: {sum("enf")} · Indisponíveis: {sum("indisp")}{forn ? ` · Com o fornecedor: ${forn}` : ""}
        </p>
        <SubmitButton icon="check" disabled={invalid}>Salvar estoque</SubmitButton>
      </div>
    </form>
  );
}
