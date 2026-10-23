import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Icon } from "@/components/Icon";

export default function RecuperarSenha() {
  return (
    <AuthShell>
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-verde-50 text-verde-700"><Icon name="lock" className="h-6 w-6" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">Recuperar acesso</h1>
      <div className="mt-3 h-1 w-10 rounded bg-verde-600" />
      <p className="mt-5 text-slate-600">Por segurança, a senha é redefinida pelo <b>administrador do sistema</b>.</p>
      <ol className="mt-4 space-y-2 text-sm text-slate-600">
        <li className="flex gap-2"><span className="font-bold text-verde-700">1.</span>Procure o administrador responsável pelo sistema no hospital.</li>
        <li className="flex gap-2"><span className="font-bold text-verde-700">2.</span>Ele definirá uma nova senha para o seu usuário.</li>
        <li className="flex gap-2"><span className="font-bold text-verde-700">3.</span>Use a nova senha para entrar.</li>
      </ol>
      <Link href="/login" className="btn btn-secondary mt-8 w-full"><Icon name="arrowLeft" className="h-4 w-4" />Voltar ao login</Link>
    </AuthShell>
  );
}
