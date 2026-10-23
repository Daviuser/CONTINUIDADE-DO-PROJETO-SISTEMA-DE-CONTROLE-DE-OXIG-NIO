import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/Icon";

async function entrar(formData: FormData) {
  "use server";
  const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!p.success) redirect("/login?erro=1");
  const r = await login(p.data.email, p.data.password);
  if (!r.ok) redirect("/login?erro=" + encodeURIComponent(r.error));
  redirect("/dashboard");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Bem-vindo(a)!</h1>
      <p className="mt-2 text-slate-500">Acesse o sistema para continuar.</p>
      <div className="mt-4 h-1 w-10 rounded bg-verde-600" />
      {erro && <div role="alert" className="alert alert-error mt-6"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /><span>{erro === "1" ? "Preencha um e-mail válido e a senha." : erro}</span></div>}
      <form action={entrar} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm">E-mail de acesso</label>
          <div className="relative mt-1.5">
            <Icon name="user" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input id="email" name="email" type="email" required autoComplete="username" placeholder="nome@exemplo.com" className="min-h-12 w-full pl-11" />
          </div>
        </div>
        <PasswordField />
        <SubmitButton icon="login" pendingText="Entrando…" className="btn btn-primary min-h-12 w-full text-base">Entrar</SubmitButton>
      </form>
      <Link href="/recuperar-senha" className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-verde-700"><Icon name="help" className="h-4 w-4" />Esqueceu sua senha?</Link>
      <p className="mt-8 border-t pt-4 text-center text-xs text-slate-400">Acesso restrito a funcionários autorizados do Hospital Municipal de Santaluz.</p>
    </AuthShell>
  );
}
