-- Types de handicap du ménage (codes séparés par des virgules)
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "disabilityTypes" TEXT;
