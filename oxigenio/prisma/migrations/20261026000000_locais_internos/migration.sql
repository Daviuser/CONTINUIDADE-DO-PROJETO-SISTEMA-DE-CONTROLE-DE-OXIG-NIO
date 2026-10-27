-- 15 locais internos, fluxômetros por local e histórico de mudança de local das máquinas.
-- SOMENTE ADICIONA: não altera, move nem remove colunas, tabelas ou dados existentes. NÃO aplicado automaticamente.

ALTER TYPE "StockOperation" ADD VALUE 'SAIDA_LOCAL';
ALTER TYPE "StockOperation" ADD VALUE 'DEVOLUCAO_LOCAL';
ALTER TYPE "StockOperation" ADD VALUE 'TRANSFERENCIA_LOCAL';
ALTER TYPE "FlowmeterOperation" ADD VALUE 'LOCAL';
CREATE TYPE "FlowmeterKind" AS ENUM ('COMUM', 'INTUBACAO');
CREATE TYPE "LocalFlowOperation" AS ENUM ('SAIDA_CENTRAL', 'DEVOLUCAO_CENTRAL', 'TRANSFERENCIA', 'ENTRADA_NOVA', 'RETIRADA');

CREATE TABLE "FlowmeterStock" (
  "locationId" TEXT NOT NULL, "kind" "FlowmeterKind" NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FlowmeterStock_pkey" PRIMARY KEY ("locationId", "kind")
);
CREATE TABLE "FlowmeterLocationMovement" (
  "id" TEXT NOT NULL, "operation" "LocalFlowOperation" NOT NULL, "kind" "FlowmeterKind" NOT NULL, "quantity" INTEGER NOT NULL,
  "fromLocationId" TEXT, "toLocationId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "responsibleName" TEXT NOT NULL, "notes" TEXT,
  "requestKey" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowmeterLocationMovement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MachineRelocation" (
  "id" TEXT NOT NULL, "machineId" TEXT NOT NULL, "fromLocationId" TEXT NOT NULL, "toLocationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "responsibleName" TEXT NOT NULL, "notes" TEXT, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MachineRelocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlowmeterLocationMovement_requestKey_key" ON "FlowmeterLocationMovement"("requestKey");
CREATE INDEX "FlowmeterLocationMovement_occurredAt_idx" ON "FlowmeterLocationMovement"("occurredAt");
CREATE INDEX "FlowmeterLocationMovement_fromLocationId_idx" ON "FlowmeterLocationMovement"("fromLocationId");
CREATE INDEX "FlowmeterLocationMovement_toLocationId_idx" ON "FlowmeterLocationMovement"("toLocationId");
CREATE INDEX "MachineRelocation_machineId_idx" ON "MachineRelocation"("machineId");
CREATE INDEX "MachineRelocation_fromLocationId_idx" ON "MachineRelocation"("fromLocationId");
CREATE INDEX "MachineRelocation_toLocationId_idx" ON "MachineRelocation"("toLocationId");

ALTER TABLE "FlowmeterStock" ADD CONSTRAINT "FlowmeterStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowmeterLocationMovement" ADD CONSTRAINT "FlowmeterLocationMovement_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FlowmeterLocationMovement" ADD CONSTRAINT "FlowmeterLocationMovement_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MachineRelocation" ADD CONSTRAINT "MachineRelocation_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineRelocation" ADD CONSTRAINT "MachineRelocation_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineRelocation" ADD CONSTRAINT "MachineRelocation_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Os 15 locais entram na tabela "Location" já existente (sem duplicar: a coluna "code" é única).
INSERT INTO "Location" ("id", "code", "name")
SELECT gen_random_uuid()::text, v.code, v.name FROM (VALUES
  ('ENFERMARIA_1','Enfermaria 1'), ('ENFERMARIA_2','Enfermaria 2'), ('ENFERMARIA_3','Enfermaria 3'), ('ENFERMARIA_4','Enfermaria 4'),
  ('ENFERMARIA_5','Enfermaria 5'), ('ENFERMARIA_6','Enfermaria 6'), ('ENFERMARIA_7','Enfermaria 7'),
  ('ISOLAMENTO','Isolamento'), ('PEDIATRIA','Pediatria'), ('ALOJ_CONJUNTO','Alojamento Conjunto'), ('ALOJ_CIRURGICO','Alojamento Cirúrgico'),
  ('SALA_PARTO','Sala de Parto'), ('PRE_PARTO','Pré-Parto'), ('SALA_INTUBACAO_BEBE','Sala de Intubação de Bebê'), ('EMERGENCIA','Emergência e Estabilização')
) AS v(code, name)
ON CONFLICT ("code") DO NOTHING;
