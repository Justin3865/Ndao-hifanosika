import "dotenv/config";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `La variable d'environnement ${name} est obligatoire.`,
    );
  }

  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT || 5000),

  DATABASE_URL: requiredEnv("DATABASE_URL"),

  FRONTEND_URL:
    process.env.FRONTEND_URL || "http://localhost:3000",

  CORS_ORIGIN:
    process.env.CORS_ORIGIN || "http://localhost:3000",

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "ndao-hifanosika-development-secret",

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN || "1d",

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "ndao-hifanosika-refresh-development-secret",

  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",
} as const;

if (Number.isNaN(env.PORT)) {
  throw new Error("PORT doit être un nombre valide.");
}