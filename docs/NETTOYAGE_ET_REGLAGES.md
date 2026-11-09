# Nettoyage et réglages restants — à faire par vous (rien n'a été supprimé)

Je n'ai supprimé aucun fichier : vos règles interdisent de modifier l'existant, et plusieurs suppressions demandent une vérification chez vous. Voici les commandes, avec ce qu'il faut contrôler avant.

## 1. Fichiers à retirer (après relecture de leur contenu)
```bash
cd srcf && git rm DEAD_CODE.txt src/app/page.tsx.backup
cd ../srcb && git rm appliquer-budget.py appliquer-protection-perimetre.py db-actuelle.prisma prisma-additions.prisma prisma7.config.ts
```
Contrôles : `appliquer-*.py` — le zip analysé en contenait 2 dans `srcb` ; ouvrir chacun pour vérifier qu'il n'est plus nécessaire. `prisma7.config.ts` — vérifier que `package.json` et la CI n'y font pas référence (`grep -rn prisma7 .`). `DEAD_CODE.txt` : lire la liste avant de supprimer ce qu'elle cite.

## 2. `srcf/src/services/api.ts` : **ne pas supprimer le fichier**
Il sert aussi à l'API principale (`GeoPicker`, `evaluation.service`, `notification.service`, `member.service`…). Seule la partie « client IA direct » (`AI_API_BASE_URL`, `aiClient`, et les méthodes qui l'utilisent vers les lignes 691 et 711) est concernée, car la règle §7.3 impose de passer par le backend. Avant de la retirer : `grep -rn "aiService" srcf/src` pour voir si `services/ai.service.ts` est encore importé quelque part.

## 3. Réglages
- `COORDINATOR_SCOPE=strict` dans l'environnement de production : sans affectation à un projet, un coordinateur n'a plus accès. Vérifier d'abord que chaque coordinateur est affecté (`/coordinateurs`).
- Ordre des migrations : les dossiers sont datés 20261109… à 20261120…. Prisma les applique par ordre de nom ; ne pas renommer. La migration ajoutée ici est `20261120000000_lot3_livrables_jalons` (après la dernière, 20261119000002).
- Purge planifiée : `RETENTION_AUTOPURGE=true` seulement après validation des durées par la Direction.

## 4. Non fait, et pourquoi
- **Mode hors-ligne (§6)** : la dernière version de votre `srcf` contient déjà `offline.html`, `manifest.webmanifest` et un `sw.js` modifié ; je n'y ai pas touché et je ne l'ai pas testé (navigateur requis).
- **Tests d'intégration PostgreSQL, tests composants, recette R01–R26** : nécessitent une base et un navigateur.
- **Traduction malagasy complète** : voir la réponse précédente.
