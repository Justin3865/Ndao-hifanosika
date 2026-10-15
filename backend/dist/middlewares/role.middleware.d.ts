import { NextFunction, Request, Response } from "express";
export declare function authorizeRoles(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=role.middleware.d.ts.map