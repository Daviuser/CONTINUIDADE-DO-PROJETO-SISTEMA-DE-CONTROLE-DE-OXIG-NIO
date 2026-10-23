import { requireWriter } from "@/lib/perm";
import { PatientForm } from "../PatientForm";
export default async function Novo({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireWriter();
  const { erro } = await searchParams;
  return (<div className="space-y-4 max-w-3xl"><h1>Novo paciente</h1>
    {erro && <p role="alert" className="alert alert-error">{erro}</p>}
    <PatientForm /></div>);
}
