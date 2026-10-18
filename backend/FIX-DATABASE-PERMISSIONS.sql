-- Ndao Hifanosika - correction des droits PostgreSQL
--
-- A EXECUTER avec un compte PostgreSQL administrateur (postgres) dans la base
-- nd[a]o_hifanosika. Remplacez ndao_app par le NOM EXACT de l'utilisateur
-- PostgreSQL utilisé par DATABASE_URL dans le backend.
--
-- Pour connaître le rôle utilisé par DATABASE_URL :
--   SELECT current_user;
--
-- Le backend a actuellement : Database error 42501 - droit refusé pour la table Notification.

-- 1) Accès au schéma public
GRANT USAGE ON SCHEMA public TO ndao_app;

-- 2) Accès à Notification
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Notification" TO ndao_app;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public."Notification_id_seq" TO ndao_app;

-- 3) Sécurité complémentaire pour les futures tables/séquences créées par le rôle admin.
-- Décommentez si le backend doit pouvoir accéder à toutes les tables de cette base.
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ndao_app;
-- GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ndao_app;

-- Vérification
SELECT current_user;
SELECT has_table_privilege('ndao_app', 'public."Notification"', 'SELECT') AS can_select_notifications;
SELECT has_table_privilege('ndao_app', 'public."Notification"', 'INSERT') AS can_insert_notifications;
