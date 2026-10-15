import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
/**
 * GET /api/milestones
 *
 * Récupère les jalons.
 *
 * COORDINATOR :
 * uniquement les jalons des projets qu'il a créés.
 *
 * Les autres rôles autorisés par les routes :
 * ADMIN, DIRECTION, TUTEUR_L3, TUTEUR_M2
 * peuvent voir tous les jalons.
 */
export declare function getMilestones(req: AuthenticatedRequest, res: Response): Promise<Response>;
/**
 * GET /api/milestones/:id
 *
 * Récupère un jalon par son identifiant.
 */
export declare function getMilestoneById(req: AuthenticatedRequest, res: Response): Promise<Response>;
/**
 * POST /api/milestones
 *
 * Création d'un jalon.
 *
 * Le createdById n'existe pas dans Milestone.
 * Le contrôle d'accès se fait donc via le propriétaire
 * du projet.
 */
export declare function createMilestone(req: AuthenticatedRequest, res: Response): Promise<Response>;
/**
 * PUT /api/milestones/:id
 *
 * Modification d'un jalon.
 */
export declare function updateMilestone(req: AuthenticatedRequest, res: Response): Promise<Response>;
/**
 * DELETE /api/milestones/:id
 *
 * Suppression d'un jalon.
 */
export declare function deleteMilestone(req: AuthenticatedRequest, res: Response): Promise<Response>;
//# sourceMappingURL=milestone.controller.d.ts.map