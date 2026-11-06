# Plan de maintenance — Ndao Hifanosika

Ce plan décrit ce qui est **déjà outillé** dans le dépôt et ce qu'il reste à **décider ou organiser** par l'ONG. Rien ici n'a été mesuré en production :
les fréquences sont des recommandations, à ajuster après les premiers mois d'exploitation.

## 1. Ce que le dépôt fournit déjà
| Domaine | Outil existant | Où |
|---|---|---|
| Sauvegarde PostgreSQL | `backup.sh` : dump au format custom, vérification de l'archive (`pg_restore --list`), rotation (14 jours par défaut, `BACKUP_KEEP_DAYS`) | `deploy/scripts/` |
| Restauration | `restore.sh` ; `test-restore.sh` pour **prouver** qu'une sauvegarde se restaure | `deploy/scripts/` |
| Intégration continue | tests et typage back / front, tests Python (IA, ML), migrations sur base vide, scénarios de périmètre coordinateurs | `.github/workflows/ci.yml` |
| Environnements | dev, staging, prod (fichiers compose et `.env.*.example` séparés) | `deploy/` |
| Traçabilité | journal d'audit applicatif (page « Journal d'audit »), accès aux données protégées journalisés | application |
| Santé | `GET /health` et `GET /api/health` | backend |

## 2. Calendrier recommandé
| Fréquence | Tâche | Responsable proposé |
|---|---|---|
| Chaque jour | vérifier que la sauvegarde a produit un fichier récent et non vide ; consulter les erreurs du journal | DSI |
| Chaque semaine | consulter le journal d'audit (accès aux données protégées, échecs de connexion) ; vérifier l'espace disque | DSI |
| Chaque mois | **test de restauration** (`test-restore.sh`) sur un environnement de test ; mise à jour de sécurité des images et dépendances (CI verte exigée) ; revue des comptes (départs, rôles) | DSI + ADMIN |
| Chaque trimestre | relancer `ML/compare_live.py` si de nouveaux parcours clos ont été saisis ; relire les affectations coordinateurs ↔ projets ; revue des droits (page « Rôles & accès ») | ADMIN + Direction |
| Chaque année | revue de la politique de conservation et de purge des données ; revue du dictionnaire malgache par un locuteur natif ; exercice de reprise après sinistre complet | Direction + DSI |

## 3. Types de maintenance
- **Corrective** : un incident est décrit (page, heure, action) → reproduit en staging → corrigé avec un test qui l'aurait détecté → déployé via la CI.
- **Évolutive** : toute nouvelle fonctionnalité passe par une migration Prisma versionnée et un test ; pas de modification directe de la base de production.
- **Préventive** : mises à jour mensuelles, test de restauration, surveillance de l'espace disque et des temps de réponse (`perfMiddleware`).
- **Données / IA** : le score d'abandon est à règles tant que le nombre de parcours clos est insuffisant ; réévaluer le modèle avec `compare_live.py`
  quand l'effectif le permet (≥ 30 parcours clos dont 5 de chaque sorte ; fiable à partir d'environ 100). Ne jamais présenter un résultat appris sans ce contrôle.

## 4. Mise en production et retour arrière
1. Sauvegarde complète juste avant le déploiement.
2. Déploiement en staging, parcours de recette (`docs/PLAN_DE_TESTS_RECETTE.md`), puis production.
3. Retour arrière : image précédente + restauration de la sauvegarde si une migration a modifié les données. Les migrations destructrices sont à éviter ou à découper en deux versions.

## 5. Ce qui n'est pas encore en place (à ne pas affirmer dans le mémoire)
- Politique de **conservation et purge** des données personnelles : à décider avec l'ONG (durées par type de donnée) puis à automatiser.
- **Chiffrement des données au repos** et chiffrement des sauvegardes : non constatés dans le dépôt.
- **Consentement des tuteurs légaux** pour les mineurs : pas de mécanisme dans l'application.
- Supervision externe (alertes automatiques en cas d'indisponibilité) : non fournie.
- Contrat de niveau de service (disponibilité de 99 %) : objectif, non mesuré.
