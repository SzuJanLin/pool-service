/*
  Warnings:

  - You are about to drop the column `customerId` on the `Customer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Customer_customerId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerId";
