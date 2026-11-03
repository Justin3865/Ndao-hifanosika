-- Candidature publique : plus besoin de compte pour postuler
ALTER TABLE "InternshipApplication" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "InternshipApplication"
  ADD COLUMN "applicantName"  TEXT,
  ADD COLUMN "applicantEmail" TEXT;

-- Si l'utilisateur est supprimé, la candidature est conservée
ALTER TABLE "InternshipApplication" DROP CONSTRAINT IF EXISTS "InternshipApplication_userId_fkey";
ALTER TABLE "InternshipApplication"
  ADD CONSTRAINT "InternshipApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Anciennes candidatures : reprendre nom / e-mail du compte
UPDATE "InternshipApplication" a
SET "applicantName"  = TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')),
    "applicantEmail" = LOWER(u."email")
FROM "User" u
WHERE a."userId" = u."id" AND a."applicantEmail" IS NULL;

-- Un même e-mail ne peut postuler qu'une fois par stage
CREATE UNIQUE INDEX "InternshipApplication_offerId_applicantEmail_key"
  ON "InternshipApplication"("offerId", "applicantEmail");

-- Plusieurs fichiers par dossier
CREATE TABLE "InternshipApplicationFile" (
  "id"            SERIAL PRIMARY KEY,
  "applicationId" INTEGER NOT NULL,
  "fileName"      TEXT NOT NULL,
  "fileMime"      TEXT NOT NULL,
  "fileSize"      INTEGER NOT NULL,
  "fileData"      BYTEA NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternshipApplicationFile_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "InternshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InternshipApplicationFile_applicationId_idx" ON "InternshipApplicationFile"("applicationId");
