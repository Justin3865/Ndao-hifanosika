import { Request, Response } from "express";
/**
 * GET /api/projects
 *
 * ADMIN / DIRECTION / DAF / COORDINATOR
 *
 * Le COORDINATOR ne voit que les projets qu'il a créés.
 * Les autres rôles autorisés peuvent consulter l'ensemble des projets.
 */
export declare function getProjects(req: Request, res: Response): Promise<Response>;
/**
 * GET /api/projects/:id
 */
export declare function getProjectById(req: Request, res: Response): Promise<Response>;
/**
 * POST /api/projects
 */
export declare function createProject(req: Request, res: Response): Promise<Response>;
/**
 * PUT /api/projects/:id
 */
export declare function updateProject(req: Request, res: Response): Promise<Response>;
/**
 * DELETE /api/projects/:id
 *
 * La route doit déjà être protégée par :
 * authenticate + authorizeRoles("ADMIN")
 */
export declare function deleteProject(req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=project.controller.d.ts.map