-- Simplificação do estoque: ajuste direto de quantidades e local "Enfermarias".
-- Somente ADICIONA valores a enums existentes. Não altera nem apaga dados. NÃO aplicado automaticamente.
ALTER TYPE "StockOperation" ADD VALUE 'AJUSTE_ESTOQUE';
ALTER TYPE "FlowmeterLocation" ADD VALUE 'ENFERMARIAS';
ALTER TYPE "FlowmeterOperation" ADD VALUE 'AJUSTE';
