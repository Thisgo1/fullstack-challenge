/*
  Warnings:

  - You are about to drop the column `cashoutAt` on the `Bet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bet" DROP COLUMN "cashoutAt",
ADD COLUMN     "autoCashoutAt" INTEGER,
ADD COLUMN     "cashoutMultiplier" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
