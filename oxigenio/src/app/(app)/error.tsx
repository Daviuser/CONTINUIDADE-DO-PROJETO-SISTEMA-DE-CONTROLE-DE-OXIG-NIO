"use client";
import { Icon } from "@/components/Icon";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-laranja-50 text-laranja-600"><Icon name="alert" className="h-6 w-6" /></span>
      <h1 className="mt-4 text-xl">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-slate-500">Ocorreu um erro inesperado. Tente novamente; se persistir, avise o administrador do sistema.</p>
      <button onClick={reset} className="btn btn-primary mt-5">Tentar novamente</button>
    </div>
  );
}
