-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERADOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "CylinderSize" AS ENUM ('P', 'M', 'G');

-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'ENVIO_TROCA', 'RETORNO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('RASCUNHO', 'CONFIRMADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "CylinderStatus" AS ENUM ('DISPONIVEL', 'EM_USO', 'EM_TROCA', 'MANUTENCAO', 'BAIXADO');

-- CreateEnum
CREATE TYPE "FlowmeterState" AS ENUM ('HOSPITAL', 'DOMICILIO', 'MANUTENCAO', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONSULTA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CylinderType" (
    "id" TEXT NOT NULL,
    "size" "CylinderSize" NOT NULL,
    "label" TEXT NOT NULL,
    "capacityLiters" DECIMAL(8,2),

    CONSTRAINT "CylinderType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "locationId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("locationId","cylinderTypeId")
);

-- CreateTable
CREATE TABLE "Cylinder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "CylinderStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "lastMovementAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Cylinder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "kind" "MovementKind" NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'RASCUNHO',
    "cylinderTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "cylinderId" TEXT,
    "supplyId" TEXT,
    "exchangeId" TEXT,
    "reversalOfId" TEXT,
    "negativeOverrideReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "supplyDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "emptiesSent" INTEGER NOT NULL DEFAULT 0,
    "receivedTotal" INTEGER NOT NULL DEFAULT 0,
    "oxygenType" TEXT,
    "qtyP" INTEGER NOT NULL DEFAULT 0,
    "qtyM" INTEGER NOT NULL DEFAULT 0,
    "qtyG" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "village" TEXT,
    "reference" TEXT,
    "cylinderSize" "CylinderSize",
    "cylinderQty" INTEGER NOT NULL DEFAULT 0,
    "flowLpm" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeExchange" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "exchangeDate" TIMESTAMP(3) NOT NULL,
    "cylinderSize" "CylinderSize" NOT NULL,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "collected" INTEGER NOT NULL DEFAULT 0,
    "flow" TEXT,
    "responsibleName" TEXT NOT NULL,
    "notes" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flowmeter" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "state" "FlowmeterState" NOT NULL DEFAULT 'HOSPITAL',
    "notes" TEXT,
    "lastCheck" TIMESTAMP(3),

    CONSTRAINT "Flowmeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowmeterMovement" (
    "id" TEXT NOT NULL,
    "flowmeterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromState" "FlowmeterState" NOT NULL,
    "toState" "FlowmeterState" NOT NULL,
    "patientId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowmeterMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedReport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CylinderType_size_key" ON "CylinderType"("size");

-- CreateIndex
CREATE UNIQUE INDEX "Cylinder_code_key" ON "Cylinder"("code");

-- CreateIndex
CREATE INDEX "Cylinder_locationId_idx" ON "Cylinder"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_reversalOfId_key" ON "StockMovement"("reversalOfId");

-- CreateIndex
CREATE INDEX "StockMovement_status_createdAt_idx" ON "StockMovement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_cylinderTypeId_idx" ON "StockMovement"("cylinderTypeId");

-- CreateIndex
CREATE INDEX "Supply_supplyDate_idx" ON "Supply"("supplyDate");

-- CreateIndex
CREATE INDEX "Patient_fullName_idx" ON "Patient"("fullName");

-- CreateIndex
CREATE INDEX "Patient_neighborhood_idx" ON "Patient"("neighborhood");

-- CreateIndex
CREATE INDEX "Patient_village_idx" ON "Patient"("village");

-- CreateIndex
CREATE INDEX "HomeExchange_patientId_exchangeDate_idx" ON "HomeExchange"("patientId", "exchangeDate");

-- CreateIndex
CREATE UNIQUE INDEX "Flowmeter_code_key" ON "Flowmeter"("code");

-- CreateIndex
CREATE INDEX "Flowmeter_state_idx" ON "Flowmeter"("state");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "CylinderType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "HomeExchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeExchange" ADD CONSTRAINT "HomeExchange_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowmeterMovement" ADD CONSTRAINT "FlowmeterMovement_flowmeterId_fkey" FOREIGN KEY ("flowmeterId") REFERENCES "Flowmeter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
