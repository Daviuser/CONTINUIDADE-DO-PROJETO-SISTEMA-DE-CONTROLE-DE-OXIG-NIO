export const SIZES = ["P", "M", "G"] as const;
export const SIZE_LABEL: Record<string, string> = { P: "Pequeno (P)", M: "Médio (M)", G: "Grande (G)" };
export const COND_LABEL: Record<string, string> = { CHEIO: "Cheio", VAZIO: "Vazio", INDISPONIVEL: "Indisponível" };
export const LOC_LABEL: Record<string, string> = { HOSPITAL: "Hospital", DOMICILIO: "Domicílio", TRANSPORTE: "Com o fornecedor", ENFERMARIAS: "Enfermarias" };
export const OP_LABEL: Record<string, string> = {
  ENTRADA_INICIAL: "Cadastro de quantidade", ABASTECIMENTO: "Abastecimento (recebimento)",
  ENTREGA_DOMICILIAR: "Entrega domiciliar", RECOLHIMENTO_DOMICILIAR: "Recolhimento domiciliar",
  ENVIO_FORNECEDOR: "Envio de vazios ao fornecedor", RETORNO_FORNECEDOR: "Retorno de cheios do fornecedor",
  BAIXA_INDISPONIVEL: "Marcado indisponível", RETORNO_DISPONIVEL: "Voltou a ficar disponível", AJUSTE_ESTOQUE: "Ajuste de estoque",
};
export const FM_LOC_LABEL: Record<string, string> = { HOSPITAL: "Hospital", DOMICILIO: "Domicílio", ENFERMARIAS: "Enfermarias" };
export const FM_OP_LABEL: Record<string, string> = { ENTRADA: "Entrada / cadastro", ENVIO_DOMICILIO: "Hospital → Domicílio", RETORNO_DOMICILIO: "Domicílio → Hospital", BAIXA: "Baixa", AJUSTE: "Ajuste de estoque" };
