-- CreateEnum
CREATE TYPE "public"."ConsultationStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."ConsultationType" AS ENUM ('SECOND_OPINION', 'TREATMENT_PLANNING', 'FOLLOW_UP', 'EMERGENCY', 'GENERAL_CONSULTATION');

-- CreateTable
CREATE TABLE "public"."Consultation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER,
    "type" "public"."ConsultationType" NOT NULL DEFAULT 'SECOND_OPINION',
    "status" "public"."ConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "patientPhone" TEXT,
    "patientNotes" TEXT,
    "googleEventId" TEXT,
    "meetingLink" TEXT,
    "calendarUrl" TEXT,
    "agenda" TEXT,
    "preparationNotes" TEXT,
    "followUpNotes" TEXT,
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_googleEventId_key" ON "public"."Consultation"("googleEventId");

-- CreateIndex
CREATE INDEX "Consultation_userId_idx" ON "public"."Consultation"("userId");

-- CreateIndex
CREATE INDEX "Consultation_treatmentPlanId_idx" ON "public"."Consultation"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "Consultation_status_idx" ON "public"."Consultation"("status");

-- CreateIndex
CREATE INDEX "Consultation_scheduledAt_idx" ON "public"."Consultation"("scheduledAt");

-- CreateIndex
CREATE INDEX "Consultation_type_idx" ON "public"."Consultation"("type");

-- CreateIndex
CREATE INDEX "Consultation_googleEventId_idx" ON "public"."Consultation"("googleEventId");

-- CreateIndex
CREATE INDEX "Consultation_createdAt_idx" ON "public"."Consultation"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Consultation" ADD CONSTRAINT "Consultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consultation" ADD CONSTRAINT "Consultation_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "public"."TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
