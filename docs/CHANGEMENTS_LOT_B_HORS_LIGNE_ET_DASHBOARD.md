# Lot B — Mode hors-ligne (PWA) et tableaux de bord par département

Réf. cahier des charges : §2.7 et §6 (connectivité limitée), §5.5 (tableau de bord par département), §4 (accès par acteur).

## 1. Mode hors-ligne / connectivité limitée

| Élément | Fichier |
|---|---|
| Application installable (manifest + icônes) | `srcf/public/manifest.webmanifest`, `public/icons/pwa-*.png`, `public/apple-touch-icon.png` |
| Service worker (pages, statiques hachés, API en lecture) | `srcf/public/sw.js` (le Web Push existant est conservé) |
| Page de repli | `srcf/public/offline.html` |
| Enregistrement + bandeau « Hors ligne » | `srcf/src/components/offline/OfflineSupport.tsx`, monté dans `layout.tsx` |
| Blocage des écritures hors ligne | `srcf/src/lib/offline.ts`, garde dans `lib/axios.ts` et `services/api.ts` |
| Purge à la déconnexion | `services/auth.service.ts` → `clearOfflineCache()` |

Comportement
- **Pages** : réseau d'abord (8 s), sinon dernière copie, sinon `/offline.html`.
- **API** : lecture seule, liste blanche dans `sw.js` (`API_CACHEABLE`) : projets, activités, jalons, départements, zones, organisation, dashboards. Copie **propre à chaque utilisateur** (identifiant lu dans le JWT), 24 h maximum, 200 entrées maximum, purgée à la déconnexion.
- **Jamais en cache** : bénéficiaires, mineurs, utilisateurs, notifications, suivi GPS, certificats, exports.
- **Écritures hors ligne refusées** (message clair) : un rejeu différé violerait les règles métier (ex. pointage du jour, 08h–17h, heure du serveur).
- **Développement** : le PWA n'est actif en `next dev` que si `NEXT_PUBLIC_PWA=1`. Les statiques ne sont servis du cache que s'ils portent un hash de build (donc jamais en dev).
- **Production** : servir `/sw.js` avec `Cache-Control: no-cache` (ne pas lui appliquer le cache long des statiques).

## 2. Tableau de bord par département

`GET /api/dashboard/department` (backend) puis composant `DepartmentDashboard` (affiché sur `/dashboard`).

| Rôle | Sections |
|---|---|
| ADMIN, DIRECTION | RH + DAF + Impact |
| RH | Stages, objectifs (retards, progression), évaluations, campagnes en retard |
| DAF | Budget indicatif : total, dépensé, taux, dépassements, détail par projet |
| COMMUNICATION | Impact agrégé et **anonymisé** (aucun nom) |
| COORDINATOR | Impact **limité à ses projets** (`coordinatorScope`) |
| Autres | 403 ; le tableau de bord générique reste affiché |

Fichiers : `srcb/src/utils/departmentDashboardRules.ts` (règles pures, testées), `services/departmentDashboard.service.ts`, `controllers/departmentDashboard.controller.ts`, `routes/departmentDashboard.routes.ts`, 2 lignes dans `app.ts`, test `srcb/test/department-dashboard.test.ts`.

## 3. À vérifier après déploiement
1. `npm run typecheck` et `npm run check` (backend), `npm run build` (frontend).
2. Recette hors-ligne : ouvrir `/dashboard` connecté, couper le réseau (DevTools → Network → Offline), recharger : le bandeau apparaît, les pages visitées et les listes autorisées s'affichent, une écriture est refusée avec un message.
3. Recette dashboard : un compte par rôle (RH, DAF, COMMUNICATION, COORDINATOR affecté, DIRECTION).
