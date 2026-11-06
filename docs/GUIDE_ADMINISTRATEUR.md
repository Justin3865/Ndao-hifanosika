# Guide administrateur — Ndao Hifanosika

Public : ADMIN et DSI. Les modifications de ce lot sont **additives** : rien de l'existant n'est réécrit, et tout se débranche.

## 1. Contenu du lot
| Dossier | Contenu |
|---|---|
| `srcb/` | règles et middlewares de protection des données et de périmètre ; route `GET /api/service/dropout-features` ; script `appliquer-protection-perimetre.py` ; tests |
| `ml_service/` | `compare_live.py` (baseline vs ML sur les vrais labels) et son test |
| `srcf/` | dictionnaire malgache étendu (`phrases.mg.ts`), composant `AutoTranslate`, script `appliquer-malagasy.py` |
| `docs/` | ce guide, le guide utilisateur, l'architecture de référence IA/ML |

## 2. Installation
1. Sauvegardez la base et le code.
2. Copiez le contenu du lot par-dessus le projet (les fichiers sont **nouveaux** : aucun n'écrase un fichier existant).
3. Backend : `python appliquer-protection-perimetre.py` (ajoute 4 lignes à `src/app.ts`, sauvegarde `app.ts.bak-protection`), puis `npm run check` et redémarrage.
4. Frontend : `python appliquer-malagasy.py` (2 lignes dans `src/app/layout.tsx`), puis `npm run build`.
5. Retour arrière : `--revert` sur chaque script.
Aucune migration de base de données n'est nécessaire.

## 3. Variables d'environnement (backend)
| Variable | Défaut | Effet |
|---|---|---|
| `DATA_PROTECTION_MODE` | `enforce` | `audit` = journalise sans masquer (phase d'essai) ; `off` = désactivé |
| `DATA_PROTECTION_FULL_ROLES` | `ADMIN,COORDINATOR` | rôles voyant tout (lecture journalisée) |
| `DATA_PROTECTION_LIMITED_ROLES` | `DIRECTION` | nom visible, contact/CIN/adresse masqués, GPS arrondi |
| `PROTECT_MIN_CELL` | `5` | comptages de 1 à 4 personnes supprimés |
| `COORDINATOR_SCOPE` | (vide) | `strict` : un coordinateur sans affectation ne voit rien (existant) |
| `COORDINATOR_AGGREGATES` | (vide) | `allow` = rétablit l'ancien comportement des vues agrégées |
| `AI_SERVICE_KEY` | — | clé partagée backend ↔ Python (existante) |
**Mise en service recommandée** : une semaine en `audit`, vérifier le journal, puis `enforce`.

## 4. Périmètre des coordinateurs (vues agrégées)
Un coordinateur affecté à des projets (page « Coordinateurs de projet ») ne voit plus que ces projets, aussi dans :
- `/vulnerability/zones` et `/reports/dashboard` : **recalculés** sur ses projets (le score ML global n'est pas montré) ;
- `reports/beneficiaries`, `reports/evaluations`, `monitoring/overview`, `ai/performance`, `ai/dropout-risk`, `ai/households` : lignes hors périmètre retirées, totaux recalculés ;
- `reports|monitoring|integration /projects/:id` : refus 403 hors périmètre ;
- vues **globales non filtrables** (résumé IA, anomalies, narrative, graphiques, comparaison, jeux de données, modèles, entraînement, chatbot, aperçu d'intégration) : refus 403 avec message explicatif. Ces pages restent pleinement disponibles pour ADMIN/DIRECTION/DSI.
Un coordinateur **sans affectation** garde l'accès historique (mode transition) jusqu'à `COORDINATOR_SCOPE=strict`.

## 5. Protection des enfants et des femmes vulnérables
**Personnes protégées** : moins de 18 ans (âge calculé depuis la date de naissance si elle existe) ; femme signalée vulnérable ou en situation de handicap.

| Niveau | Rôles par défaut | Voit |
|---|---|---|
| Complet | ADMIN, COORDINATOR | tout ; chaque lecture est journalisée (`PROTECTED_DATA_READ`, comptages uniquement) |
| Limité | DIRECTION | nom, âge, projet ; contact, CIN, adresse, notes masqués ; GPS arrondi (~1 km) ; naissance = année |
| Pseudonymisé | tous les autres | initiales ; aucune donnée de contact, identité, localisation |
Les valeurs masquées (`•••`) ne peuvent pas être réenregistrées : l'API répond 422 `MASKED_VALUE_REJECTED`. La protection s'applique à `/beneficiaries`, `/vulnerability`, `/ai`, `/reports`, `/journey`, `/follow-ups`, `/tracking`, `/certificates`, `/evaluations`, `/monitoring`, `/integration`.
**À savoir** : (a) les exports CSV des jeux de données (`/ai/datasets/*/export.csv`) ont leur colonne `name` remplacée par des initiales pour tout rôle hors accès complet (sexe et âge absents du fichier : tout le monde est pseudonymisé) ; (b) les champs libres saisis dans d'autres tables ne sont pas détectés ; (c) la protection est technique, elle ne remplace pas une politique de consentement (tuteur légal pour les mineurs) ni une analyse d'impact.

## 6. Évaluer le modèle de risque d'abandon
1. Les coordinateurs renseignent le statut du parcours (actif / terminé / abandon) de chaque bénéficiaire.
2. Obtenez un jeton ADMIN (ou `NDAO_EMAIL`/`NDAO_PASSWORD`, + `NDAO_2FA_CODE` si 2FA) :
```
set BACKEND_URL=http://localhost:4000
set AI_SERVICE_KEY=<clé du backend>
set NDAO_API_TOKEN=<jeton ADMIN>
cd ml_service && python compare_live.py --out rapport_live
```
3. Lisez `rapport_live/rapport.md` : effectifs, validation groupée par projet, tableau AUC / PR-AUC / rappel / F1, **conclusion automatique prudente**.
4. Minimum : 30 parcours clos dont 5 de chaque classe ; sous 100, les résultats sont indicatifs. Hors ligne : `--labels-csv` et `--features-csv`.

## 7. Traduction malgache
Le bouton de langue bascule toute l'interface : les textes exacts connus de `phrases.mg.ts` (1097) sont traduits à l'affichage, le français est restauré en rebasculant. Un texte inconnu reste en français. Pour ajouter une phrase : une ligne `["texte français", "teny malagasy"]` dans `phrases.mg.ts`. Pour exclure une zone : attribut `data-no-translate`.

## 8. Exploitation et dépannage
| Symptôme | Cause probable | Action |
|---|---|---|
| Coordinateur : 403 « vue agrégée » | page globale (IA, anomalies…) | utiliser les vues par projet, ou `COORDINATOR_AGGREGATES=allow` |
| Coordinateur : listes vides | aucune affectation en mode `strict` | affecter des projets |
| Noms en initiales pour un rôle donné | niveau « pseudonymisé » | ajuster `DATA_PROTECTION_*_ROLES` |
| 422 `MASKED_VALUE_REJECTED` | formulaire enregistré avec valeurs masquées | recharger avec un rôle autorisé |
| `compare_live.py` : 401 | jeton expiré (24 h) ou clé de service fausse | renouveler |
| Aucun pli exploitable | trop peu de parcours clos / de projets | saisir plus de statuts |
Journal : page « Journal d'audit », action `PROTECTED_DATA_READ …`. Désactiver en urgence : `DATA_PROTECTION_MODE=off` (redémarrage) ou `--revert`.
