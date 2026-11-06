# Conformité — lot 20261110

## Ce que ce lot ajoute (écart signalé : « pas d'interface »)
| Écart du tableau de conformité | État | Remarque |
|---|---|---|
| §5.1 — « coordinateur → projets » : backend fait, aucune page | **page `/coordinateurs`** | affecter / retirer ; alerte sur les coordinateurs sans projet (mode de transition) |
| §5.4 — « pas d'UI parcours » / label d'abandon | **page `/parcours`** | statut actif / terminé / abandon avec date et motif, taux d'abandon, carte « effectif suffisant pour évaluer le modèle » |
| §11 — MCD/MLD manquants | **`docs/MCD_MLD.md`** | généré depuis `schema.prisma` (49 modèles, 52 relations, 30 références logiques) ; script de régénération fourni |
| §11 — plan de maintenance manquant | **`docs/PLAN_DE_MAINTENANCE.md`** | fondé sur les scripts et la CI réellement présents ; liste aussi ce qui n'existe pas |
| Guides | **`GUIDE_PARCOURS_COORDINATEURS` (fr + mg)** | à fusionner dans les guides existants |

Le document `CONFORMITE_CAHIER_DES_CHARGES.md` du dépôt cite déjà `srcf/src/app/parcours` et `srcf/src/app/coordinateurs` : ces dossiers n'existaient pas dans l'archive reçue,
ce lot rend cette phrase exacte.

## Vérifications faites
- Tests unitaires front : **19 / 19** réussis (dont 4 nouveaux sur `journey.ts`, la parité des clés fr/mg et les phrases malgaches).
- Syntaxe des 2 pages, du menu et des règles d'accès : compilée sans erreur ; types vérifiés avec `tsc` contre des déclarations simplifiées des modules (React, lucide, composants internes) — **pas** avec les vraies dépendances.
- Règles d'accès et appels API relus contre `journey.routes.ts`, `projectCoordinators.routes.ts` et `lookups.routes.ts` : rôles identiques (modification des parcours : ADMIN, COORDINATOR ; lecture des labels : ADMIN, DIRECTION ; affectations : ADMIN, DIRECTION).

## Non vérifié (à faire chez vous)
- `npm run typecheck` et `npm run build` avec les vraies dépendances ; ouverture des deux pages dans un navigateur avec chaque rôle.
- Rendu du diagramme Mermaid de `MCD_MLD.md` (volumineux : 49 entités) dans votre éditeur.
- Relecture des 18 phrases malgaches ajoutées par un locuteur natif.

## Écarts du cahier des charges **toujours ouverts** (non traités : ils demandent des tables ou des règles métier nouvelles)
Présence aux séances des bénéficiaires ; objectifs individuels / KPI RH ; convention de stage et dépôt du rapport ou mémoire ; politique de conservation et de purge ;
consentement des tuteurs légaux pour les mineurs ; export JSON (portabilité) ; chiffrement des données au repos ; maquettes validées ; rapport de recette complet ; support de formation.
Chacun nécessite d'abord une décision de l'ONG (durées, contenu des formulaires) puis une migration : à traiter lot par lot, pas à improviser.

## Mémoire
Je n'ai pas la norme de votre établissement : envoyez le guide ou un mémoire modèle pour que je vérifie page de garde, sommaire, listes, marges, police, interligne, nombre de pages et bibliographie.
