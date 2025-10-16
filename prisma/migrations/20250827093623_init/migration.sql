-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'PATIENT');

-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'PATIENT',
    "phone" TEXT,
    "country" TEXT,
    "contactMethod" "public"."ContactMethod",
    "age" INTEGER,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "kvkkConsent" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "boneLossHistory" BOOLEAN,
    "smoking" BOOLEAN,
    "chronicDiseases" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreatmentPlan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storedPlan" TEXT,
    "hasExistingPlan" BOOLEAN,
    "budgetCents" INTEGER,
    "source" TEXT,
    "hasXRay" BOOLEAN,
    "selectedTeeth" JSONB,
    "title" TEXT,
    "summary" TEXT,
    "initialDataId" TEXT,
    "xrayUrl" TEXT,
    "analysisJson" JSONB,
    "implants" INTEGER,
    "crowns" INTEGER,
    "fillings" INTEGER,
    "rootCanals" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Questionnaire" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER,
    "age" INTEGER,
    "boneLoss" BOOLEAN,
    "smoking" BOOLEAN,
    "chronicDiseases" TEXT,
    "budgetPreference" TEXT,
    "medicalCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."MedicalHistory" ADD CONSTRAINT "MedicalHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Questionnaire" ADD CONSTRAINT "Questionnaire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Questionnaire" ADD CONSTRAINT "Questionnaire_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
