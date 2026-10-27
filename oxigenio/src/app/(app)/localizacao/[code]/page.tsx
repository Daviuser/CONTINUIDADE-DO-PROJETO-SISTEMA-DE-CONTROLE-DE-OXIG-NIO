import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureInternalLocations } from "@/lib/stock";
import { Flash } from "../../_components/MoveForm";
import { LocationMoveForm } from "../../_components/LocationMoveForm";
import { Icon } from "@/components/Icon";
import { Stat } from "@/components/ui/Stat";
import { inputCls, btnCls } from "@/lib/ui";
import { fmtDate, fmtDateTime, parseDate, okDate, todayStr } from "@/lib/format";
import { ALL_INTERNAL_LOCATIONS, INTERNAL_CODES, LEGACY_CODES, LOC_LABEL, COND_LABEL, OP_LABEL, LOCAL_FLOW_OP_LABEL, FM_KIND_LABEL, SIZE_LABEL, SIZES, MACHINE_KINDS, MACHINE_KIND_SHORT } from "@/lib/labels";
import { registerLocationCylinderMove, registerLocationFlowmeterMove } from "../actions";

export const dynamic = "force-dynamic";
type Row = { at: Date; created: Date; kind: string; op: string; item: string; qty: number; route: string; who: string; notes: string };

export default async function LocalDetalhe({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(); const { code } = await params; const sp = await searchParams; const w = user.role !== "CONSULTA";
  if (!INTERNAL_CODES.includes(code)) notFound();
  const name = ALL_INTERNAL_LOCATIONS.find(l => l.code === code)!.name;
  let loc = await db.location.findUnique({ where: { code } });
  if (!loc) { await ensureInternalLocations(db); loc = await db.location.findUnique({ where: { code } }); }
  if (!loc) notFound();
  const id = loc.id;
  const dateWhere = (okDate(sp.from) || okDate(sp.to)) ? { occurredAt: { ...(okDate(sp.from) ? { gte: parseDate(sp.from!) } : {}), ...(okDate(sp.to) ? { lte: parseDate(sp.to!) } : {}) } } : {};
  const ends = { OR: [{ fromLocationId: id }, { toLocationId: id }] };
  const [bal, fs, machines, sm, fl, rel] = await Promise.all([
    db.stockBalance.findMany({ where: { locationId: id }, include: { cylinderType: { select: { size: true } } } }),
    db.flowmeterStock.findMany({ where: { locationId: id } }),
    db.machine.findMany({ where: { locationId: id }, orderBy: { name: "asc" }, include: { items: true } }),
    db.stockMovement.findMany({ where: { ...ends, ...dateWhere }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100, include: { cylinderType: true, fromLocation: true, toLocation: true } }),
    db.flowmeterLocationMovement.findMany({ where: { ...ends, ...dateWhere }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100, include: { fromLocation: true, toLocation: true } }),
    db.machineRelocation.findMany({ where: { ...ends, ...dateWhere }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100, include: { machine: { select: { name: true } }, fromLocation: true, toLocation: true } }),
  ]);
  const lab = (l?: { code: string } | null, fallback = "Estoque central") => (l ? (l.code === "HOSPITAL" ? "Estoque central" : LOC_LABEL[l.code] ?? l.code) : fallback);
  const q = (size: string, cond: string) => bal.filter(b => b.cylinderType.size === size && b.condition === cond).reduce((a, b) => a + b.quantity, 0);
  const cylTotal = bal.reduce((a, b) => a + b.quantity, 0);
  const fq = (k: string) => fs.find(f => f.kind === k)?.quantity ?? 0;
  const history: Row[] = [
    ...sm.map(m => ({ at: m.occurredAt, created: m.createdAt, kind: "Cilindros", op: OP_LABEL[m.operation] + (m.reversalOfId ? " (estorno)" : ""), item: `${SIZE_LABEL[m.cylinderType.size]}`, qty: m.quantity,
      route: `${lab(m.fromLocation, "—")}${m.fromCondition ? ` (${COND_LABEL[m.fromCondition].toLowerCase()})` : ""} → ${lab(m.toLocation, "—")}${m.toCondition ? ` (${COND_LABEL[m.toCondition].toLowerCase()})` : ""}`, who: m.responsibleName, notes: m.status === "ESTORNADA" ? "Estornada" : (m.notes ?? "") })),
    ...fl.map(m => ({ at: m.occurredAt, created: m.createdAt, kind: "Fluxômetros", op: LOCAL_FLOW_OP_LABEL[m.operation], item: FM_KIND_LABEL[m.kind], qty: m.quantity,
      route: `${lab(m.fromLocation, m.operation === "ENTRADA_NOVA" ? "Entrada nova" : "Estoque central")} → ${lab(m.toLocation, m.operation === "RETIRADA" ? "Baixa" : "Estoque central")}`, who: m.responsibleName, notes: m.notes ?? "" })),
    ...rel.map(m => ({ at: m.occurredAt, created: m.createdAt, kind: "Máquina", op: "Mudança de local", item: m.machine.name, qty: 1, route: `${lab(m.fromLocation)} → ${lab(m.toLocation)}`, who: m.responsibleName, notes: m.notes ?? "" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime() || b.created.getTime() - a.created.getTime()).slice(0, 100);
  const others = ALL_INTERNAL_LOCATIONS.filter(l => l.code !== code).map(l => ({ code: l.code as string, name: l.name as string }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1>{name}</h1><p className="mt-1 text-sm text-slate-500">Cilindros, fluxômetros e máquinas de intubação que estão neste local.</p></div>
        <Link href="/localizacao" className="btn btn-secondary"><Icon name="arrowLeft" className="h-4 w-4" />Todos os locais</Link>
      </div>
      <Flash erro={sp.erro} ok={sp.ok} />
      {LEGACY_CODES.includes(code) && <div className="alert alert-error" role="note"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /><span>Este local guarda o <b>saldo anterior</b> de “Emergência e Estabilização”. Distribua-o usando <b>Transferir para outro local</b> (cilindros e fluxômetros) e, para máquinas, altere o local no cadastro. Ele não recebe novas entradas.</span></div>}
      <section className="space-y-3" aria-labelledby="h-cil">
        <h2 id="h-cil" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cilindros por tamanho e condição</h2>
        <div className="card"><table>
          <thead><tr><th>Tamanho</th><th className="num">Cheios</th><th className="num">Vazios</th><th className="num">Indisponíveis</th><th className="num">Total</th></tr></thead>
          <tbody>{SIZES.map(s => <tr key={s}><td className="font-medium">{SIZE_LABEL[s]}</td><td className="num">{q(s, "CHEIO")}</td><td className="num">{q(s, "VAZIO")}</td><td className="num">{q(s, "INDISPONIVEL")}</td><td className="num font-semibold">{["CHEIO", "VAZIO", "INDISPONIVEL"].reduce((a, c) => a + q(s, c), 0)}</td></tr>)}
            <tr className="bg-[#f7faf8] font-semibold"><td>Total</td><td className="num">{bal.filter(b => b.condition === "CHEIO").reduce((a, b) => a + b.quantity, 0)}</td><td className="num">{bal.filter(b => b.condition === "VAZIO").reduce((a, b) => a + b.quantity, 0)}</td><td className="num">{bal.filter(b => b.condition === "INDISPONIVEL").reduce((a, b) => a + b.quantity, 0)}</td><td className="num">{cylTotal}</td></tr></tbody></table></div>
      </section>
      <section className="space-y-3" aria-labelledby="h-fl">
        <h2 id="h-fl" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fluxômetros por tipo</h2>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label={FM_KIND_LABEL.COMUM} value={fq("COMUM")} icon="gauge" /><Stat label={FM_KIND_LABEL.INTUBACAO} value={fq("INTUBACAO")} icon="gauge" tone="neutral" />
          <Stat label="Máquinas de intubação aqui" value={machines.length} icon="activity" />
        </div>
      </section>
      <section className="space-y-3"><h2>Máquinas de intubação neste local</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {machines.map(m => {
            const chips = MACHINE_KINDS.map(k => [k, m.items.find(i => i.kind === k)?.quantity ?? 0] as const).filter(([, n]) => n > 0);
            return (
              <Link key={m.id} href={`/maquinas/${m.id}`} className="card block p-4 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2"><p className="font-display font-bold">{m.name}</p><span className={"badge " + (m.active ? "badge-ok" : "badge-muted")}>{m.active ? "Ativa" : "Inativa"}</span></div>
                <p className="text-xs text-slate-500">{m.code ? `Ident.: ${m.code}` : "Sem identificação"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{chips.map(([k, n]) => <span key={k} className="badge badge-muted">{MACHINE_KIND_SHORT[k]}: {n}</span>)}{!chips.length && <span className="text-xs text-slate-400">Sem itens associados</span>}</div>
              </Link>);
          })}
          {!machines.length && <p className="card empty-state md:col-span-2">Nenhuma máquina de intubação neste local.</p>}
        </div>
      </section>
      {w && <LocationMoveForm mode="cyl" code={code} others={others} action={registerLocationCylinderMove} requestKey={randomUUID()} userName={user.name} today={todayStr()} />}
      {w && <LocationMoveForm mode="flow" code={code} others={others} action={registerLocationFlowmeterMove} requestKey={randomUUID()} userName={user.name} today={todayStr()} />}
      <section className="space-y-3"><h2>Histórico deste local</h2>
        <form className="card filters flex flex-wrap items-end gap-2 p-3 text-sm"><label>De<input type="date" name="from" defaultValue={sp.from} className={inputCls} /></label><label>Até<input type="date" name="to" defaultValue={sp.to} className={inputCls} /></label><button className={btnCls}>Filtrar</button></form>
        <div className="card"><table>
          <thead><tr>{["Data", "Registro", "Operação", "Item", "Qtd.", "De → Para", "Responsável", "Observações"].map((h, i) => <th key={h} className={i === 4 ? "num" : ""}>{h}</th>)}</tr></thead>
          <tbody>{history.map((r, i) => (
            <tr key={i}><td className="whitespace-nowrap">{fmtDate(r.at)}</td><td>{r.kind}</td><td>{r.op}</td><td>{r.item}</td><td className="num">{r.qty}</td><td>{r.route}</td>
              <td>{r.who}<div className="text-xs text-slate-400">{fmtDateTime(r.created)}</div></td><td className="text-slate-600">{r.notes || "—"}</td></tr>))}
            {!history.length && <tr><td colSpan={8} className="empty-state">Nenhuma movimentação neste local{sp.from || sp.to ? " no período" : ""}.</td></tr>}</tbody></table></div>
      </section>
    </>
  );
}
