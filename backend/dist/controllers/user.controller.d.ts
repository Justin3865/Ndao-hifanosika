import { Request, Response } from "express";
/**
 * GET /api/users
 */
export declare function getUsers(_req: Request, res: Response): Promise<Response>;
/**
 * GET /api/users/:id
 */
export declare function getUserById(req: Request, res: Response): Promise<Response>;
/**
 * POST /api/users
 *
 * ADMIN uniquement.
 *
 * Contrairement à /auth/register,
 * l'ADMIN peut choisir le rôle.
 */
export declare function createUser(req: Request, res: Response): Promise<Response>;
/**
 * PUT /api/users/:id
 *
 * ADMIN uniquement.
 */
export declare function updateUser(req: Request, res: Response): Promise<Response>;
/**
 * DELETE /api/users/:id
 *
 * ADMIN uniquement.
 */
export declare function deleteUser(req: Request, res: Response): Promise<Response>;
/**
 * PATCH /api/users/:id/activate
 *
 * ADMIN uniquement.
 *
 * PENDING -> ACTIVE
 */
export declare function activateUser(req: Request, res: Response): Promise<Response>;
/**
 * PATCH /api/users/:id/reject
 *
 * ADMIN uniquement.
 *
 * PENDING -> REJECTED
 */
export declare function rejectUser(req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=user.controller.d.ts.map