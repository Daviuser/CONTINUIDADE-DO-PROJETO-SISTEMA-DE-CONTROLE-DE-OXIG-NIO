import { redirect } from "next/navigation";
import { requireUser, logout } from "@/lib/auth";
import { AppShell, type NavGroup } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  async function sair() { "use server"; await logout(); redirect("/login"); }
  const groups: NavGroup[] = [
    { title: "Visão geral", items: [{ href: "/dashboard", label: "Painel", icon: "home" }] },
    { title: "Estoque", items: [
      { href: "/cilindros", label: "Cilindros", icon: "cylinder" },
      { href: "/abastecimentos", label: "Abastecimento", icon: "box" },
      { href: "/trocas", label: "Trocas com fornecedores", icon: "truck" },
      { href: "/fluxometros", label: "Fluxômetros", icon: "gauge" },
      { href: "/maquinas", label: "Máquinas de intubação", icon: "activity" } ] },
    { title: "Atendimento", items: [
      { href: "/domicilio", label: "Entregas e recolhimentos", icon: "swap" },
      { href: "/pacientes", label: "Pacientes", icon: "users" } ] },
    { title: "Gestão", items: [
      { href: "/relatorios", label: "Relatórios", icon: "chart" },
      ...(user.role !== "CONSULTA" ? [{ href: "/auditoria", label: "Auditoria", icon: "shield" }] : []),
      ...(user.role === "ADMIN" ? [{ href: "/usuarios", label: "Usuários", icon: "user" }, { href: "/configuracoes", label: "Configurações", icon: "settings" }] : []) ] },
  ];
  const today = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  return <AppShell user={{ name: user.name, role: user.role }} groups={groups} today={today} logoutAction={sair}>{children}</AppShell>;
}
