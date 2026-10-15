-- Stocke uniquement le hash des refresh tokens révoqués.
CREATE TABLE "RevokedRefreshToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevokedRefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RevokedRefreshToken_tokenHash_key" ON "RevokedRefreshToken"("tokenHash");
CREATE INDEX "RevokedRefreshToken_expiresAt_idx" ON "RevokedRefreshToken"("expiresAt");
