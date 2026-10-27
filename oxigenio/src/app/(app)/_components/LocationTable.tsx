import Link from "next/link";
import { locationOverview } from "@/lib/stock";

export async function LocationTable({ mode }: { mode: "cyl" | "flow" }) {
  const rows = await locationOverview();
  const H = mode === "cyl" ? ["Local", "Cheios", "Vazios", "Indisp.", "Total"] : ["Local", "Comuns", "Intubação", "Total"];
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2>Por local</h2><Link href="/localizacao" className="text-sm font-medium text-verde-700 hover:underline">Abrir tela de localização</Link></div>
      <div className="card"><table>
        <thead><tr>{H.map((h, i) => <th key={h} className={i ? "num" : ""}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.code}><td><Link href={`/localizacao/${r.code}`} className="font-medium text-verde-700 hover:underline">{r.name}</Link></td>
            {mode === "cyl" ? <><td className="num">{r.cheios}</td><td className="num">{r.vazios}</td><td className="num">{r.indisp}</td><td className="num font-semibold">{r.cil}</td></>
              : <><td className="num">{r.flowComum}</td><td className="num">{r.flowIntub}</td><td className="num font-semibold">{r.flowComum + r.flowIntub}</td></>}</tr>))}
        </tbody></table></div>
    </section>
  );
}
