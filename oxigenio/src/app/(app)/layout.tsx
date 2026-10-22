import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, logout } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  async function sair() { "use server"; await logout(); redirect("/login"); }
  const menu: [string, string][] = [
    ["/dashboard", "Painel"], ["/cilindros", "Cilindros"], ["/abastecimentos", "Abastecimento"], ["/trocas", "Trocas com fornecedores"],
    ["/domicilio", "Entregas e recolhimentos"], ["/pacientes", "Pacientes"], ["/fluxometros", "Fluxômetros"], ["/relatorios", "Relatórios"],
    ...(user.role !== "CONSULTA" ? [["/auditoria", "Auditoria"] as [string, string]] : []),
    ...(user.role === "ADMIN" ? [["/usuarios", "Usuários"], ["/configuracoes", "Configurações"]] as [string, string][] : []),
  ];
  return (
    <div className="md:flex min-h-screen">
      <aside className="md:w-60 bg-white border-r p-4 space-y-4">
        <img src="/brand/logo.jpeg" alt="Hospital Municipal de Santaluz" className="w-full" />
        <nav className="flex md:flex-col gap-1 overflow-x-auto text-sm">
          {menu.map(([href, label]) => <Link key={href} href={href} className="px-3 py-2 rounded-lg whitespace-nowrap hover:bg-verde-50 hover:text-verde-700">{label}</Link>)}
        </nav>
        <form action={sair} className="text-sm"><p className="text-neutral-500">{user.name} · {user.role}</p>
          <button className="mt-1 text-laranja-600 underline">Encerrar sessão</button></form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
