import { Router } from "express";

import {
  aiHealth,
  scoreDropoutRisk,
} from "../controllers/ai.controller";

const router = Router();

router.get("/health", aiHealth);
router.post("/score/dropout-risk", scoreDropoutRisk);

export default router;