# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
# DATABASE_URL factice : requise uniquement pour que prisma.config.ts se charge pendant la génération
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npx tsc -p tsconfig.json

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# `prisma` (CLI) est nécessaire pour `migrate deploy` au démarrage
RUN npm i --no-save prisma@^7.10.0 && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY data ./data
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-4000}/health || exit 1
CMD ["node", "dist/src/server.js"]
