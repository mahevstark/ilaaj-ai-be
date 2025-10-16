-- CreateEnum
CREATE TYPE "public"."ClinicRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."ClinicRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER,
    "status" "public"."ClinicRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedTreatments" JSONB,
    "estimatedCost" INTEGER,
    "actualCost" INTEGER,
    "notes" TEXT,
    "adminNotes" TEXT,
    "userPhone" TEXT,
    "userEmail" TEXT,
    "preferredContactMethod" "public"."ContactMethod",
    "clinicResponse" TEXT,
    "availableDates" JSONB,
    "scheduledDate" TIMESTAMP(3),
    "assignedAdminId" INTEGER,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicRequest_userId_idx" ON "public"."ClinicRequest"("userId");

-- CreateIndex
CREATE INDEX "ClinicRequest_clinicId_idx" ON "public"."ClinicRequest"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicRequest_status_idx" ON "public"."ClinicRequest"("status");

-- CreateIndex
CREATE INDEX "ClinicRequest_assignedAdminId_idx" ON "public"."ClinicRequest"("assignedAdminId");

-- CreateIndex
CREATE INDEX "ClinicRequest_createdAt_idx" ON "public"."ClinicRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicRequest_lastContactDate_idx" ON "public"."ClinicRequest"("lastContactDate");

-- AddForeignKey
ALTER TABLE "public"."ClinicRequest" ADD CONSTRAINT "ClinicRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicRequest" ADD CONSTRAINT "ClinicRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicRequest" ADD CONSTRAINT "ClinicRequest_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "public"."TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicRequest" ADD CONSTRAINT "ClinicRequest_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
