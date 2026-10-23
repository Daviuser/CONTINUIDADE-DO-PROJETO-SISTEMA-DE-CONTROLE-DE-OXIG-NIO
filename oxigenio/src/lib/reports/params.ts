import { z } from "zod";

export const REPORT_IDS = ["abastecimento", "domiciliar", "trocas", "inventario", "fluxometros", "movimentacoes", "consolidado"] as const;
export type ReportId = (typeof REPORT_IDS)[number];

export const REPORT_TYPES: { id: ReportId; label: string; desc: string; icon: string; personal: boolean }[] = [
  { id: "abastecimento", label: "Controle de abastecimento", desc: "Recebimentos de cilindros cheios por data, fornecedor e categoria (P/M/G).", icon: "box", personal: false },
  { id: "domiciliar", label: "Entregas e recolhimentos domiciliares", desc: "Por paciente, com coluna de assinatura. Contém dados pessoais.", icon: "swap", personal: true },
  { id: "trocas", label: "Trocas com fornecedores", desc: "Vazios enviados, cheios recebidos e pendências por fornecedor.", icon: "truck", personal: false },
  { id: "inventario", label: "Inventário geral de oxigênio", desc: "Cilindros por categoria e local, e fluxômetros. Posição na data de emissão.", icon: "cylinder", personal: false },
  { id: "fluxometros", label: "Controle de fluxômetros", desc: "Totais no hospital e em domicílio e movimentações do período.", icon: "gauge", personal: false },
  { id: "movimentacoes", label: "Histórico de movimentações", desc: "Todas as movimentações de cilindros e fluxômetros no período.", icon: "chart", personal: false },
  { id: "consolidado", label: "Consolidado do período", desc: "Posição do estoque, resumo por operação e pendências.", icon: "building", personal: false },
];

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").refine(v => !Number.isNaN(Date.parse(v)), "Data inválida.").optional());
const text = (n = 80) => z.preprocess(blank, z.string().trim().max(n).optional());

export const paramsSchema = z.object({
  type: z.enum(REPORT_IDS, { errorMap: () => ({ message: "Selecione o tipo de relatório." }) }),
  from: date, to: date,
  size: z.preprocess(blank, z.enum(["P", "M", "G"]).optional()),
  responsible: text(), supplier: text(), bairro: text(), povoado: text(),
  patient: z.preprocess(blank, z.string().max(40).optional()),
}).refine(p => !p.from || !p.to || p.from <= p.to, { message: "A data inicial não pode ser posterior à data final.", path: ["from"] });

export type ReportParams = z.infer<typeof paramsSchema>;

export function toQuery(p: ReportParams, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, String(v));
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}
