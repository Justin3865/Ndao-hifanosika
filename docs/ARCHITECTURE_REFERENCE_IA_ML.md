# Architecture de référence IA / ML — Ndao Hifanosika

*Document destiné au mémoire. Il décrit ce qui est réellement implémenté (code livré) et la règle de repli entre les trois composants.*

## 1. Principe directeur

L'IA de la plateforme est une **aide à la décision** : elle ne décide jamais seule, chaque résultat est expliqué (facteurs, formule) et un humain valide. Aucun composant n'est indispensable au fonctionnement de la plateforme : **chaque fonction a un repli**, et la panne d'un service Python se traduit par une réponse moins riche, jamais par une erreur.

## 2. Les trois composants

| # | Composant | Technologie | Rôle | Données lues |
|---|---|---|---|---|
| A | **Backend natif** (`srcb/src/ml`, `insights.controller.ts`, `narrative.service.ts`) | Node/TypeScript | Règles + statistiques, modèles légers (SGD logistique, MLP), jeux d'entraînement/test, chatbot | PostgreSQL via Prisma |
| B | **ai_service** | FastAPI (Python) | Anomalies (25+ types), performance des projets, risque d'abandon, synthèse chiffrée et narrative (LLM optionnel) | PostgreSQL en lecture (`/v1/live/*`) ou données envoyées par le backend |
| C | **ml_service** | FastAPI + scikit-learn | Modèles appris (SGD, forêt aléatoire, gradient boosting, MLP), score de vulnérabilité par ménage et par zone, rapport d'apprentissage | `GET /api/service/dataset` (clé de service) |

## 3. Quel composant est le fondement, lequel est le repli

Le choix découle du code (ordre d'appel réel), pas d'une préférence :

| Fonction | Fondement (1er essai) | Repli 1 | Repli 2 (garanti) |
|---|---|---|---|
| Anomalies, performance, risque d'abandon (règles) | **B** `ai_service` mode *live* | B en mode « données envoyées » (`POST /v1/insights`) | **A** calcul local TypeScript |
| Synthèse narrative | **B** règles | B + reformulation LLM *rejetée si un chiffre est inventé* | **A** `narrative.service.ts` |
| Score de vulnérabilité par zone | **C** `ml_service` (`/predict-zones`) | **A** modèle natif (SGD + MLP) s'il est entraîné | indice terrain seul (65 % taux de vulnérables, 20 % altitude, 15 % éloignement) |
| Comparaison des méthodes, jeux de données train/test | **A** (exécution dans la plateforme) | — | — |
| Évaluation scientifique (baseline vs ML) | **C** scripts `compare_baseline.py` / `compare_live.py` | — | — |

Règle de lecture : **B est le fondement des indicateurs de pilotage** (explicables, toujours calculables), **C est le fondement de l'apprentissage statistique**, **A est le socle de secours commun** : il garantit qu'aucune page ne casse. Les mécanismes de repli sont temporisés (pause d'une minute après un échec) pour ne pas ralentir chaque requête.

## 4. Flux

```
Navigateur ──► API Express (A) ──► scopeOverlay (périmètre coordinateur + protection des données)
                   │
                   ├─► ai_service (B)  ◄── PostgreSQL (lecture)
                   ├─► ml_service (C)  ◄── /api/service/dataset  (x-service-key)
                   └─► calcul local (A) si B ou C ne répondent pas
```
B et C ne sont **jamais exposés** hors du réseau privé (ports fermés en production, clé `x-service-key` obligatoire, comparaison en temps constant). Les filtres de périmètre et de protection s'appliquent côté A, avant toute réponse au navigateur.

## 5. Honnêteté méthodologique

1. **Le score de risque d'abandon actuel est un score à règles pondérées à la main** (projet suspendu +30, jalons en retard jusqu'à +25, évaluations faibles +20, vulnérable +15, âge < 14 ans +5 ; « élevé » à partir de 60). Ce n'est pas un modèle entraîné.
2. Pour savoir si un modèle appris fait mieux, `ml_service/compare_live.py` relie les **vrais labels** (`GET /api/journey/labels` : 1 = abandon, 0 = terminé, parcours actifs exclus) aux variables (`GET /api/service/dropout-features`) et compare la **réplique exacte** du score actuel à trois modèles (régression logistique, forêt aléatoire, gradient boosting).
3. Validation croisée **groupée par projet** : les variables de niveau projet sont identiques pour tous ses bénéficiaires ; sans groupage, le modèle reconnaîtrait le projet et le résultat serait trop optimiste.
4. `days_since_seen` est exclue par défaut : on ne revoit plus un bénéficiaire qui a abandonné, la variable est une *conséquence* du label (fuite temporelle).
5. Critère de décision : un modèle n'est retenu que s'il dépasse la baseline de façon stable (écart de PR-AUC supérieur à l'écart-type entre plis, rappel non dégradé). Sinon la conclusion est « non concluant » ou « conserver les règles ».
6. Limites à écrire dans le mémoire : label saisi par les coordinateurs ; variables mesurées à la date d'export et non à la date d'abandon ; aucune donnée de présence aux séances pour les bénéficiaires dans la base ; petits effectifs (le rapport signale tout échantillon < 100 parcours clos). Les chiffres du mode `--synthetic` de `compare_baseline.py` sont **fictifs** et ne doivent jamais être cités comme résultats.

## 6. Gouvernance des données (lien avec la protection)

- Les données d'entraînement exportées vers Python ne contiennent **ni nom, ni contact, ni CIN, ni GPS précis**.
- Les mineurs (< 18 ans) et les femmes vulnérables sont protégés dans toutes les réponses de l'API selon le rôle (voir GUIDE_ADMINISTRATEUR §5). Les comptages de moins de 5 personnes sont supprimés dans les agrégats.
- Un coordinateur ne voit que ses projets, y compris dans les tableaux de bord, rapports et analyses (voir GUIDE_ADMINISTRATEUR §4).
- Chaque lecture en clair de données protégées est journalisée (comptages uniquement).

## 7. Évolutions possibles
Collecter la présence aux séances des bénéficiaires (aujourd'hui absente) ; recalibrer les pondérations des règles à partir des résultats de `compare_live.py` ; suivre la dérive des modèles à chaque ré-entraînement ; documenter une analyse d'impact sur la protection des données (AIPD) avant tout usage décisionnel automatisé.
