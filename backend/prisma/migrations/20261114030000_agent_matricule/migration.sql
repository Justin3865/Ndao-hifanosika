-- Matricule des coordinateurs / agents de terrain (NH-AAAA-AGT-0001) : colonne unique + rattrapage.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "agentMatricule" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_agentMatricule_key" ON "User"("agentMatricule");

WITH base AS (
  SELECT COALESCE(MAX(substring("agentMatricule" from '^NH-\d{4}-AGT-(\d+)$')::int), 0) AS m
  FROM "User"
),
ranked AS (
  SELECT u."id", ROW_NUMBER() OVER (ORDER BY u."createdAt" ASC, u."id" ASC) AS rn
  FROM "User" u
  WHERE u."agentMatricule" IS NULL
    AND (
      u."role"::text = 'COORDINATOR'
      OR (u."role"::text NOT LIKE 'STAGIAIRE%' AND EXISTS (SELECT 1 FROM "Mission" mi WHERE mi."agentId" = u."id"))
    )
)
UPDATE "User" us
SET "agentMatricule" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-AGT-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE us."id" = ranked."id";
