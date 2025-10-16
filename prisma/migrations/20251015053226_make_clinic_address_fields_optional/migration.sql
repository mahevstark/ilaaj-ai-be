-- AlterTable
ALTER TABLE "public"."Clinic" ADD COLUMN     "googleMapsLink" TEXT,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleReviewCount" INTEGER,
ADD COLUMN     "pricePerCrown" INTEGER,
ADD COLUMN     "pricePerFilling" INTEGER,
ADD COLUMN     "pricePerImplant" INTEGER,
ADD COLUMN     "pricePerRootCanal" INTEGER,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL;
