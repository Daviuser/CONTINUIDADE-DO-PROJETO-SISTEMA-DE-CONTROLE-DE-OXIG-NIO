export const SIZES = ["P", "M", "G"] as const;
export const SIZE_LABEL: Record<string, string> = { P: "Pequeno (P)", M: "Médio (M)", G: "Grande (G)" };
export const COND_LABEL: Record<string, string> = { CHEIO: "Cheio", VAZIO: "Vazio", INDISPONIVEL: "Indisponível" };
export const LOC_LABEL: Record<string, string> = { HOSPITAL: "Hospital", DOMICILIO: "Domicílio", TRANSPORTE: "Com o fornecedor", ENFERMARIAS: "Enfermarias" };
export const OP_LABEL: Record<string, string> = {
  ENTRADA_INICIAL: "Cadastro de quantidade", ABASTECIMENTO: "Abastecimento (recebimento)",
  ENTREGA_DOMICILIAR: "Entrega domiciliar", RECOLHIMENTO_DOMICILIAR: "Recolhimento domiciliar",
  ENVIO_FORNECEDOR: "Envio de vazios ao fornecedor", RETORNO_FORNECEDOR: "Retorno de cheios do fornecedor",
  BAIXA_INDISPONIVEL: "Marcado indisponível", RETORNO_DISPONIVEL: "Voltou a ficar disponível", AJUSTE_ESTOQUE: "Ajuste de estoque", MAQUINA_INTUBACAO: "Máquina de intubação", SAIDA_LOCAL: "Saída para o local", DEVOLUCAO_LOCAL: "Devolução ao estoque central", TRANSFERENCIA_LOCAL: "Transferência entre locais",
};
export const FM_LOC_LABEL: Record<string, string> = { HOSPITAL: "Hospital", DOMICILIO: "Domicílio", ENFERMARIAS: "Enfermarias" };
export const FM_OP_LABEL: Record<string, string> = { ENTRADA: "Entrada / cadastro", ENVIO_DOMICILIO: "Hospital → Domicílio", RETORNO_DOMICILIO: "Domicílio → Hospital", BAIXA: "Baixa", AJUSTE: "Ajuste de estoque", MAQUINA: "Máquina de intubação", LOCAL: "Movimentação por local" };

export const MACHINE_KINDS = ["CILINDRO_P", "CILINDRO_M", "CILINDRO_G", "FLUXOMETRO", "FLUXOMETRO_INTUBACAO"] as const;
export const MACHINE_KIND_LABEL: Record<string, string> = { CILINDRO_P: "Cilindro pequeno (P)", CILINDRO_M: "Cilindro médio (M)", CILINDRO_G: "Cilindro grande (G)", FLUXOMETRO: "Fluxômetro", FLUXOMETRO_INTUBACAO: "Fluxômetro de intubação" };
export const MACHINE_KIND_SHORT: Record<string, string> = { CILINDRO_P: "Cil. P", CILINDRO_M: "Cil. M", CILINDRO_G: "Cil. G", FLUXOMETRO: "Fluxômetro", FLUXOMETRO_INTUBACAO: "Fluxôm. intubação" };
export const MACHINE_OP_LABEL: Record<string, string> = { ENTRADA: "Entrada", DEVOLUCAO: "Devolução ao estoque do hospital", TRANSFERENCIA: "Transferência para outra máquina", RETIRADA: "Retirada (baixa)", AJUSTE: "Ajuste de quantidade" };

// Os locais internos internos (usam a tabela Location; o código é único, então nunca duplicam)
export const INTERNAL_LOCATIONS = [
  { code: "ENFERMARIA_1", name: "Enfermaria 1" }, { code: "ENFERMARIA_2", name: "Enfermaria 2" }, { code: "ENFERMARIA_3", name: "Enfermaria 3" },
  { code: "ENFERMARIA_4", name: "Enfermaria 4" }, { code: "ENFERMARIA_5", name: "Enfermaria 5" }, { code: "ENFERMARIA_6", name: "Enfermaria 6" },
  { code: "ENFERMARIA_7", name: "Enfermaria 7" }, { code: "ISOLAMENTO", name: "Isolamento" }, { code: "PEDIATRIA", name: "Pediatria" },
  { code: "ALOJ_CONJUNTO", name: "Alojamento Conjunto" }, { code: "ALOJ_CIRURGICO", name: "Alojamento Cirúrgico" }, { code: "SALA_PARTO", name: "Sala de Parto" }, { code: "SALA_AO_LADO_PARTO", name: "Sala ao lado da Sala de Parto" },
  { code: "PRE_PARTO", name: "Pré-Parto" }, { code: "SALA_INTUBACAO_BEBE", name: "Sala de Intubação de Bebê" }, { code: "EMERGENCIA", name: "Emergência" }, { code: "ESTABILIZACAO", name: "Estabilização" },
] as const;
// Local antigo "Emergência e Estabilização": a linha existente (mesmo id) guarda o saldo anterior até ele ser transferido
// para Emergência e Estabilização. Continua válido para consultas e transferências de SAÍDA, mas não recebe novas entradas.
export const LEGACY_LOCATIONS = [{ code: "EMERGENCIA_ESTAB_ANTERIOR", name: "Emergência e Estabilização (saldo anterior)" }] as const;
export const ALL_INTERNAL_LOCATIONS: { code: string; name: string }[] = [...INTERNAL_LOCATIONS, ...LEGACY_LOCATIONS];
export const LEGACY_CODES: string[] = LEGACY_LOCATIONS.map(l => l.code);
export const LEGACY_MSG = "O local \"Emergência e Estabilização (saldo anterior)\" só serve para transferir o saldo antigo para Emergência ou Estabilização; não recebe novas entradas.";
export const INTERNAL_CODES: string[] = ALL_INTERNAL_LOCATIONS.map(l => l.code); // todos os códigos válidos (inclui o antigo)
Object.assign(LOC_LABEL, Object.fromEntries(ALL_INTERNAL_LOCATIONS.map(l => [l.code, l.name])));
// Onde uma máquina pode ficar: locais já usados antes + os 15
export const MACHINE_LOCATIONS: { code: string; name: string }[] = [{ code: "HOSPITAL", name: "Hospital (geral)" }, { code: "ENFERMARIAS", name: "Enfermarias (geral)" }, ...ALL_INTERNAL_LOCATIONS];
export const FM_KIND_LABEL: Record<string, string> = { COMUM: "Fluxômetro comum", INTUBACAO: "Fluxômetro de intubação" };
export const LOCAL_FLOW_OP_LABEL: Record<string, string> = { SAIDA_CENTRAL: "Recebido do estoque central", DEVOLUCAO_CENTRAL: "Devolvido ao estoque central", TRANSFERENCIA: "Transferência entre locais", ENTRADA_NOVA: "Entrada nova", RETIRADA: "Retirada (baixa)" };
