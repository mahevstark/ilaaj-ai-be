-- CreateEnum
CREATE TYPE "public"."ClinicStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ClinicType" AS ENUM ('DENTAL', 'MEDICAL', 'SPECIALIZED', 'MULTI_SPECIALTY');

-- CreateEnum
CREATE TYPE "public"."DoctorRole" AS ENUM ('OWNER', 'PARTNER', 'EMPLOYEE', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "public"."DoctorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."TreatmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'DISCONTINUED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "clinicId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Clinic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "clinicType" "public"."ClinicType" NOT NULL DEFAULT 'DENTAL',
    "status" "public"."ClinicStatus" NOT NULL DEFAULT 'PENDING',
    "licenseNumber" TEXT,
    "taxId" TEXT,
    "registrationDate" TIMESTAMP(3),
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "emergencyContact" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operatingHours" JSONB,
    "socialMedia" JSONB,
    "onlinePresence" JSONB,
    "thirdPartyId" TEXT,
    "thirdPartySource" TEXT,
    "thirdPartyData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" TIMESTAMP(3),
    "rating" DOUBLE PRECISION DEFAULT 0.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "maxPatients" INTEGER,
    "currentPatients" INTEGER NOT NULL DEFAULT 0,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "pricingTier" TEXT,
    "acceptsInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClinicReview" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Doctor" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "specialization" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" INTEGER,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "status" "public"."DoctorStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "profileImage" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "education" JSONB,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "awards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingHours" JSONB,
    "consultationFee" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorClinic" (
    "id" SERIAL NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "role" "public"."DoctorRole" NOT NULL DEFAULT 'EMPLOYEE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorClinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorAppointment" (
    "id" SERIAL NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "prescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Treatment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "basePrice" INTEGER,
    "priceRange" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isPriceNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "preparationTime" INTEGER,
    "recoveryTime" INTEGER,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sideEffects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "successRate" DOUBLE PRECISION,
    "status" "public"."TreatmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyBookings" INTEGER,
    "clinicId" INTEGER NOT NULL,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insuranceCoverage" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ageRestrictions" JSONB,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreatmentAppointment" (
    "id" SERIAL NOT NULL,
    "treatmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "price" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "public"."Clinic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_email_key" ON "public"."Clinic"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_thirdPartyId_key" ON "public"."Clinic"("thirdPartyId");

-- CreateIndex
CREATE INDEX "Clinic_status_idx" ON "public"."Clinic"("status");

-- CreateIndex
CREATE INDEX "Clinic_clinicType_idx" ON "public"."Clinic"("clinicType");

-- CreateIndex
CREATE INDEX "Clinic_city_idx" ON "public"."Clinic"("city");

-- CreateIndex
CREATE INDEX "Clinic_country_idx" ON "public"."Clinic"("country");

-- CreateIndex
CREATE INDEX "Clinic_thirdPartySource_idx" ON "public"."Clinic"("thirdPartySource");

-- CreateIndex
CREATE INDEX "Clinic_isVerified_idx" ON "public"."Clinic"("isVerified");

-- CreateIndex
CREATE INDEX "Clinic_createdAt_idx" ON "public"."Clinic"("createdAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_idx" ON "public"."Appointment"("clinicId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "public"."Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "public"."Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "ClinicReview_clinicId_idx" ON "public"."ClinicReview"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicReview_userId_idx" ON "public"."ClinicReview"("userId");

-- CreateIndex
CREATE INDEX "ClinicReview_rating_idx" ON "public"."ClinicReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "public"."Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_licenseNumber_key" ON "public"."Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_status_idx" ON "public"."Doctor"("status");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "public"."Doctor"("specialization");

-- CreateIndex
CREATE INDEX "Doctor_city_idx" ON "public"."Doctor"("city");

-- CreateIndex
CREATE INDEX "Doctor_isAvailable_idx" ON "public"."Doctor"("isAvailable");

-- CreateIndex
CREATE INDEX "Doctor_createdAt_idx" ON "public"."Doctor"("createdAt");

-- CreateIndex
CREATE INDEX "DoctorClinic_doctorId_idx" ON "public"."DoctorClinic"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorClinic_clinicId_idx" ON "public"."DoctorClinic"("clinicId");

-- CreateIndex
CREATE INDEX "DoctorClinic_isActive_idx" ON "public"."DoctorClinic"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorClinic_doctorId_clinicId_key" ON "public"."DoctorClinic"("doctorId", "clinicId");

-- CreateIndex
CREATE INDEX "DoctorAppointment_doctorId_idx" ON "public"."DoctorAppointment"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorAppointment_userId_idx" ON "public"."DoctorAppointment"("userId");

-- CreateIndex
CREATE INDEX "DoctorAppointment_appointmentDate_idx" ON "public"."DoctorAppointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "Treatment_clinicId_idx" ON "public"."Treatment"("clinicId");

-- CreateIndex
CREATE INDEX "Treatment_category_idx" ON "public"."Treatment"("category");

-- CreateIndex
CREATE INDEX "Treatment_status_idx" ON "public"."Treatment"("status");

-- CreateIndex
CREATE INDEX "Treatment_isAvailable_idx" ON "public"."Treatment"("isAvailable");

-- CreateIndex
CREATE INDEX "Treatment_createdAt_idx" ON "public"."Treatment"("createdAt");

-- CreateIndex
CREATE INDEX "TreatmentAppointment_treatmentId_idx" ON "public"."TreatmentAppointment"("treatmentId");

-- CreateIndex
CREATE INDEX "TreatmentAppointment_userId_idx" ON "public"."TreatmentAppointment"("userId");

-- CreateIndex
CREATE INDEX "TreatmentAppointment_appointmentDate_idx" ON "public"."TreatmentAppointment"("appointmentDate");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicReview" ADD CONSTRAINT "ClinicReview_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicReview" ADD CONSTRAINT "ClinicReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorClinic" ADD CONSTRAINT "DoctorClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorClinic" ADD CONSTRAINT "DoctorClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorAppointment" ADD CONSTRAINT "DoctorAppointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorAppointment" ADD CONSTRAINT "DoctorAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Treatment" ADD CONSTRAINT "Treatment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreatmentAppointment" ADD CONSTRAINT "TreatmentAppointment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "public"."Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreatmentAppointment" ADD CONSTRAINT "TreatmentAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
