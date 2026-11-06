-- Neutralisé : ce lot ajoutait par erreur des tables "Attendance"/"AttendanceLog" en doublon de "BeneficiaryAttendance".
-- Sans effet si elles n'existent pas ; supprime les tables vides si elles ont été créées.
DROP TABLE IF EXISTS "AttendanceLog";
DROP TABLE IF EXISTS "Attendance";
