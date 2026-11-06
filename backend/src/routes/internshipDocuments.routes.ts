import { Router } from "express";

import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
} from "../controllers/internshipDocuments.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
router.use(authenticate);

// Les droits fins (stagiaire concerné, tuteur, RH/ADMIN/DIRECTION/DSI) sont vérifiés dans le contrôleur,
// stage par stage : un stagiaire ne voit jamais les documents d'un autre.
router.get("/", listDocuments);
router.post("/", uploadDocument);
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);

export default router;
