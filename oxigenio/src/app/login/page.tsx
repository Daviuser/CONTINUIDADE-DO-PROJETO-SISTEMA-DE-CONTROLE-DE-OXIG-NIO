import { redirect } from "next/navigation";
import { login } from "@/lib/auth";
import { z } from "zod";

async function entrar(formData: FormData) {
  "use server";
  const p = z.object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/login?erro=1");
  const r = await login(p.data.email, p.data.password);
  if (!r.ok) redirect("/login?erro=" + encodeURIComponent(r.error));
  redirect("/dashboard");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form action={entrar} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4 border-t-4 border-laranja-500">
        <img src="/brand/logo.jpeg" alt="Hospital Municipal de Santaluz" className="w-full" />
        <h1 className="text-lg font-semibold text-center">Sistema de Controle de Oxigênio</h1>
        {erro && <p role="alert" className="text-sm bg-red-50 text-red-700 rounded p-2">{erro === "1" ? "Preencha e-mail e senha." : erro}</p>}
        <label className="block text-sm">E-mail *
          <input name="email" type="email" required autoComplete="username" className="mt-1 w-full border rounded-lg p-2" /></label>
        <label className="block text-sm">Senha *
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full border rounded-lg p-2" /></label>
        <button className="w-full bg-verde-600 hover:bg-verde-700 text-white rounded-lg py-2 font-medium">Entrar</button>
      </form>
    </main>
  );
}
