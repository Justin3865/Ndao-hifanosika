import { Request, Response } from "express";
/**
 * GET /api/activities
 *
 * Consultation des activités.
 */
export declare function getActivities(req: Request, res: Response): Promise<Response>;
/**
 * GET /api/activities/:id
 */
export declare function getActivityById(req: Request, res: Response): Promise<Response>;
/**
 * POST /api/activities
 */
export declare function createActivity(req: Request, res: Response): Promise<Response>;
/**
 * PUT /api/activities/:id
 */
export declare function updateActivity(req: Request, res: Response): Promise<Response>;
/**
 * DELETE /api/activities/:id
 */
export declare function deleteActivity(req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=activity.controller.d.ts.map