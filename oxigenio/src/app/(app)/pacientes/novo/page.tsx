import { requireWriter } from "@/lib/perm";
import { PatientForm } from "../PatientForm";
export default async function Novo({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireWriter();
  const { erro } = await searchParams;
  return (<div className="space-y-4 max-w-3xl"><h1 className="text-2xl font-semibold">Novo paciente</h1>
    {erro && <p role="alert" className="bg-red-50 text-red-700 rounded p-2 text-sm">{erro}</p>}
    <PatientForm /></div>);
}
