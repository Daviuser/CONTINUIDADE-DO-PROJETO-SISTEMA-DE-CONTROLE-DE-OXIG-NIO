import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime, parseDate, okDate } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
const PAGE = 30;

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser(["ADMIN", "OPERADOR"]); // CONSULTA não acessa a auditoria
  const sp = await searchParams; const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity && { entity: sp.entity }),
    ...((okDate(sp.from) || okDate(sp.to)) && { at: { ...(okDate(sp.from) && { gte: parseDate(sp.from!) }), ...(okDate(sp.to) && { lt: new Date(parseDate(sp.to!).getTime() + 86400000) }) } }),
  };
  const [rows, total, ents] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);
  const users = await db.user.findMany({ where: { id: { in: [...new Set(rows.map(r => r.userId).filter(Boolean) as string[])] } }, select: { id: true, name: true } });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (n: number) => `/auditoria?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(n) })}`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <form className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end text-sm">
        <label>De<input type="date" name="from" defaultValue={sp.from} className={inputCls} /></label>
        <label>Até<input type="date" name="to" defaultValue={sp.to} className={inputCls} /></label>
        <label>Registro<select name="entity" defaultValue={sp.entity ?? ""} className={inputCls}><option value="">Todos</option>{ents.map(e => <option key={e.entity}>{e.entity}</option>)}</select></label>
        <button className={btnCls}>Filtrar</button></form>
      <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-verde-50 text-left"><tr>{["Data/hora", "Usuário", "Operação", "Registro", "Justificativa", "Detalhes"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} className="border-t align-top"><td className="p-2 whitespace-nowrap">{fmtDateTime(r.at)}</td>
            <td className="p-2">{users.find(u => u.id === r.userId)?.name ?? "—"}</td><td className="p-2">{r.action.replaceAll("_", " ")}</td>
            <td className="p-2">{r.entity}</td><td className="p-2">{r.reason ?? "—"}</td>
            <td className="p-2">{(r.before || r.after) ? <details><summary className="cursor-pointer text-verde-700">Ver</summary>
              <pre className="text-xs bg-neutral-50 p-2 rounded max-w-md overflow-x-auto">{JSON.stringify({ antes: r.before, depois: r.after }, null, 1)}</pre></details> : "—"}</td></tr>))}
          {!rows.length && <tr><td colSpan={6} className="p-4 text-neutral-500">Nenhum registro.</td></tr>}</tbody></table></div>
      <div className="flex items-center gap-3 text-sm">{page > 1 && <Link className={btn2Cls} href={href(page - 1)}>Anterior</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link className={btn2Cls} href={href(page + 1)}>Próxima</Link>}</div>
    </div>
  );
}
