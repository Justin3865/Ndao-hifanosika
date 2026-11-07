-- Formulaire commun « Bénéficiaire » / « Enquête d'un nouveau ménage » : champs ajoutés de part et d'autre.
ALTER TABLE "Beneficiary"
  ADD COLUMN IF NOT EXISTS "outOfSchoolChildren" INTEGER,
  ADD COLUMN IF NOT EXISTS "mealsPerDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "healthIssues" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "waterAccess" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "electricityAccess" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "housingType" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "enrollment_candidates"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "birthPlace" TEXT,
  ADD COLUMN IF NOT EXISTS "cinNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "cinIssuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cinIssuedPlace" TEXT,
  ADD COLUMN IF NOT EXISTS "cinDuplicata" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "adminProvince" TEXT,
  ADD COLUMN IF NOT EXISTS "adminRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "adminDistrict" TEXT,
  ADD COLUMN IF NOT EXISTS "zoneUnits" TEXT,
  ADD COLUMN IF NOT EXISTS "disabilityTypes" TEXT;
