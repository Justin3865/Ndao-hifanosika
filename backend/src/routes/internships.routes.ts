import { Router } from "express";

import {
  getInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
} from "../controllers/internship.controller";

const router = Router();

router.get("/", getInternships);
router.get("/:id", getInternshipById);
router.post("/", createInternship);
router.put("/:id", updateInternship);
router.delete("/:id", deleteInternship);

export default router;