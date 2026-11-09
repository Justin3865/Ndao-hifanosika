# Lot C — Sécurité (§6, §10) et recette automatisée

Ce lot est **additif** : sans les nouvelles variables d'environnement, le comportement en développement est inchangé.

## 1. Ce qui est fait

| # | Point | Réalisation | Fichiers |
|---|---|---|---|
| 8 | Chiffrement au repos | Module **AES-256-GCM** prêt et testé (`encryptField`, `decryptField`, index aveugle HMAC) + **sauvegarde PostgreSQL chiffrée** | `src/utils/fieldCrypto.ts`, `scripts/backup-chiffre.cjs` |
| 9 | Audit | Le journal enregistre maintenant **`entityId`** et des **détails** (opération, ressource, résultat, **noms** des champs modifiés, jamais leurs valeurs). L'API `/api/audit` renvoie `entityId`. Champs historiques conservés | `src/utils/auditRules.ts`, `middlewares/audit.middleware.ts`, `routes/audit.routes.ts` |
| 10 | Production | `COORDINATOR_SCOPE` non strict, secrets faibles, CORS/URL non sécurisés, **mots de passe du seed encore actifs** : avertissements au démarrage (production uniquement). Le **seed refuse de tourner en production** | `src/services/securityStartup.service.ts`, `prisma/seed.ts` |
| 11 | Débit et HTTPS | **Limitation globale par IP** (réglable) ; **HTTPS obligatoire** si `FORCE_HTTPS=1` ; `TRUST_PROXY` | `middlewares/globalRateLimit.middleware.ts`, `httpsGuard.middleware.ts`, `utils/securityConfig.ts` |
| 12 | Service IA | **Rôle PostgreSQL `ai_reader` en lecture seule** (colonnes sensibles exclues) ; clé de service exigée aussi sur `/v1/summary` ; mode **`AI_REQUIRE_KEY=1`** : sans clé configurée, refus au lieu d'accès libre | `prisma/sql/ai_reader.sql`, `ai/app/main.py`, `ai/app/routes_insights.py` |
| 13 | Connectivité faible | **Compression gzip** (ETag déjà fourni par Express) ; PWA et cache hors ligne en lecture (Lot B). **Pas de file d'attente d'écriture hors ligne** (voir §3) | `src/app.ts` |
| 14 | Impact / dashboards | Dashboards RH, DAF, Communication et section Impact (relances, insertion, satisfaction) livrés au Lot B | — |
| 15 | Recette | Playwright : **R01, R03, R06, R07, R08, R13** | `srcf/e2e/`, `srcf/playwright.config.ts` |

## 2. Mise en service

**Backend** : `npm install` (ajoute `compression`), puis `npm run typecheck && npm run test:unit`.

Production (variables) :
```
NODE_ENV=production
COORDINATOR_SCOPE=strict      # un coordinateur sans projet n'a AUCUN accès
FORCE_HTTPS=1                 # HTTPS obligatoire (avec le proxy TLS)
TRUST_PROXY=1                 # nécessaire derrière un proxy (IP réelle, X-Forwarded-Proto)
AI_SERVICE_KEY=<32+ caractères aléatoires>
SECURITY_STRICT_STARTUP=1     # optionnel : refuse de démarrer si un point critique subsiste
```
Service IA : `AI_REQUIRE_KEY=1`. Rôle lecture seule :
```
psql "$DATABASE_URL_ADMIN" -v ai_password="'<mot de passe long>'" -f prisma/sql/ai_reader.sql
```
puis `DATABASE_URL=postgresql://ai_reader:...@hote/base` dans l'environnement du **seul** service IA.

Sauvegarde chiffrée :
```
BACKUP_ENCRYPTION_KEY=<clé> node scripts/backup-chiffre.cjs backup
BACKUP_ENCRYPTION_KEY=<clé> node scripts/backup-chiffre.cjs restore backup-XXXX.dump.enc
```
Conserver la clé **hors du serveur**. Sans elle, la sauvegarde est irrécupérable. Tester une restauration avant d'en dépendre.

**Recette** : `npm i -D @playwright/test && npx playwright install chromium && npm run e2e` (backend, frontend et seed démarrés). R13 : arrêter le service IA puis `E2E_AI_DOWN=1 npm run e2e`.

## 3. Décisions et limites

1. **Chiffrement des champs CIN / téléphone : non branché, volontairement.** Le chiffrer change leur stockage : recherche, unicité du CIN, filtres et exports. Il faut d'abord la décision du DSI (cahier §14.2). Deux voies : (a) **volume + sauvegardes chiffrés** — sans impact applicatif, `backup-chiffre.cjs` fournit la partie sauvegarde, le chiffrement du volume relève de l'hébergeur ; (b) **champs chiffrés** avec `fieldCrypto.ts` et un **index aveugle** pour l'unicité du CIN, qui demande une migration de données et la réécriture des recherches.
2. **`COORDINATOR_SCOPE=strict` n'est pas activé par défaut** : cela retirerait l'accès aux coordinateurs qui n'ont pas encore de projet affecté. À activer en production après avoir affecté les projets (`/coordinateurs`).
3. **Pas d'écriture hors ligne** : le pointage du jour (08h–17h, heure du serveur) serait rejeté au rejeu. Les écritures hors ligne sont refusées avec un message clair.
4. **Limite globale** : 1200 requêtes par minute et par IP. Derrière un proxy sans `TRUST_PROXY`, tous les utilisateurs partagent l'IP du proxy : régler `TRUST_PROXY`.
5. Seuls les points testables sans base ont des tests automatiques (règles d'audit, configuration, chiffrement, sauvegarde). Le branchement Express (limiteur, HTTPS, audit en base) doit être vérifié sur l'environnement de recette.
