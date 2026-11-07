-- Matricule d'enquête (ENQ) distinct du matricule bénéficiaire (BEN), rattachement de l'enquête au matricule de l'agent,
-- et seuils de score de départ / plancher par projet.

-- 1) nouvelles colonnes
ALTER TABLE "enrollment_candidates" ADD COLUMN IF NOT EXISTS "agentMatricule" TEXT;
ALTER TABLE "enrollment_rules" ADD COLUMN IF NOT EXISTS "topScore" INTEGER NOT NULL DEFAULT 70;

-- 2) matricule de l'agent figé sur chaque enquête existante
UPDATE "enrollment_candidates" c
SET "agentMatricule" = u."agentMatricule"
FROM "User" u
WHERE c."agentId" = u."id" AND c."agentMatricule" IS NULL AND u."agentMatricule" IS NOT NULL;

-- 3) chaque enquête (ménage candidat) reçoit un matricule d'enquête NH-AAAA-ENQ-xxxx, à la suite du plus grand numéro déjà pris
--    (enquêtes existantes ET candidats déjà au format ENQ). Un candidat déjà devenu bénéficiaire garde son matricule BEN côté Beneficiary.
WITH base AS (
  SELECT GREATEST(
    COALESCE((SELECT MAX(substring("code" from '^NH-\d{4}-ENQ-(\d+)$')::int) FROM "Survey"), 0),
    COALESCE((SELECT MAX(substring("code" from '^NH-\d{4}-ENQ-(\d+)$')::int) FROM "enrollment_candidates"), 0)
  ) AS m
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "enrollment_candidates"
  WHERE "code" IS NULL OR "code" !~ '^NH-\d{4}-ENQ-\d+$'
)
UPDATE "enrollment_candidates" c
SET "code" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-ENQ-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE c."id" = ranked."id";

-- 4) les matricules bénéficiaires passent à 7 chiffres (NH-2026-BEN-0000016) ; la suite continue au dernier bénéficiaire + 1
UPDATE "Beneficiary"
SET "matricule" = 'NH-' || substring("matricule" from '^NH-(\d{4})-BEN-\d+$') || '-BEN-' || LPAD(substring("matricule" from '^NH-\d{4}-BEN-(\d+)$')::int::text, 7, '0')
WHERE "matricule" ~ '^NH-\d{4}-BEN-\d{1,6}$';
