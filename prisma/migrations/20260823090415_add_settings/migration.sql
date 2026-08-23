/*
  Warnings:

  - Made the column `city` on table `shops` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "exchange_rate" DECIMAL(12,2) NOT NULL DEFAULT 4000,
ALTER COLUMN "city" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'light';
