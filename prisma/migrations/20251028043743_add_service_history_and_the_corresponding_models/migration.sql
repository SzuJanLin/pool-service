-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdditiveChemicalType" AS ENUM ('LIQUID_CHLORINE', 'MURIATIC_ACID', 'CHLORINE_TABLETS', 'DICHLOR', 'CAL_HYPO', 'SODA_ASH', 'BAKING_SODA', 'STABILIZER', 'CALCIUM_CHLORIDE', 'ALGAECIDE', 'CLARIFIER', 'OTHER');

-- CreateEnum
CREATE TYPE "DoseUnit" AS ENUM ('FL_OZ', 'GAL', 'ML', 'L', 'OZ', 'LB', 'G');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('S3', 'R2', 'GCS');

-- CreateTable
CREATE TABLE "ServiceHistory" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "technicianId" TEXT,
    "companyId" TEXT,
    "checklistTemplateId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReadings" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "freeChlorine" DECIMAL(6,2),
    "totalChlorine" DECIMAL(6,2),
    "pH" DECIMAL(4,2),
    "totalAlkalinity" INTEGER,
    "calciumHardness" INTEGER,
    "cyanuricAcid" INTEGER,
    "salt" INTEGER,
    "temperatureC" DECIMAL(5,2),
    "tds" INTEGER,
    "orp" INTEGER,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "notes" TEXT,

    CONSTRAINT "ServiceReadings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChemicalDose" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "chemical" "AdditiveChemicalType" NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "unit" "DoseUnit" NOT NULL,
    "productName" TEXT,
    "costCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChemicalDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemTemplate" (
    "id" TEXT NOT NULL,
    "checklistTemplateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BOOLEAN',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChecklistItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceChecklistItem" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "itemTemplateId" TEXT,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BOOLEAN',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN,
    "numericValue" DECIMAL(10,3),
    "textValue" TEXT,
    "notedIssue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePhoto" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "caption" TEXT,
    "provider" "StorageProvider" NOT NULL DEFAULT 'S3',
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "etag" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "contentType" TEXT,
    "uploadedById" TEXT,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceHistory_routeId_idx" ON "ServiceHistory"("routeId");

-- CreateIndex
CREATE INDEX "ServiceHistory_serviceDate_idx" ON "ServiceHistory"("serviceDate");

-- CreateIndex
CREATE INDEX "ServiceHistory_technicianId_idx" ON "ServiceHistory"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceHistory_companyId_idx" ON "ServiceHistory"("companyId");

-- CreateIndex
CREATE INDEX "ServiceHistory_checklistTemplateId_idx" ON "ServiceHistory"("checklistTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceHistory_routeId_serviceDate_key" ON "ServiceHistory"("routeId", "serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReadings_serviceHistoryId_key" ON "ServiceReadings"("serviceHistoryId");

-- CreateIndex
CREATE INDEX "ChemicalDose_serviceHistoryId_idx" ON "ChemicalDose"("serviceHistoryId");

-- CreateIndex
CREATE INDEX "ChemicalDose_chemical_idx" ON "ChemicalDose"("chemical");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_companyId_idx" ON "ChecklistTemplate"("companyId");

-- CreateIndex
CREATE INDEX "ChecklistItemTemplate_checklistTemplateId_idx" ON "ChecklistItemTemplate"("checklistTemplateId");

-- CreateIndex
CREATE INDEX "ServiceChecklistItem_serviceHistoryId_idx" ON "ServiceChecklistItem"("serviceHistoryId");

-- CreateIndex
CREATE INDEX "ServiceChecklistItem_itemTemplateId_idx" ON "ServiceChecklistItem"("itemTemplateId");

-- CreateIndex
CREATE INDEX "ServicePhoto_serviceHistoryId_idx" ON "ServicePhoto"("serviceHistoryId");

-- CreateIndex
CREATE INDEX "ServicePhoto_uploadedById_idx" ON "ServicePhoto"("uploadedById");

-- CreateIndex
CREATE INDEX "photo_object_idx" ON "ServicePhoto"("bucket", "objectKey");

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHistory" ADD CONSTRAINT "ServiceHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReadings" ADD CONSTRAINT "ServiceReadings_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChemicalDose" ADD CONSTRAINT "ChemicalDose_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemTemplate" ADD CONSTRAINT "ChecklistItemTemplate_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChecklistItem" ADD CONSTRAINT "ServiceChecklistItem_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChecklistItem" ADD CONSTRAINT "ServiceChecklistItem_itemTemplateId_fkey" FOREIGN KEY ("itemTemplateId") REFERENCES "ChecklistItemTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
