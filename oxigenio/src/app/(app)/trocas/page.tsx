import { requireUser } from "@/lib/auth";
export default async function P() { await requireUser(); return <div><h1 className="text-2xl font-semibold">Trocas</h1><p className="text-neutral-500 mt-2">Disponível nas próximas etapas.</p></div>; }
