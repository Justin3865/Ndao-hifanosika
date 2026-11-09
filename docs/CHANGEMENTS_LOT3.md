# LOT 3 — ajouts (aucun comportement existant modifié)

| Besoin | Ajout | Où |
|---|---|---|
| Alerte RH « performance en baisse » (§5.3) | Règle pure + service + job quotidien + `GET /api/performance-drop` | `utils/performanceDropRules.ts`, `services/performanceDrop.service.ts`, `jobs/extraSchedulers.ts`, `routes/performanceDrop.routes.ts` |
| Livrables par jalon (§5.2) | Table `milestone_deliverables`, API CRUD + validation/rejet journalisés, page `/milestones/deliverables` | `prisma/schema.prisma`, migration `20261120000000_lot3_livrables_jalons`, `routes/milestoneDeliverables.routes.ts`, `srcf/.../milestones/deliverables/page.tsx` |
| Purge planifiée (§10) | Tâche quotidienne, **désactivée par défaut** | `jobs/extraSchedulers.ts` |
| Chiffrement au repos | Documentation de ce qu'il faut demander/prouver | `CHIFFREMENT_AU_REPOS.md` |
| Nettoyage | Commandes à exécuter vous-même | `NETTOYAGE_ET_REGLAGES.md` |

Modifications minimales de fichiers existants : `app.ts` (+4 lignes), `server.ts` (+2), `retention.controller.ts` (`targets` exportée, 1 mot), `schema.prisma` (+1 ligne de relation inverse dans `Milestone`, + nouveau modèle), `Sidebar.tsx` (+1 entrée), `tsconfig.test.json`, `.env.prod.example`.

À faire après extraction : `npx prisma migrate deploy` puis `npx prisma generate`, `npm run build` (srcb et srcf), `node --test` sur `test/performance-drop.test.ts`.

Seuils de « performance en baisse » (−20 % par rapport à la moyenne des 3 notes précédentes, au moins 2 notes d'historique) : valeurs par défaut à valider par la Direction.
