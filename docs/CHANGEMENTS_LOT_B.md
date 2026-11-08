# Lot B — LOT 2 (rattachement N-N, fiche membre) sy LOT 1 (évaluations) : BACKEND
Fanampiana fotsiny. Tsy misy tabilao, colonne na route efa misy nesorina na novaina.

## Fampiharana (araka ny filaharana)
1. Alefaso ny patch (kopia ny rakitra amin y toerany).
2. cd srcb && npm install && npx prisma generate
3. npx prisma migrate deploy      (mampihatra 20261119000001_lot2_n_n_membre ary 20261119000002_lot1_evaluations_personnes)
4. npm run check                  (test + test:unit + typecheck)  <- MILA ATAO: tsy mbola voamarina ny typecheck eto
5. npm run migrate:check

## LOT 2 — migration 20261119000001
- User : jobTitle, engagementType (SALARIE|BENEVOLE|STAGIAIRE), engagementStart, engagementEnd.
- beneficiaries_projects : exitedAt. Tabilao vaovao project_members (+ FK, unique projectId+userId) ; fakana ny stagiaires efa mifandray amin y projet.
- Routes (src/routes/projectLinks.routes.ts, mounted /api) :
  GET|POST /beneficiaries/:id/projects · PATCH /beneficiaries/:id/projects/:projectId/status · PATCH .../primary · DELETE .../:projectId
  GET /projects/:id/beneficiaries (id, matricule, statut ihany : tsy misy anarana na contact)
  GET|POST /projects/:id/members · DELETE /projects/:id/members/:userId (?soft=1 mitahiry ny tantara)
  GET|PUT /members/:id/profile
- Fitsipika : coordinateur A tsy mahita ny rattachement B (visibleLinks) ; tsy azo esorina ny projet principal ; statut isaky ny projet.
- Beneficiary.projectId mijanona ho projet principal (PATCH .../primary no manova azy).
- TSY novaina : ny guard efa misy (coordinatorScope) mijery ny projet principal ihany. Raha tianao hahita ny fiche bénéficiaire A+B ny coordinateur B, 
  ilaina ny fanapahan-kevitra (fanitarana ny guardBeneficiaryById). Tsy nataoko satria manova fitondran-tena efa misy.

## LOT 1 — migration 20261119000002
- EvaluationGrid : projectId, maxScore (barème), targetType. EvaluationCampaign : periodicity, targetType. Internship : academicSupervisorName/Email (tuteur entreprise = supervisorId efa misy).
- Tabilao vaovao person_evaluations (polymorphe MEMBER|STAGIAIRE|BENEFICIARY, evaluatorRole SELF|SUPERVISOR|TUTOR_ENTERPRISE|TUTOR_ACADEMIC|HR, statut DRAFT→SUBMITTED→VALIDATED) sy person_evaluation_scores.
- Routes /api/person-evaluations : GET / · GET /:id · POST / · PUT /:id/scores · POST /:id/submit · POST /:id/validate · GET /history (progression, auto/croisée, écart, entrée IA)
  POST /campaigns/:id/launch (idempotent) · GET /campaigns/:id/progress (taux de complétion, retard) · PATCH /campaigns/:id/meta · PATCH /grids/:id/meta · PATCH /internships/:id/academic-supervisor
  GET /performance/members/:id (RH, Direction, Admin, tuteur ; miantso /ai/score/performance ; dégradation gracieuse)
- Ny route /api/evaluations, /api/evaluation-grids, /api/evaluation-campaigns, /api/internships : TSY novaina.
- Tsy mbola natao : fampandrenesana (Notification) rehefa lasa ny campagne ; ny frontend (jereo ambany).

## Tsy mbola vita
- FRONTEND LOT 2 sy LOT 1 (multi-select projet, tab « Parcours par projet », fiche membre, formulaire évaluation, auto-évaluation) : tsy nosoratana, satria tsy azoko hamarinina ny build Next.js eto.
- Fanamarinana tena izy (PostgreSQL, npm install, tsc, build, CI) : ataonao amin y milina misy azy.
