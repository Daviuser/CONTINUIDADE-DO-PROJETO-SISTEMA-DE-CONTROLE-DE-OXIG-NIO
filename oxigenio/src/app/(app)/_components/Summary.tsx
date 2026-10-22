import { cylinderSummary } from "@/lib/stock";

export async function CylinderSummary() {
  const { rows, totals: t } = await cylinderSummary();
  const H = ["Categoria", "Hospital: cheios", "Hospital: vazios", "Hospital: indisponíveis", "Em domicílio (em uso)", "Com o fornecedor (vazios)", "Total"];
  return (
    <div className="bg-white border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-verde-50 text-left"><tr>{H.map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (<tr key={r.size} className="border-t"><td className="p-2 font-medium">{r.label}</td>
            <td className="p-2">{r.hCheio}</td><td className="p-2">{r.hVazio}</td><td className="p-2">{r.hIndisp}</td><td className="p-2">{r.dom}</td><td className="p-2">{r.forn}</td><td className="p-2 font-semibold">{r.total}</td></tr>))}
          <tr className="border-t bg-neutral-50 font-semibold"><td className="p-2">Total geral</td>
            <td className="p-2">{t.hCheio}</td><td className="p-2">{t.hVazio}</td><td className="p-2">{t.hIndisp}</td><td className="p-2">{t.dom}</td><td className="p-2">{t.forn}</td><td className="p-2">{t.total}</td></tr>
        </tbody></table></div>
  );
}
