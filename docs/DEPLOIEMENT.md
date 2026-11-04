# Déploiement, environnements et sauvegardes

Conforme au cahier des charges §7.2 (Docker, CI/CD, hébergement), §7.4 (dev / recette / prod) et §10 (sauvegardes, HTTPS).

## 1. Ce qui est fourni
| Élément | Fichier |
|---|---|
| Images Docker des 4 services | `srcb/Dockerfile`, `srcf/Dockerfile`, `IA/Dockerfile`, `ML/Dockerfile` |
| Orchestration | `deploy/docker-compose.yml` (+ `.staging.yml`, `.prod.yml`) |
| Variables par environnement | `deploy/.env.dev.example`, `.env.staging.example`, `.env.prod.example` |
| HTTPS automatique (production) | `deploy/caddy/Caddyfile` |
| Sauvegarde / restauration / test de restauration | `deploy/scripts/backup.sh`, `restore.sh`, `test-restore.sh` |
| CI/CD GitHub Actions | `.github/workflows/ci.yml` |
| File d'attente (optionnelle) | service `redis` (profil `queue`) + `srcb/src/utils/jobQueue.ts` |

## 2. Lancer un environnement
```bash
cd deploy
cp .env.dev.example .env.dev          # puis remplacer tous les « CHANGER_… »
docker compose --env-file .env.dev up --build            # développement
docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml up -d --build   # recette
docker compose --env-file .env.prod    -f docker-compose.yml -f docker-compose.prod.yml    up -d --build   # production (HTTPS)
```
Le service `migrate` applique `prisma migrate deploy` avant le démarrage du back-end. Le service IA n'est jamais exposé à Internet (réseau interne). `!reset` dans `docker-compose.prod.yml` demande Docker Compose ≥ 2.24.

## 3. Sauvegardes
Le service `backup` exécute `pg_dump` toutes les `BACKUP_EVERY_HOURS` (24 par défaut), vérifie l'archive (`pg_restore --list`) et supprime celles de plus de `BACKUP_KEEP_DAYS` jours (14 par défaut).
Tester la restauration (à faire avant la production, puis chaque mois) : `./deploy/scripts/test-restore.sh <conteneur_db> <conteneur_backup>`.
Pour une vraie reprise après sinistre, copier régulièrement le volume `backups` hors du serveur.

## 4. CI/CD
`develop` → tests + images + déploiement **recette** ; `main` → tests + images + déploiement **production** après validation manuelle (environnement GitHub « production » avec *Required reviewers*). Secrets à créer : `STAGING_HOST/USER/SSH_KEY/PATH`, `PROD_HOST/USER/SSH_KEY/PATH`.

## 5. Hébergement (décision de la Direction, cahier §14.2 point 9)
Un VPS Linux (2 vCPU / 4 Go de RAM minimum pour les 6 conteneurs) suffit pour la phase 1. Choisir entre hébergement local et cloud international selon le budget et les exigences des bailleurs ; la configuration ci-dessus est identique dans les deux cas.

## 6. Performance (cible : pages < 2 s, API < 500 ms hors IA)
* Chaque réponse porte l'en-tête `X-Response-Time` ; les requêtes > `PERF_SLOW_MS` sont journalisées (hors `/api/ai`).
* `GET /api/metrics/perf` (ADMIN / DSI / DIRECTION) : p50 / p95 par route, routes hors budget, état de la file d'attente.
* Campagne de mesure : `API=… EMAIL=… PASSWORD=… WEB=http://… npm run perf` (dans `srcb/`) ; code de sortie ≠ 0 si un objectif est dépassé. **Lancer sur la recette avec un jeu de données réaliste et joindre le tableau au mémoire.**
