"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const database_1 = require("../config/database");
async function authenticate(req, res, next) {
    try {
        const authorization = req.headers.authorization;
        if (!authorization) {
            res.status(401).json({
                success: false,
                message: "Token d'authentification requis",
            });
            return;
        }
        const [type, token] = authorization.trim().split(/\s+/);
        if (type !== "Bearer" ||
            !token) {
            res.status(401).json({
                success: false,
                message: "Format du token invalide",
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (!decoded.userId ||
            !decoded.email ||
            !decoded.role) {
            res.status(401).json({
                success: false,
                message: "Payload du token invalide",
            });
            return;
        }
        const user = await database_1.prisma.user.findUnique({
            where: {
                id: Number(decoded.userId),
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
            },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Utilisateur introuvable",
            });
            return;
        }
        /*
         * Le rôle et le statut sont relus depuis
         * PostgreSQL et non pas uniquement depuis
         * le JWT.
         *
         * Ainsi, si un administrateur modifie le rôle
         * ou désactive le compte, la modification est
         * immédiatement prise en compte.
         */
        if (user.status !== "ACTIVE") {
            res.status(403).json({
                success: false,
                message: "Compte utilisateur inactif",
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: "Token expiré",
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: "Token invalide",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Erreur d'authentification",
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map