-- CreateEnum
CREATE TYPE "ChemicalType" AS ENUM ('CHLORINE', 'BROMINE', 'SALT', 'OTHER');

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gallons" INTEGER,
    "chemicalType" "ChemicalType",
    "baselinePressure" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pool_customerId_idx" ON "Pool"("customerId");

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
