"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { BrandLogo } from "@/components/BrandLogo";

export type NavGroup = { title: string; items: { href: string; label: string; icon: string }[] };
const ROLE: Record<string, string> = { ADMIN: "Administrador", OPERADOR: "Operador", CONSULTA: "Consulta" };

export function AppShell({ user, groups, today, logoutAction, children }: {
  user: { name: string; role: string }; groups: NavGroup[]; today: string; logoutAction: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);
  const initials = user.name.split(" ").filter(Boolean).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={"fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 " + (open ? "translate-x-0" : "-translate-x-full")}
        aria-label="Navegação principal">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <BrandLogo className="w-full max-w-[13.5rem]" />
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Fechar menu"><Icon name="x" /></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map(g => (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map(it => {
                  const active = path === it.href || path.startsWith(it.href + "/");
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={active ? "page" : undefined}
                        className={"group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " + (active ? "bg-verde-50 text-verde-800" : "text-slate-600 hover:bg-slate-50 hover:text-grafite-900")}>
                        {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-verde-600" aria-hidden="true" />}
                        <Icon name={it.icon} className={"h-[1.15rem] w-[1.15rem] " + (active ? "text-verde-700" : "text-slate-400 group-hover:text-slate-600")} />
                        {it.label}
                      </Link>
                    </li>);
                })}
              </ul>
            </div>))}
        </nav>
        <p className="border-t px-5 py-3 text-[0.7rem] text-slate-400">Hospital Municipal de Santaluz</p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-white/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu" aria-expanded={open}><Icon name="menu" /></button>
            <p className="hidden text-sm capitalize text-slate-500 sm:block">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-verde-100 text-xs font-bold text-verde-800" aria-hidden="true">{initials}</span>
              <div className="hidden leading-tight sm:block"><p className="text-sm font-semibold text-grafite-900">{user.name}</p><p className="text-xs text-slate-500">{ROLE[user.role] ?? user.role}</p></div>
            </div>
            <form action={logoutAction}><button className="btn btn-secondary !px-3 !py-1.5" title="Encerrar sessão"><Icon name="logout" className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></button></form>
          </div>
        </header>
        <main className="page-enter mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
