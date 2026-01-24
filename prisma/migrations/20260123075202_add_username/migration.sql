/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ROLE" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "name" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "ROLE" NOT NULL DEFAULT 'CUSTOMER';

-- DropEnum
DROP TYPE "Role";
