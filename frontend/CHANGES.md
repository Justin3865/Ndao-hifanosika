# Corrections frontend
- `components/maps/GoogleMap.tsx` : props `route` / `onRouteInfo`, types `MapRoute` / `RouteInfo` (trajet routier via Directions API, repli en ligne droite) → la page /vulnerability compile et fonctionne.
- `components/chatbot/ChatBot.tsx` : lit `reply` / `table` / `zoneIds` renvoyés par `/api/ai/chat` (affichait toujours « Aucune réponse. »).
- `app/reset-password/page.tsx` : `useSearchParams()` enveloppé dans `<Suspense>` (le `next build` échouait).
- `lib/socket.ts` : port par défaut 4000 (était 5000, le temps réel ne se connectait pas sans variable d'environnement).
- `.env.local.example` : un seul NEXT_PUBLIC_API_URL (4000).
- `tsconfig.json` : 185 fichiers jamais importés depuis `app/` (src/services/*, src/hooks/*, anciens composants) exclus de la vérification : ils appellent des endpoints inexistants et ne compilaient pas. Liste dans `DEAD_CODE.txt` ; ils peuvent être supprimés.
- Vérifié : `tsc` 0 erreur, `next build` OK (60 pages).
