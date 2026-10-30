-- Thème du stage + département d'affectation (suivi & évaluation + certificat)
ALTER TABLE "Internship"  ADD COLUMN IF NOT EXISTS "theme"        TEXT;
ALTER TABLE "Internship"  ADD COLUMN IF NOT EXISTS "departmentId" INTEGER;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "theme"          TEXT;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "departmentName" TEXT;

DO $$ BEGIN
  ALTER TABLE "Internship"
    ADD CONSTRAINT "Internship_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Internship_departmentId_idx" ON "Internship"("departmentId");
