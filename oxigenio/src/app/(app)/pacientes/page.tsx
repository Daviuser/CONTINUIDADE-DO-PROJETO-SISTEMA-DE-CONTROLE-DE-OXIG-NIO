import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { fmtDate } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
const PAGE = 20;

export default async function Pacientes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.PatientWhereInput = {
    ...(sp.q && { fullName: { contains: sp.q, mode: "insensitive" } }),
    ...(sp.bairro && { neighborhood: { contains: sp.bairro, mode: "insensitive" } }),
    ...(sp.povoado && { village: { contains: sp.povoado, mode: "insensitive" } }),
    ...(sp.status === "ATIVO" || sp.status === "INATIVO" ? { status: sp.status } : {}),
  };
  const [rows, total] = await Promise.all([
    db.patient.findMany({ where, orderBy: { fullName: "asc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.patient.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (n: number) => `/pacientes?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(n) })}`;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1>Pacientes em Uso de Oxigênio em Domicílio</h1>
        {user.role !== "CONSULTA" && <Link href="/pacientes/novo" className={btnCls}>Novo paciente</Link>}
      </div>
      <form className="grid md:grid-cols-5 gap-2 card p-3">
        <input name="q" defaultValue={sp.q} placeholder="Nome" className={inputCls} />
        <input name="bairro" defaultValue={sp.bairro} placeholder="Bairro" className={inputCls} />
        <input name="povoado" defaultValue={sp.povoado} placeholder="Povoado" className={inputCls} />
        <select name="status" defaultValue={sp.status ?? ""} className={inputCls}>
          <option value="">Todos</option><option value="ATIVO">Ativos</option><option value="INATIVO">Inativos</option></select>
        <button className={btnCls + " mt-1"}>Buscar</button>
      </form>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead><tr>{["Nome", "Bairro", "Povoado", "Cilindro", "Qtd.", "Início", "Situação"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(p => (
            <tr key={p.id} className="border-t hover:bg-neutral-50">
              <td><Link className="text-verde-700 underline" href={`/pacientes/${p.id}`}>{p.fullName}</Link></td>
              <td>{p.neighborhood ?? "—"}</td><td>{p.village ?? "—"}</td>
              <td>{p.cylinderSize ?? "—"}</td><td>{p.cylinderQty}</td>
              <td>{fmtDate(p.startDate)}</td>
              <td>{p.status === "ATIVO" ? "Ativo" : "Inativo"}</td></tr>))}
            {!rows.length && <tr><td colSpan={7} className="empty-state">Nenhum paciente encontrado.</td></tr>}
          </tbody></table></div>
      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className={btn2Cls} href={href(page - 1)}>Anterior</Link>}
        <span>Página {page} de {pages} · {total} registro(s)</span>
        {page < pages && <Link className={btn2Cls} href={href(page + 1)}>Próxima</Link>}</div>
    </div>
  );
}
