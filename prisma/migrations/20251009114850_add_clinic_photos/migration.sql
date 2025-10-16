-- AlterTable
ALTER TABLE "public"."Clinic" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."UnavailableSlot" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT DEFAULT 'Unavailable',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnavailableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnavailableSlot_startTime_idx" ON "public"."UnavailableSlot"("startTime");

-- CreateIndex
CREATE INDEX "UnavailableSlot_endTime_idx" ON "public"."UnavailableSlot"("endTime");

-- CreateIndex
CREATE INDEX "UnavailableSlot_createdAt_idx" ON "public"."UnavailableSlot"("createdAt");
