"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = authorizeRoles;
function authorizeRoles(...allowedRoles) {
    const normalizedRoles = allowedRoles.map((role) => role.trim().toUpperCase());
    return (req, res, next) => {
        const authenticatedRequest = req;
        if (!authenticatedRequest.user) {
            res.status(401).json({
                success: false,
                message: "Authentification requise",
            });
            return;
        }
        const userRole = authenticatedRequest.user.role
            .trim()
            .toUpperCase();
        if (!normalizedRoles.includes(userRole)) {
            res.status(403).json({
                success: false,
                message: "Accès refusé : rôle insuffisant.",
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=role.middleware.js.map