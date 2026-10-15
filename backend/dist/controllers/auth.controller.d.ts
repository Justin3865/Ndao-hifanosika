import { Request, Response } from "express";
export declare function login(req: Request, res: Response): Promise<Response>;
export declare function register(req: Request, res: Response): Promise<Response>;
export declare function refresh(req: Request, res: Response): Promise<Response>;
export declare function me(req: Request, res: Response): Promise<Response>;
export declare function logout(_req: Request, res: Response): Promise<Response>;
export declare function forgotPassword(_req: Request, res: Response): Promise<Response>;
export declare function verifyResetCode(_req: Request, res: Response): Promise<Response>;
export declare function resetPassword(_req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=auth.controller.d.ts.map