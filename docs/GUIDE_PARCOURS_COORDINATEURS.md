# Guide — pages « Parcours » et « Coordinateurs »

À ajouter aux guides utilisateur et administrateur. Les deux pages utilisent des API qui existaient déjà (`/api/journey`, `/api/project-coordinators`) :
rien n'a changé côté serveur.

## 1. Page « Parcours » (menu Programmes → Parcours)
**Qui** : administrateur, direction (lecture) et coordinateurs (limités à leurs projets). Seuls l'administrateur et les coordinateurs peuvent modifier.

**À quoi ça sert** : dire, pour chaque bénéficiaire, si son parcours est **en cours**, **terminé** ou en **abandon**. Ces statuts alimentent le taux d'abandon
et sont la seule source de vérité pour évaluer le modèle de risque d'abandon.

**Utilisation**
1. Filtrez par projet et/ou par statut, ou cherchez un nom.
2. Cliquez **Modifier** sur la ligne, choisissez le statut. Pour *terminé* ou *abandon*, indiquez la date ; pour *abandon*, un motif (facultatif — pas d'information personnelle sensible).
3. **Enregistrer**. Les cartes du haut (en cours, terminés, abandons, taux d'abandon) se mettent à jour. Un bénéficiaire sans statut est considéré « en cours ».

**Taux d'abandon** = abandons / (terminés + abandons). Les parcours en cours sont exclus : on ne sait pas encore comment ils finiront.

**Carte « Données disponibles pour évaluer le modèle »** (administrateur et direction) : indique si l'effectif suffit pour comparer les règles actuelles à un modèle appris
(30 parcours clos dont 5 de chaque sorte au minimum ; au-dessus de 100, les résultats sont plus fiables). Tant que c'est insuffisant, le score reste fondé sur des règles.

## 2. Page « Coordinateurs » (menu Organisation → Coordinateurs)
**Qui** : administrateur et direction.

**À quoi ça sert** : relier chaque coordinateur à ses projets. Un coordinateur affecté ne voit que ces projets (listes, tableaux de bord, rapports, carte des zones).

**Utilisation**
1. Choisissez le coordinateur et le projet, puis **Affecter**. Un coordinateur peut avoir plusieurs projets, un projet plusieurs coordinateurs.
2. Pour retirer une affectation : la croix à côté du nom, puis **Retirer** pour confirmer.
3. L'encadré orange liste les coordinateurs **sans projet** : tant qu'ils n'en ont aucun, ils gardent l'accès à tous les projets (mode de transition). Affectez-leur leurs projets
   avant de passer `COORDINATOR_SCOPE=strict` (sinon ils ne verront plus rien).

Un utilisateur doit avoir le rôle **Coordinateur** (créé dans « Utilisateurs ») pour apparaître dans la liste.
