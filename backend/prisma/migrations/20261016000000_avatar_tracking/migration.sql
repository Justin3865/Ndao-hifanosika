-- Photo de profil
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- Suivi terrain des bénéficiaires (position partagée AVEC consentement)
ALTER TABLE "Beneficiary" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Beneficiary" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Beneficiary" ADD COLUMN "locationAccuracy" DOUBLE PRECISION;
ALTER TABLE "Beneficiary" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Beneficiary" ADD COLUMN "trackingToken" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN "trackingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Beneficiary" ADD COLUMN "consentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Beneficiary_trackingToken_key" ON "Beneficiary"("trackingToken");

-- Grilles et campagnes d'évaluation
CREATE TABLE "EvaluationGrid" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '[]',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EvaluationGrid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvaluationCampaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gridId" INTEGER,
    "projectId" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EvaluationCampaign_pkey" PRIMARY KEY ("id")
);
