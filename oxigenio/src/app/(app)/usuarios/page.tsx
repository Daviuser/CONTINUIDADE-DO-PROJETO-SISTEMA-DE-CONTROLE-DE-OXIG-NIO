import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/perm";
import { fmtDateTime } from "@/lib/format";
import { inputCls, btnCls, btn2Cls } from "@/lib/ui";
import { createUser, updateUser, resetPassword } from "./actions";

export const dynamic = "force-dynamic";
const R = { ADMIN: "Administrador", OPERADOR: "Operador", CONSULTA: "Consulta" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireAdmin(); const { erro, ok } = await searchParams;
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-5 max-w-4xl">
      <h1>Usuários</h1>
      {erro && <p role="alert" className="alert alert-error">{erro}</p>}
      {ok && <p className="alert alert-ok">Salvo com sucesso.</p>}
      <form action={createUser} className="card p-4 grid md:grid-cols-2 gap-3">
        <label className="text-sm">Nome *<input name="name" required className={inputCls} /></label>
        <label className="text-sm">E-mail *<input name="email" type="email" required className={inputCls} /></label>
        <label className="text-sm">Cargo / função<input name="jobTitle" className={inputCls} /></label>
        <label className="text-sm">Perfil *<select name="role" className={inputCls}>{Object.entries(R).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm">Senha inicial * (mín. 10 caracteres)<input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></label>
        <div className="flex items-end"><button className={btnCls}>Criar usuário</button></div>
      </form>
      <div className="space-y-2">{users.map(u => (
        <div key={u.id} className="card p-3 text-sm space-y-2">
          <p><b>{u.name}</b> · {u.email} {u.jobTitle && `· ${u.jobTitle}`} <span className="text-neutral-500">(criado em {fmtDateTime(u.createdAt)})</span></p>
          <form action={updateUser} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={u.id} />
            <select name="role" defaultValue={u.role} className="">{Object.entries(R).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={u.active} /> Ativo</label>
            <button className={btn2Cls}>Salvar</button></form>
          <form action={resetPassword} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={u.id} />
            <input name="password" type="password" minLength={10} required placeholder="Nova senha" autoComplete="new-password" className="" />
            <button className={btn2Cls}>Redefinir senha</button></form>
        </div>))}</div>
    </div>
  );
}
