import { cylinderSummary } from "@/lib/stock";

export async function CylinderSummary() {
  const { rows, totals: t } = await cylinderSummary();
  const H = ["Categoria", "Hospital: cheios", "Hospital: vazios", "Hospital: indisp.", "Em domicílio (em uso)", "Com o fornecedor (vazios)", "Total"];
  return (
    <div className="card">
      <table>
        <thead><tr>{H.map((h, i) => <th key={h} className={i ? "num" : ""}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (<tr key={r.size}><td className="font-medium">{r.label}</td>
            <td className="num">{r.hCheio}</td><td className="num">{r.hVazio}</td><td className="num">{r.hIndisp}</td><td className="num">{r.dom}</td><td className="num">{r.forn}</td><td className="num font-semibold">{r.total}</td></tr>))}
          <tr className="bg-[#f7faf8] font-semibold"><td>Total geral</td>
            <td className="num">{t.hCheio}</td><td className="num">{t.hVazio}</td><td className="num">{t.hIndisp}</td><td className="num">{t.dom}</td><td className="num">{t.forn}</td><td className="num">{t.total}</td></tr>
        </tbody></table></div>
  );
}
