-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "techId" TEXT,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "startOn" TIMESTAMP(3) NOT NULL,
    "stopAfter" TIMESTAMP(3),
    "skipWeeks" INTEGER NOT NULL DEFAULT 0,
    "anchorDate" TIMESTAMP(3),
    "weekOffset" INTEGER NOT NULL DEFAULT 0,
    "skipWeekNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Route_poolId_idx" ON "Route"("poolId");

-- CreateIndex
CREATE INDEX "Route_techId_idx" ON "Route"("techId");

-- CreateIndex
CREATE INDEX "Route_active_idx" ON "Route"("active");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_techId_fkey" FOREIGN KEY ("techId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
