# Lot « Chatbot du projet + dictionnaire FR / EN / MG »

Tous les fichiers sont à copier **par-dessus** le projet (mêmes chemins). Aucune migration de base de données.

## 1. Dictionnaire et traduction de l'interface (srcf)
| Fichier | Changement |
|---|---|
| `src/lib/i18n/dictionaries.ts` | `Lang = fr \| mg \| en` ; bloc `en` (92 clés, mêmes clés et mêmes `{variables}` que `fr`) ; bouton **EN** ajouté |
| `src/lib/i18n/phrases.en.ts` (nouveau) | 1 285 textes français → anglais (même mécanisme que `phrases.mg.ts`, dates et motifs à trous inclus) |
| `src/lib/i18n/phrases.ts` (nouveau) | aiguilleur `translateFor(lang, texte)` |
| `src/lib/i18n/translate.ts` | `isLang` accepte `en` |
| `src/components/i18n/AutoTranslate.tsx` | traduit vers `mg` **ou** `en`, restaure le français |
| `src/app/ai/chat/page.tsx`, `src/components/chatbot/ChatBot.tsx` | textes dans les 3 langues, envoi de la langue de l'interface au serveur |
| `src/lib/__tests__/i18n.test.ts`, `phrases-en.test.ts` | clés identiques dans les 3 langues, variables conservées, aucune traduction vide, le dictionnaire fait foi |

## 2. Chatbot (srcb)
| Fichier | Rôle |
|---|---|
| `src/utils/chatLangRules.ts` | détection FR / EN / MG ; **glossaire unique** (mêmes mots que l'interface : tetikasa, hetsika, mpahazo tombontsoa, fanombanana, tatitra…) ; libellés de statuts |
| `src/utils/chatKnowledgeRules.ts` | base de connaissances **sur le projet** (connexion, rôles, ajouter un bénéficiaire, parcours, risque d'abandon, rapports, exports, notifications, mot de passe, mission GPS, zones, protection des données, anomalies/notes, stages, dépannage, aide), 3 langues, tirée des guides du dossier `docs/` |
| `src/utils/chatTranslateRules.ts` + `src/data/lexicon.ts` | traduction **contrôlée** FR ↔ EN ↔ MG à partir du lexique de l'interface (1 308 entrées). Phrase inconnue → expressions proches, **jamais de traduction inventée** |
| `src/services/projectChat.service.ts` | réponses sur les **vraies données** : nombre/état des projets, activités, jalons en retard, bénéficiaires, évaluations, stages, fiche d'un projet nommé. Respecte le périmètre du coordinateur ; effectifs < `PROTECT_MIN_CELL` masqués, sans recoupement |
| `src/services/anomalyChat.service.ts` | réponses anomalies en FR/EN/MG (gravité traduite) |
| `src/ml/chatbot.ts` | langue détectée dans la question (repli : langue de l'interface), réponse dans **cette** langue ; ordre : traduction → anomalies → salutations → « comment… » (connaissances) → entraînement → données projet → ménages/zones/agents → connaissances → aide |
| `src/controllers/ml.controller.ts` | accepte `lang` (indice) |
| `scripts/build-chat-lexicon.py` | régénère `lexicon.ts` : `python scripts/build-chat-lexicon.py ../srcf` (à relancer après toute modification des dictionnaires) |
| `test/chat-rules.test.ts`, `tsconfig.test.json` | 13 tests (langue, glossaire, connaissances ×3 langues, traduction) |

## 3. Exemples
- « Combien de projets sont actifs ? » / « How many projects are active? » / « Firy ny tetikasa mavitrika? »
- « Quel est l'état du projet *Nom* ? » · « Quelles activités sont en retard ? » · « Quelles évaluations sont à valider ? »
- « Comment ajouter un bénéficiaire ? » · « Ahoana no anovana ny fiteny? »
- « Traduis *Mot de passe oublié ?* en malgache » · « Translate *Save* into Malagasy » · « Adikao amin'ny frantsay: *Tahirizina* »

## 4. Vérifié / non vérifié
- Vérifié ici : compilation TypeScript des nouveaux fichiers (strict), 13 tests backend + 17 tests frontend, simulation du chatbot avec une base simulée dans les 3 langues.
- **Non exécuté** : `npm run check` complet, `next build`, appels réels à PostgreSQL/Prisma (pas de `node_modules` ni de base ici). À lancer chez vous.
- Dans `projectChat.service.ts` l'accès passe par `db` (any) : vérifier les noms de champs si le schéma Prisma change.

## 5. Limites connues (à dire honnêtement à la Direction)
1. **Malagasy et anglais = BROUILLON** à faire relire par un locuteur avant remise (comme `phrases.mg.ts`). Le vocabulaire malagasy du chatbot est aligné sur l'interface, mais certains mots de l'interface restent discutables (ex. « Ankohonana » vs « Tokantrano » pour *ménage*, voir `docs/CONFLITS_DIKAN-TENY_MG.csv`).
2. **Couverture de l'interface** : `docs/outils/i18n-a-traduire.csv` liste environ **1 500 textes** du code encore absents des dictionnaires (pages d'accueil, anomalies, certificats, stages…) : ils restent en français en MG **et** en EN. Ce lot traduit les 1 285 déjà présents, pas ces 1 500.
3. Le chatbot ne traduit que ce qui figure dans le lexique ; ce n'est pas un traducteur libre (choix volontaire, cohérent avec « aucun chiffre inventé »).
4. Les réponses du chatbot sont rédigées par règles : une question très éloignée des sujets ci-dessus renvoie un message d'aide avec suggestions.
