import { Router } from "express";

import { getDepartmentDashboard } from "../controllers/departmentDashboard.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { coordinatorScope } from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

// Même liste que sectionsForRole() (utils/departmentDashboardRules.ts) : un autre rôle reçoit 403.
router.get(
  "/department",
  authorizeRoles("ADMIN", "DIRECTION", "RH", "DAF", "COMMUNICATION", "COORDINATOR"),
  coordinatorScope,
  getDepartmentDashboard,
);

export default router;
