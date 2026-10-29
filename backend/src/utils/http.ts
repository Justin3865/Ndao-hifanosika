import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const ok = (res: Response, data: unknown) => res.json({ success: true, data });
export const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, message });

/** Enveloppe async : toute erreur est renvoyée proprement (Express 4 et 5). */
export const h = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch((e: any) => {
      if (e instanceof HttpError) return fail(res, e.status, e.message);
      next(e);
    });
  };

/** Id de l'utilisateur connecté (accepte les formes usuelles de req.user). */
export function reqUserId(req: any): number {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.sub ?? req.userId;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(401, "Non authentifié.");
  return id;
}
