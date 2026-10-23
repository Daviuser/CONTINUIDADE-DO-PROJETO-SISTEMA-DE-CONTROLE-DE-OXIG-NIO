"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWriter } from "@/lib/perm";
import { setCylinderStock, StockError } from "@/lib/stock";

const SIZES = ["P", "M", "G"] as const;
const FIELDS = ["total", "vazios", "dom", "enf", "indisp"] as const;
const n = z.coerce.number({ invalid_type_error: "Use apenas números." }).int("Use apenas números inteiros.").min(0, "Não use números negativos.").max(1000000);
const shape: Record<string, z.ZodTypeAny> = { requestKey: z.string().max(80).optional() };
for (const s of SIZES) for (const f of FIELDS) shape[`${f}_${s}`] = n;
const schema = z.object(shape);

export async function saveCylinderStock(fd: FormData) {
  const user = await requireWriter();
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return redirect(`/cilindros?erro=${encodeURIComponent(p.error.issues[0].message)}`);
  const d = p.data as Record<string, number | string | undefined>;
  const targets = SIZES.map(size => ({ size, total: Number(d[`total_${size}`]), vazios: Number(d[`vazios_${size}`]), dom: Number(d[`dom_${size}`]), enf: Number(d[`enf_${size}`]), indisp: Number(d[`indisp_${size}`]) }));
  let msg: string | null = null; let ok = "estoque";
  try {
    const r = await setCylinderStock(targets, { userId: user.id, userName: user.name }, d.requestKey ? String(d.requestKey) : undefined);
    if (r.duplicate) ok = "dup"; else if (r.changed === 0) ok = "nenhuma";
  } catch (e) { if (e instanceof StockError) msg = e.message; else throw e; }
  redirect(msg ? `/cilindros?erro=${encodeURIComponent(msg)}` : `/cilindros?ok=${ok}`);
}
