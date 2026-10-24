-- Máquinas de intubação + foto do recibo. Somente ADICIONA (valores de enum e tabelas novas). NÃO aplicado automaticamente.
ALTER TYPE "StockOperation" ADD VALUE 'MAQUINA_INTUBACAO';
ALTER TYPE "FlowmeterOperation" ADD VALUE 'MAQUINA';
CREATE TYPE "MachineItemKind" AS ENUM ('CILINDRO_P', 'CILINDRO_M', 'CILINDRO_G', 'FLUXOMETRO', 'FLUXOMETRO_INTUBACAO');
CREATE TYPE "MachineOperation" AS ENUM ('ENTRADA', 'RETIRADA', 'TRANSFERENCIA', 'DEVOLUCAO', 'AJUSTE');

CREATE TABLE "ReceiptPhoto" (
  "id" TEXT NOT NULL, "movementId" TEXT NOT NULL, "url" TEXT NOT NULL, "pathname" TEXT NOT NULL, "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL, "uploadedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptPhoto_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Machine" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT, "locationId" TEXT NOT NULL, "notes" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MachineItem" (
  "machineId" TEXT NOT NULL, "kind" "MachineItemKind" NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MachineItem_pkey" PRIMARY KEY ("machineId", "kind")
);
CREATE TABLE "MachineMovement" (
  "id" TEXT NOT NULL, "machineId" TEXT NOT NULL, "toMachineId" TEXT, "operation" "MachineOperation" NOT NULL, "kind" "MachineItemKind" NOT NULL,
  "quantity" INTEGER NOT NULL, "delta" INTEGER NOT NULL, "detail" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "responsibleName" TEXT NOT NULL,
  "notes" TEXT, "requestKey" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MachineMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceiptPhoto_movementId_key" ON "ReceiptPhoto"("movementId");
CREATE UNIQUE INDEX "Machine_code_key" ON "Machine"("code");
CREATE UNIQUE INDEX "MachineMovement_requestKey_key" ON "MachineMovement"("requestKey");
CREATE INDEX "MachineMovement_machineId_occurredAt_idx" ON "MachineMovement"("machineId", "occurredAt");
CREATE INDEX "MachineMovement_toMachineId_idx" ON "MachineMovement"("toMachineId");

ALTER TABLE "ReceiptPhoto" ADD CONSTRAINT "ReceiptPhoto_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineItem" ADD CONSTRAINT "MachineItem_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMovement" ADD CONSTRAINT "MachineMovement_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMovement" ADD CONSTRAINT "MachineMovement_toMachineId_fkey" FOREIGN KEY ("toMachineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
