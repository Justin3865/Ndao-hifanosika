import { Router } from "express";

import {
  getSettings,
  twoFactorBackupCodes,
  twoFactorDisable,
  twoFactorEnable,
  twoFactorSetup,
  twoFactorStatus,
  updateSettings,
} from "../controllers/settings.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Tous les rôles : chacun gère ses propres paramètres
router.use(authenticate);

router.get("/", getSettings);
router.put("/", updateSettings);

router.get("/2fa", twoFactorStatus);
router.post("/2fa/setup", twoFactorSetup);
router.post("/2fa/enable", twoFactorEnable);
router.post("/2fa/disable", twoFactorDisable);
router.post("/2fa/backup-codes", twoFactorBackupCodes);

export default router;
