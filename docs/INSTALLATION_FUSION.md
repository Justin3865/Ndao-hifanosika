# Installation du paquet unique `tout-en-un.zip`

Calculé sur vos derniers zips (srcb, srcf, ai, ml, ivelany). Ce zip remplace, **à lui seul**, tous les zips d'ajout et le lot C : `srcb-ajout`, `srcf-ajout`, `ivelany-ajout`, `ajout3`, `ajout4` et `lotC_securite_recette_fichiers_modifies`. Ne pas les extraire en plus : les rakitra mifandona (`app.ts`, `server.ts`) dia efa nampifanarahana tao.

1. Sauvegarder les dossiers actuels (ou `git commit`).
2. Extraire dans le dossier qui contient `srcb`, `srcf`, `ai`, `ml`, `ivelany` (accepter l'écrasement).
3. `cd srcb && npm install` (nouvelles dépendances du lot C : `compression`) puis `npx prisma migrate deploy` et `npx prisma generate`.
4. `cd srcf && npm install` (lot C : `@playwright/test`).
5. `npm run build` dans `srcb` et `srcf`, puis les tests.

Points à savoir
- `app.ts` : fusion à trois sources (votre dernière version avec le tableau de bord département, le lot C, et mes ajouts) ; la route `/api/dashboard` est conservée.
- Nouvelle migration : `20261120000000_lot3_livrables_jalons` (table `milestone_deliverables`), purement additive.
- Aucun fichier n'est supprimé par ce paquet.
