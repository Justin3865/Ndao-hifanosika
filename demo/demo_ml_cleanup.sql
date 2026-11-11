-- Nettoyage complet de la démo synthétique
BEGIN;
DELETE FROM "BeneficiaryAttendance" WHERE "beneficiaryId" IN (SELECT id FROM "Beneficiary" WHERE "firstName"='DemoML');
DELETE FROM "BeneficiaryJourney"   WHERE "beneficiaryId" IN (SELECT id FROM "Beneficiary" WHERE "firstName"='DemoML');
DELETE FROM "Beneficiary" WHERE "firstName"='DemoML';
DELETE FROM "Activity" WHERE title LIKE '[DEMO-ML]%';
DELETE FROM "Project" WHERE code='DEMO-ML';
COMMIT;
SELECT status, COUNT(*) FROM "BeneficiaryJourney" GROUP BY status;  -- attendu : COMPLETED = 22 (état initial)
