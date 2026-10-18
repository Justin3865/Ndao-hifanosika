# Tests HTTP de bout en bout (backend ↔ PostgreSQL)

Ces scripts appellent l'API réelle (aucun mock). Ils créent leurs propres données de test ; à lancer sur une base de DÉVELOPPEMENT.

1. `npx prisma migrate deploy` puis `npx tsx prisma/create-admin.ts` (admin@ndao-hifanosika.org / admin)
2. Démarrer le backend : `npm run dev`
3. Adapter `B` dans `h.mjs` si le backend n'est pas sur http://localhost:4010/api (par défaut 4000 : `http://localhost:4000/api`)
4. Pour `t4` (dataset ML) : `AI_SERVICE_KEY` du backend doit valoir `service-key-test-1234567890`, ou modifiez la clé dans le fichier
5. `node tests-http/t1.mjs` … `t4.mjs` (Node 18+). Chaque script affiche `PASS n FAIL m` et la liste des échecs.
   `t5-python-services.mjs` : nécessite ai-service (8000) et ml-service (8001) démarrés + AI_SERVICE_URL / ML_SERVICE_URL.

t1 : auth, utilisateurs, profil, départements · t2 : zones, projets, activités, jalons, bénéficiaires
t3 : évaluations, stages, notifications, membres, certificats · t4 : tracking/GPS, vulnérabilité, dataset ML, IA, rapports, audit, grilles
