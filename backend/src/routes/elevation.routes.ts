import { Router } from "express";
import { getElevation } from "../controllers/elevation.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getElevation);

export default router;