-- FASE 3: estoque quantitativo. NÃO aplicado automaticamente.
-- Remove: Cylinder, Supply, HomeExchange, StockMovement/StockBalance antigos, Flowmeter e FlowmeterMovement antigos.
-- Preserva: contagem de fluxômetros em HOSPITAL e DOMICILIO (copiada para FlowmeterBalance).

BEGIN;

CREATE TYPE "StockCondition" AS ENUM ('CHEIO', 'VAZIO', 'INDISPONIVEL');
CREATE TYPE "StockOperation" AS ENUM ('ENTRADA_INICIAL','ABASTECIMENTO','ENTREGA_DOMICILIAR','RECOLHIMENTO_DOMICILIAR','ENVIO_FORNECEDOR','RETORNO_FORNECEDOR','BAIXA_INDISPONIVEL','RETORNO_DISPONIVEL');
CREATE TYPE "FlowmeterLocation" AS ENUM ('HOSPITAL', 'DOMICILIO');
CREATE TYPE "FlowmeterOperation" AS ENUM ('ENTRADA', 'ENVIO_DOMICILIO', 'RETORNO_DOMICILIO', 'BAIXA');

CREATE TABLE "FlowmeterBalance" (
  "location" "FlowmeterLocation" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FlowmeterBalance_pkey" PRIMARY KEY ("location")
);
INSERT INTO "FlowmeterBalance" ("location", "quantity")
SELECT 'HOSPITAL'::"FlowmeterLocation", COALESCE(SUM("quantity"), 0)::INTEGER FROM "Flowmeter" WHERE "state" = 'HOSPITAL'
UNION ALL
SELECT 'DOMICILIO'::"FlowmeterLocation", COALESCE(SUM("quantity"), 0)::INTEGER FROM "Flowmeter" WHERE "state" = 'DOMICILIO';

DROP TABLE "FlowmeterMovement";
DROP TABLE "Flowmeter";
DROP TABLE "StockMovement";
DROP TABLE "Cylinder";
DROP TABLE "StockBalance";
DROP TABLE "Supply";
DROP TABLE "HomeExchange";
DROP TYPE "FlowmeterState";
DROP TYPE "MovementKind";
DROP TYPE "CylinderStatus";

CREATE TABLE "StockBalance" (
  "locationId" TEXT NOT NULL,
  "cylinderTypeId" TEXT NOT NULL,
  "condition" "StockCondition" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("locationId","cylinderTypeId","condition")
);

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "operation" "StockOperation" NOT NULL,
  "status" "MovementStatus" NOT NULL DEFAULT 'CONFIRMADA',
  "cylinderTypeId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "fromLocationId" TEXT,
  "fromCondition" "StockCondition",
  "toLocationId" TEXT,
  "toCondition" "StockCondition",
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "supplier" TEXT,
  "patientId" TEXT,
  "responsibleName" TEXT NOT NULL,
  "notes" TEXT,
  "requestKey" TEXT,
  "reversalOfId" TEXT,
  "reversalReason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlowmeterMovement" (
  "id" TEXT NOT NULL,
  "operation" "FlowmeterOperation" NOT NULL,
  "status" "MovementStatus" NOT NULL DEFAULT 'CONFIRMADA',
  "quantity" INTEGER NOT NULL,
  "fromLocation" "FlowmeterLocation",
  "toLocation" "FlowmeterLocation",
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "responsibleName" TEXT NOT NULL,
  "notes" TEXT,
  "requestKey" TEXT,
  "reversalOfId" TEXT,
  "reversalReason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowmeterMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockMovement_requestKey_key" ON "StockMovement"("requestKey");
CREATE UNIQUE INDEX "StockMovement_reversalOfId_key" ON "StockMovement"("reversalOfId");
CREATE INDEX "StockMovement_operation_occurredAt_idx" ON "StockMovement"("operation", "occurredAt");
CREATE INDEX "StockMovement_patientId_occurredAt_idx" ON "StockMovement"("patientId", "occurredAt");
CREATE UNIQUE INDEX "FlowmeterMovement_requestKey_key" ON "FlowmeterMovement"("requestKey");
CREATE UNIQUE INDEX "FlowmeterMovement_reversalOfId_key" ON "FlowmeterMovement"("reversalOfId");
CREATE INDEX "FlowmeterMovement_occurredAt_idx" ON "FlowmeterMovement"("occurredAt");

ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "CylinderType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "CylinderType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
