import { Icon } from "@/components/Icon";
const tones = { brand: "bg-verde-50 text-verde-700", warn: "bg-laranja-50 text-laranja-600", neutral: "bg-slate-100 text-slate-600" };
export function Stat({ label, value, icon, tone = "brand", hint }: { label: string; value: number; icon: string; tone?: keyof typeof tones; hint?: string }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + tones[tone]}><Icon name={icon} className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-grafite-900">{value.toLocaleString("pt-BR")}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
