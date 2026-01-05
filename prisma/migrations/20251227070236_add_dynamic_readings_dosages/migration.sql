-- Drop old tables if they exist
DROP TABLE IF EXISTS "ServiceReadings" CASCADE;
DROP TABLE IF EXISTS "ChemicalDose" CASCADE;

-- Create ReadingDefinition table
CREATE TABLE "ReadingDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultValue" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReadingDefinition_pkey" PRIMARY KEY ("id")
);

-- Create DosageDefinition table
CREATE TABLE "DosageDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "dosageType" TEXT,
    "cost" DECIMAL(10,2),
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultValue" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DosageDefinition_pkey" PRIMARY KEY ("id")
);

-- Create ServiceReading table
CREATE TABLE "ServiceReading" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "readingDefinitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceReading_pkey" PRIMARY KEY ("id")
);

-- Create ServiceDosage table
CREATE TABLE "ServiceDosage" (
    "id" TEXT NOT NULL,
    "serviceHistoryId" TEXT NOT NULL,
    "dosageDefinitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "productName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDosage_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "ReadingDefinition_companyId_idx" ON "ReadingDefinition"("companyId");
CREATE INDEX "DosageDefinition_companyId_idx" ON "DosageDefinition"("companyId");
CREATE UNIQUE INDEX "ServiceReading_serviceHistoryId_readingDefinitionId_key" ON "ServiceReading"("serviceHistoryId", "readingDefinitionId");
CREATE INDEX "ServiceReading_serviceHistoryId_idx" ON "ServiceReading"("serviceHistoryId");
CREATE INDEX "ServiceReading_readingDefinitionId_idx" ON "ServiceReading"("readingDefinitionId");
CREATE INDEX "ServiceDosage_serviceHistoryId_idx" ON "ServiceDosage"("serviceHistoryId");
CREATE INDEX "ServiceDosage_dosageDefinitionId_idx" ON "ServiceDosage"("dosageDefinitionId");

-- Add foreign keys
ALTER TABLE "ReadingDefinition" ADD CONSTRAINT "ReadingDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DosageDefinition" ADD CONSTRAINT "DosageDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceReading" ADD CONSTRAINT "ServiceReading_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceReading" ADD CONSTRAINT "ServiceReading_readingDefinitionId_fkey" FOREIGN KEY ("readingDefinitionId") REFERENCES "ReadingDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDosage" ADD CONSTRAINT "ServiceDosage_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceDosage" ADD CONSTRAINT "ServiceDosage_dosageDefinitionId_fkey" FOREIGN KEY ("dosageDefinitionId") REFERENCES "DosageDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
