-- A3/A4 · beneficiaries_projects : rattachement N-N bénéficiaire <-> projet.
-- Beneficiary.projectId n'est PAS modifié (projet principal) ; on reprend simplement l'existant.
CREATE TABLE IF NOT EXISTS "beneficiaries_projects" (
  "beneficiaryId" INTEGER NOT NULL,
  "projectId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beneficiaries_projects_pkey" PRIMARY KEY ("beneficiaryId", "projectId"),
  CONSTRAINT "beneficiaries_projects_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "beneficiaries_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "beneficiaries_projects_projectId_idx" ON "beneficiaries_projects"("projectId");

-- Reprise de l'existant (projet principal de chaque bénéficiaire).
INSERT INTO "beneficiaries_projects" ("beneficiaryId", "projectId", "joinedAt")
SELECT b."id", b."projectId", b."createdAt" FROM "Beneficiary" b
ON CONFLICT DO NOTHING;
