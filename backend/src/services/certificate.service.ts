import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Code de certificat vérifiable sans stockage supplémentaire :
 *   NH-<idStage>-<signature HMAC-SHA256 tronquée>
 * Impossible à falsifier sans JWT_SECRET.
 */
const sign = (id: number) =>
  createHmac("sha256", process.env.JWT_SECRET ?? "")
    .update(`certificate:${id}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

export const buildCertificateCode = (internshipId: number) =>
  `NH-${internshipId}-${sign(internshipId)}`;

export function parseCertificateCode(code: string): number | null {
  const m = /^NH-(\d{1,9})-([0-9A-F]{10})$/.exec(String(code).trim().toUpperCase());
  if (!m) return null;
  const id = Number(m[1]);
  const a = Buffer.from(m[2]);
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export const isCompletedStatus = (status: unknown) =>
  ["COMPLETED", "TERMINE", "DONE", "FINISHED"].includes(String(status ?? "").toUpperCase());
