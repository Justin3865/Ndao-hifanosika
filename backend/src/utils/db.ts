import { prisma } from "../config/database";

/**
 * Accès aux modèles ajoutés récemment (Zone, Certificate, AiModel) sans dépendre
 * de la génération des types : fonctionne dès que la migration est appliquée.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = prisma as any;
