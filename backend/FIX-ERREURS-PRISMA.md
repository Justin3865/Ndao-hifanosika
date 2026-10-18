# Ndao Hifanosika — correctif Prisma / GPS / IA

Ce correctif synchronise `prisma/schema.prisma` avec les migrations déjà présentes dans le projet.

## Erreurs corrigées

- `Unknown argument sharingLocation`
- `Unknown field notifyEmail`
- `Unknown argument latitude / longitude / altitude`
- `Unknown argument locationUpdatedAt`
- `scoreHouseholds(): db.zone is undefined`
- modèles Prisma manquants : `Zone`, `Certificate`, `AiModel`
- champs de vulnérabilité manquants sur `Beneficiary`
- incohérence GPS entre `User` et `UserLocation`

## Installation

Dans `C:\ndao-hifanosika\backend` :

```cmd
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run dev
```

## Important : erreur PostgreSQL 42501

Si l'API affiche encore :

```text
droit refusé pour la table Notification
```

cela n'est pas une erreur Prisma de schéma : c'est un problème de droits PostgreSQL.

1. Ouvrir PostgreSQL/pgAdmin avec un compte administrateur.
2. Ouvrir `FIX-DATABASE-PERMISSIONS.sql`.
3. Remplacer `ndao_app` par le rôle PostgreSQL réellement utilisé dans `DATABASE_URL`.
4. Exécuter le script.
5. Relancer le backend.

## Architecture GPS retenue

`UserLocation` devient la source canonique de la dernière position GPS d'un agent.

Le backend maintient aussi les anciens champs GPS de `User` pour compatibilité avec les écrans existants.

Ainsi :

- WebSocket `mission:location` → `UserLocation` + compatibilité `User`
- `/api/vulnerability/my-location` → `UserLocation` + compatibilité `User`
- `/api/tracking/staff` → `UserLocation`
- IA / chatbot → `UserLocation`
- `mission:stop` supprime la position active de `UserLocation`
