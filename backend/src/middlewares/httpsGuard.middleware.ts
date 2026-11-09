import { NextFunction, Request, Response } from "express";

import { decideHttps } from "../utils/securityConfig";

/**
 * HTTPS obligatoire (cahier §10) quand FORCE_HTTPS=1. À activer derrière le proxy TLS, avec TRUST_PROXY=1
 * pour que X-Forwarded-Proto soit fiable. Sans FORCE_HTTPS, ce middleware ne fait rien.
 */
const forceHttps = ["1", "true", "yes", "on"].includes(String(process.env.FORCE_HTTPS ?? "").trim().toLowerCase());

export function httpsGuard(req: Request, res: Response, next: NextFunction): void {
  const decision = decideHttps({
    forceHttps,
    secure: req.secure,
    forwardedProto: req.header("x-forwarded-proto"),
    method: req.method,
    path: req.path,
  });

  if (decision === "allow") {
    next();
    return;
  }
  if (decision === "redirect") {
    res.redirect(308, `https://${req.headers.host ?? ""}${req.originalUrl}`);
    return;
  }
  res.status(403).json({ success: false, message: "HTTPS obligatoire pour cette requête." });
}
