import { Router, type RequestHandler } from "express";
import { h, ok, reqUserId } from "../utils/http";
import { getUserSettings, resetUserSettings, saveUserSettings } from "../utils/userSettings";

/** Monter avec : app.use("/api/settings", settingsRouter(authenticate)) */
export function settingsRouter(authenticate: RequestHandler): Router {
  const router = Router();
  router.get("/", authenticate, h(async (req, res) => ok(res, await getUserSettings(reqUserId(req)))));
  router.put("/", authenticate, h(async (req, res) => ok(res, await saveUserSettings(reqUserId(req), req.body))));
  router.delete("/", authenticate, h(async (req, res) => ok(res, await resetUserSettings(reqUserId(req)))));
  return router;
}
