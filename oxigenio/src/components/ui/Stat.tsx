import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/ui/CountUp";
const tones = {
  brand: "bg-gradient-to-br from-verde-50 to-verde-100 text-verde-700",
  warn: "bg-gradient-to-br from-laranja-50 to-laranja-100 text-laranja-600",
  neutral: "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600",
};
export function Stat({ label, value, icon, tone = "brand", hint }: { label: string; value: number; icon: string; tone?: keyof typeof tones; hint?: string }) {
  return (
    <div className="card flex items-start gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + tones[tone]}><Icon name={icon} className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 font-display text-[1.7rem] font-extrabold leading-none tabular-nums text-grafite-900"><CountUp value={value} /></p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
