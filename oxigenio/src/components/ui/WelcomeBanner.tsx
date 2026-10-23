"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export function WelcomeBanner({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    window.history.replaceState(null, "", "/dashboard"); // atualizar a página não repete a mensagem
    const t = setTimeout(() => setOpen(false), 9000);
    return () => clearTimeout(t);
  }, []);
  if (!open) return null;
  return (
    <div role="status" className="card flex items-center gap-3 border-l-4 !border-l-verde-600 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-verde-50 text-verde-700"><Icon name="heart" className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold leading-snug text-grafite-900">Olá, seja bem-vindo(a), {name}!</p>
        <p className="text-sm text-slate-500">Você entrou no sistema como {role}.</p>
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar mensagem" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="x" className="h-4 w-4" /></button>
    </div>
  );
}
