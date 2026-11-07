-- Les présences saisies à la main (stagiaires, endReason = 'MANUEL') ne portent pas de matricule de mission.
UPDATE "Mission" SET "code" = NULL WHERE "endReason" = 'MANUEL';
