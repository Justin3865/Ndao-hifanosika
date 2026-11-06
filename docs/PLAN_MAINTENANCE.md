# Plan de maintenance et d'évolution — Plateforme S&E Ndao Hifanosika

## 1. Responsabilités
| Rôle | Responsabilité |
|---|---|
| Référent DSI | exploitation, sauvegardes, mises à jour, gestion des comptes et des accès |
| Référent RH | grilles d'évaluation, campagnes, objectifs individuels, documents de stage |
| Direction | validation des évolutions, arbitrage des priorités, durées de conservation |
| Coordinateurs | qualité de la saisie (présences, statuts de parcours, consentements) |

## 2. Maintenance préventive
| Fréquence | Action | Outil / procédure |
|---|---|---|
| Quotidienne | Sauvegarde PostgreSQL automatique ; contrôle que `/health` répond | `deploy/` (sauvegarde), supervision |
| Hebdomadaire | Relire les alertes d'anomalies et les lenteurs (`/api/metrics/perf`) | page Analyses IA, journal des lenteurs |
| Mensuelle | **Test de restauration** de la sauvegarde sur une base vide | `test-restore.sh` (« Restauration OK : N tables ») |
| Mensuelle | Simuler puis exécuter la purge des journaux techniques | Administration › Conservation des données |
| Trimestrielle | Mettre à jour les dépendances (npm, pip), relancer `npm run check`, `pytest`, recette | CI GitHub Actions |
| Trimestrielle | Revoir les comptes inactifs et les rôles | Utilisateurs, Rôles & accès, Journal d'audit |
| Annuelle | Revoir la politique de conservation avec la Direction et les bailleurs ; renouveler les secrets (JWT, clé API IA) | `RETENTION_*`, variables d'environnement |

## 3. Maintenance corrective
1. Toute anomalie est consignée (date, rôle, page, capture, étapes).
2. Classement : **critique** (perte ou fuite de données, connexion impossible) → correction sous 24 h ; **majeure** (fonction cœur indisponible) → 3 jours ouvrés ; **mineure** → prochain lot.
3. Correction sur une branche, tests automatiques verts (`npm run check`), validation sur la recette, puis mise en production.
4. Retour arrière : redéploiement de l'image précédente ; les migrations sont additives, donc sans perte de données.

## 4. Maintenance évolutive
* Chaque évolution passe par : besoin validé → migration additive → tests → recette → production.
* Après chaque migration : régénérer le MCD/MLD (`python scripts/gen-mcd.py`) et mettre à jour `CONFORMITE_CAHIER_DES_CHARGES.md`.
* **Évolutions prévues** (hors phase 1) : portail bénéficiaire (phase 2 du cahier), stockage objet pour les documents, entraînement du modèle de risque d'abandon quand ≥ 30 parcours clos (dont ≥ 5 abandons) existent, intégration du taux de présence comme variable du modèle, chiffrement au repos selon l'hébergement retenu.

## 5. Surveillance et indicateurs
Disponibilité cible 99 % ; temps de réponse API p95 ≤ 500 ms (hors IA) et pages ≤ 2 s ; taux d'adoption ≥ 80 % à 3 mois ; usage effectif des alertes IA par les coordinateurs et la RH (cahier §13).

## 6. Continuité
Le service IA est facultatif (dégradation gracieuse) : son arrêt ne bloque pas la plateforme. Sauvegarde et restauration documentées dans `DEPLOIEMENT.md`.
