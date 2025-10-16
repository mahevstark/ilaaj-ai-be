-- CreateEnum
CREATE TYPE "public"."LoginMethod" AS ENUM ('IMPLANNER', 'GOOGLE');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginMethod" "public"."LoginMethod" NOT NULL DEFAULT 'IMPLANNER',
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE';
