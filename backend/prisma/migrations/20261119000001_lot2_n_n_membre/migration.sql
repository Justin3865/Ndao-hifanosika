-- LOT 2 · Rattachement N-N et fiche membre (cahier §5.2, §5.3, §8). 100 % ADDITIF : aucune table/colonne/route retirée.

-- Fiche membre : poste et période d'engagement (le département existe déjà : User.departmentId)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "engagementType" TEXT;      -- SALARIE | BENEVOLE | STAGIAIRE
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "engagementStart" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "engagementEnd" TIMESTAMP(3);

-- Bénéficiaire ↔ projet : date de sortie (joinedAt et status existent déjà)
ALTER TABLE "beneficiaries_projects" ADD COLUMN IF NOT EXISTS "exitedAt" TIMESTAMP(3);

-- Projet ↔ membre (N-N)
CREATE TABLE IF NOT EXISTS "project_members" (
  "id" SERIAL NOT NULL,
  "projectId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "projectRole" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "assignedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "project_members_userId_idx" ON "project_members"("userId");

-- Reprise de l'existant : les stagiaires déjà rattachés à un projet (internship_projects) deviennent membres du projet.
INSERT INTO "project_members" ("projectId", "userId", "projectRole", "joinedAt")
SELECT DISTINCT ip."projectId", i."studentId", 'STAGIAIRE', COALESCE(i."startDate", CURRENT_TIMESTAMP)
FROM "InternshipProject" ip
JOIN "Internship" i ON i."id" = ip."internshipId"
ON CONFLICT DO NOTHING;
