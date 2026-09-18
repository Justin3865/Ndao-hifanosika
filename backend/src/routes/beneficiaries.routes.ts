import { Router } from "express";

import {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../controllers/beneficiary.controller";

const router = Router();

router.get("/", getBeneficiaries);
router.get("/:id", getBeneficiaryById);
router.post("/", createBeneficiary);
router.put("/:id", updateBeneficiary);
router.delete("/:id", deleteBeneficiary);

export default router;