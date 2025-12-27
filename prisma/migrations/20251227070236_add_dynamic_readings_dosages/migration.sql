-- Drop old tables if they exist
DROP TABLE IF EXISTS "ServiceReadings" CASCADE;
DROP TABLE IF EXISTS "ChemicalDose" CASCADE;

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
CREATE UNIQUE INDEX "ServiceReading_serviceHistoryId_readingDefinitionId_key" ON "ServiceReading"("serviceHistoryId", "readingDefinitionId");
CREATE INDEX "ServiceReading_serviceHistoryId_idx" ON "ServiceReading"("serviceHistoryId");
CREATE INDEX "ServiceReading_readingDefinitionId_idx" ON "ServiceReading"("readingDefinitionId");
CREATE INDEX "ServiceDosage_serviceHistoryId_idx" ON "ServiceDosage"("serviceHistoryId");
CREATE INDEX "ServiceDosage_dosageDefinitionId_idx" ON "ServiceDosage"("dosageDefinitionId");

-- Add foreign keys
ALTER TABLE "ServiceReading" ADD CONSTRAINT "ServiceReading_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceReading" ADD CONSTRAINT "ServiceReading_readingDefinitionId_fkey" FOREIGN KEY ("readingDefinitionId") REFERENCES "ReadingDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDosage" ADD CONSTRAINT "ServiceDosage_serviceHistoryId_fkey" FOREIGN KEY ("serviceHistoryId") REFERENCES "ServiceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceDosage" ADD CONSTRAINT "ServiceDosage_dosageDefinitionId_fkey" FOREIGN KEY ("dosageDefinitionId") REFERENCES "DosageDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

