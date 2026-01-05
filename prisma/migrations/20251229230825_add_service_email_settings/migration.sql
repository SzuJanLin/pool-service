/*
  Warnings:

  - You are about to drop the column `label` on the `ChecklistItemTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ChecklistItemTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `ServiceChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `numericValue` on the `ServiceChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `textValue` on the `ServiceChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ServiceChecklistItem` table. All the data in the column will be lost.
  - Added the required column `description` to the `ChecklistItemTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `ServiceChecklistItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChecklistItemTemplate" DROP COLUMN "label",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "descriptionWhenCompleted" TEXT;

-- AlterTable
ALTER TABLE "DosageDefinition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReadingDefinition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServiceChecklistItem" DROP COLUMN "label",
DROP COLUMN "numericValue",
DROP COLUMN "textValue",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "descriptionWhenCompleted" TEXT;

-- AlterTable
ALTER TABLE "ServiceDosage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServiceReading" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropEnum
DROP TYPE "AdditiveChemicalType";

-- CreateTable
CREATE TABLE "ServiceEmailSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "bcc" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT,
    "header" TEXT,
    "message" TEXT,
    "footer" TEXT,
    "includeReadings" BOOLEAN NOT NULL DEFAULT true,
    "includeDosages" BOOLEAN NOT NULL DEFAULT true,
    "includeChecklist" BOOLEAN NOT NULL DEFAULT true,
    "includeTechName" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEmailSettings_companyId_key" ON "ServiceEmailSettings"("companyId");

-- AddForeignKey
ALTER TABLE "ServiceEmailSettings" ADD CONSTRAINT "ServiceEmailSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
