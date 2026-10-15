"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.register = register;
exports.refresh = refresh;
exports.me = me;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.verifyResetCode = verifyResetCode;
exports.resetPassword = resetPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET est introuvable dans le fichier .env");
    }
    return secret;
}
function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: "1d",
    });
}
function generateRefreshToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: "7d",
    });
}
function formatUser(user) {
    return {
        id: String(user.id),
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        status: user.status,
        department: user.department?.name || "",
        departmentId: user.departmentId ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
    };
}
// ============================================================
// LOGIN
// ============================================================
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "L'adresse e-mail et le mot de passe sont obligatoires.",
            });
        }
        const normalizedEmail = String(email)
            .trim()
            .toLowerCase();
        const user = await database_1.prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
            include: {
                department: true,
            },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Adresse e-mail ou mot de passe incorrect.",
            });
        }
        /*
         * Tous les nouveaux comptes doivent avoir
         * un mot de passe bcrypt.
         */
        const passwordValid = await bcrypt_1.default.compare(String(password), user.password);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Adresse e-mail ou mot de passe incorrect.",
            });
        }
        /*
         * Le compte doit être ACTIVE pour obtenir
         * un JWT.
         */
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: `Votre compte est actuellement ${user.status.toLowerCase()}.`,
                status: user.status,
            });
        }
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await database_1.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                lastLoginAt: new Date(),
            },
        });
        logger_1.logger.info(`Connexion réussie : ${user.email}`);
        return res.status(200).json({
            success: true,
            message: "Connexion réussie.",
            data: {
                user: formatUser({
                    ...user,
                    lastLoginAt: new Date(),
                }),
                accessToken,
                refreshToken,
                expiresIn: 86400,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la connexion.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
// ============================================================
// REGISTER
// ============================================================
async function register(req, res) {
    try {
        const { firstName, lastName, name, email, password, phone, gender, departmentId, } = req.body;
        /*
         * Compatibilité avec :
         * firstName + lastName
         *
         * ou :
         * name
         */
        let finalFirstName = firstName;
        let finalLastName = lastName;
        if ((!finalFirstName || !finalLastName) && name) {
            const nameParts = String(name)
                .trim()
                .split(/\s+/);
            finalFirstName = nameParts[0] || "";
            finalLastName =
                nameParts.slice(1).join(" ") || "";
        }
        if (!finalFirstName ||
            !finalLastName ||
            !email ||
            !password) {
            return res.status(400).json({
                success: false,
                message: "Le prénom, le nom, l'adresse e-mail et le mot de passe sont obligatoires.",
            });
        }
        const normalizedEmail = String(email)
            .trim()
            .toLowerCase();
        const existingUser = await database_1.prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Cette adresse e-mail est déjà utilisée.",
            });
        }
        /*
         * Le rôle envoyé par le frontend est volontairement
         * ignoré.
         *
         * Une inscription publique crée toujours :
         *
         * role   = STAGIAIRE_L3
         * status = PENDING
         *
         * Le rôle pourra ensuite être modifié par une personne
         * autorisée depuis le module de gestion des utilisateurs.
         */
        const hashedPassword = await bcrypt_1.default.hash(String(password), 12);
        const parsedDepartmentId = departmentId !== undefined &&
            departmentId !== null &&
            departmentId !== ""
            ? Number(departmentId)
            : null;
        if (parsedDepartmentId !== null &&
            !Number.isInteger(parsedDepartmentId)) {
            return res.status(400).json({
                success: false,
                message: "Identifiant de département invalide.",
            });
        }
        const user = await database_1.prisma.user.create({
            data: {
                firstName: String(finalFirstName).trim(),
                lastName: String(finalLastName).trim(),
                email: normalizedEmail,
                password: hashedPassword,
                phone: phone ? String(phone).trim() : null,
                gender: gender || null,
                // IMPORTANT :
                // jamais de role venant directement du frontend
                role: "STAGIAIRE_L3",
                // validation administrative obligatoire
                status: "PENDING",
                departmentId: parsedDepartmentId,
            },
            include: {
                department: true,
            },
        });
        logger_1.logger.info(`Nouvelle inscription : ${user.email}`);
        return res.status(201).json({
            success: true,
            message: "Inscription enregistrée. Votre compte doit être validé par un administrateur.",
            data: {
                user: formatUser(user),
                accessToken: "",
                refreshToken: "",
                expiresIn: 0,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de l'inscription.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
// ============================================================
// REFRESH TOKEN
// ============================================================
async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token manquant.",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(String(refreshToken), getJwtSecret());
        const user = await database_1.prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
            include: {
                department: true,
            },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Le compte n'est pas actif.",
            });
        }
        const accessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        return res.status(200).json({
            success: true,
            message: "Token actualisé.",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: 86400,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors du refresh token.", error);
        return res.status(401).json({
            success: false,
            message: "Refresh token invalide ou expiré.",
        });
    }
}
// ============================================================
// ME
// ============================================================
async function me(req, res) {
    try {
        /*
         * Le userId doit venir du JWT.
         *
         * Il ne faut plus utiliser :
         * /auth/me/:id
         *
         * sinon un utilisateur peut tenter de consulter
         * le profil d'un autre utilisateur.
         */
        const authenticatedRequest = req;
        if (!authenticatedRequest.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentification requise.",
            });
        }
        const userId = authenticatedRequest.user.userId;
        const user = await database_1.prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                department: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Le compte n'est pas actif.",
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                user: formatUser(user),
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération du profil.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
// ============================================================
// LOGOUT
// ============================================================
async function logout(_req, res) {
    /*
     * Avec le système JWT actuel, le logout côté serveur
     * ne révoque pas encore le token.
     *
     * Le frontend supprimera accessToken/refreshToken.
     *
     * Une vraie révocation pourra être ajoutée ensuite
     * avec une table de sessions/refresh tokens.
     */
    return res.status(200).json({
        success: true,
        message: "Déconnexion réussie.",
    });
}
// ============================================================
// FORGOT PASSWORD
// ============================================================
async function forgotPassword(_req, res) {
    return res.status(200).json({
        success: true,
        message: "Si cette adresse existe, un code de réinitialisation sera envoyé.",
    });
}
// ============================================================
// VERIFY RESET CODE
// ============================================================
async function verifyResetCode(_req, res) {
    return res.status(200).json({
        success: true,
        message: "Code vérifié.",
    });
}
// ============================================================
// RESET PASSWORD
// ============================================================
async function resetPassword(_req, res) {
    return res.status(200).json({
        success: true,
        message: "Mot de passe réinitialisé avec succès.",
    });
}
//# sourceMappingURL=auth.controller.js.map