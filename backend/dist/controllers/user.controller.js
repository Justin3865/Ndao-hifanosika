"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.activateUser = activateUser;
exports.rejectUser = rejectUser;
const logger_1 = require("../config/logger");
const user_service_1 = require("../services/user.service");
function sanitizeUser(user) {
    if (!user) {
        return user;
    }
    const { password, ...safeUser } = user;
    return safeUser;
}
/**
 * GET /api/users
 */
async function getUsers(_req, res) {
    try {
        const users = await (0, user_service_1.findAllUsers)();
        return res.status(200).json({
            success: true,
            count: users.length,
            users: users.map(sanitizeUser),
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération des utilisateurs.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de récupérer les utilisateurs.",
        });
    }
}
/**
 * GET /api/users/:id
 */
async function getUserById(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) ||
            id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }
        const user = await (0, user_service_1.findUserById)(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        return res.status(200).json({
            success: true,
            user: sanitizeUser(user),
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
/**
 * POST /api/users
 *
 * ADMIN uniquement.
 *
 * Contrairement à /auth/register,
 * l'ADMIN peut choisir le rôle.
 */
async function createUser(req, res) {
    try {
        const { firstName, lastName, email, password, phone, gender, role, status, departmentId, } = req.body;
        if (!firstName ||
            !lastName ||
            !email ||
            !password) {
            return res.status(400).json({
                success: false,
                message: "Les champs obligatoires sont manquants.",
            });
        }
        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères.",
            });
        }
        const normalizedRole = (role ?? "STAGIAIRE_L3")
            .toString()
            .trim()
            .toUpperCase();
        const normalizedStatus = (status ?? "PENDING")
            .toString()
            .trim()
            .toUpperCase();
        if (!(0, user_service_1.isValidUserRole)(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: "Rôle utilisateur invalide.",
            });
        }
        if (!(0, user_service_1.isValidUserStatus)(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Statut utilisateur invalide.",
            });
        }
        let parsedDepartmentId = null;
        if (departmentId !== undefined &&
            departmentId !== null &&
            departmentId !== "") {
            parsedDepartmentId =
                Number(departmentId);
            if (!Number.isInteger(parsedDepartmentId) ||
                parsedDepartmentId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Identifiant de département invalide.",
                });
            }
        }
        const user = await (0, user_service_1.createUser)({
            firstName: String(firstName),
            lastName: String(lastName),
            email: String(email),
            password: String(password),
            phone: phone !== undefined
                ? String(phone)
                : null,
            gender,
            role: normalizedRole,
            status: normalizedStatus,
            departmentId: parsedDepartmentId,
        });
        return res.status(201).json({
            success: true,
            message: "Utilisateur créé avec succès.",
            user: sanitizeUser(user),
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "EMAIL_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Cette adresse e-mail est déjà utilisée.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "INVALID_USER_ROLE") {
            return res.status(400).json({
                success: false,
                message: "Rôle utilisateur invalide.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "INVALID_USER_STATUS") {
            return res.status(400).json({
                success: false,
                message: "Statut utilisateur invalide.",
            });
        }
        logger_1.logger.error("Erreur lors de la création de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de créer l'utilisateur.",
        });
    }
}
/**
 * PUT /api/users/:id
 *
 * ADMIN uniquement.
 */
async function updateUser(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) ||
            id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }
        const { firstName, lastName, email, password, phone, gender, role, status, departmentId, } = req.body;
        if (role !== undefined &&
            !(0, user_service_1.isValidUserRole)(String(role)
                .trim()
                .toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Rôle utilisateur invalide.",
            });
        }
        if (status !== undefined &&
            !(0, user_service_1.isValidUserStatus)(String(status)
                .trim()
                .toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Statut utilisateur invalide.",
            });
        }
        if (password !== undefined &&
            String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères.",
            });
        }
        let parsedDepartmentId = undefined;
        if (departmentId === null ||
            departmentId === "") {
            parsedDepartmentId = null;
        }
        else if (departmentId !== undefined) {
            parsedDepartmentId =
                Number(departmentId);
            if (!Number.isInteger(parsedDepartmentId) ||
                parsedDepartmentId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Identifiant de département invalide.",
                });
            }
        }
        const user = await (0, user_service_1.updateUser)(id, {
            firstName: firstName !== undefined
                ? String(firstName)
                : undefined,
            lastName: lastName !== undefined
                ? String(lastName)
                : undefined,
            email: email !== undefined
                ? String(email)
                : undefined,
            password: password !== undefined
                ? String(password)
                : undefined,
            phone: phone !== undefined
                ? phone
                : undefined,
            gender: gender !== undefined
                ? gender
                : undefined,
            role: role !== undefined
                ? String(role)
                : undefined,
            status: status !== undefined
                ? String(status)
                : undefined,
            departmentId: parsedDepartmentId,
        });
        return res.status(200).json({
            success: true,
            message: "Utilisateur mis à jour avec succès.",
            user: sanitizeUser(user),
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "EMAIL_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Cette adresse e-mail est déjà utilisée.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "INVALID_USER_ROLE") {
            return res.status(400).json({
                success: false,
                message: "Rôle utilisateur invalide.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "INVALID_USER_STATUS") {
            return res.status(400).json({
                success: false,
                message: "Statut utilisateur invalide.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "PASSWORD_TOO_SHORT") {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères.",
            });
        }
        logger_1.logger.error("Erreur lors de la modification de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier l'utilisateur.",
        });
    }
}
/**
 * DELETE /api/users/:id
 *
 * ADMIN uniquement.
 */
async function deleteUser(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) ||
            id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }
        await (0, user_service_1.deleteUser)(id);
        return res.status(200).json({
            success: true,
            message: "Utilisateur supprimé avec succès.",
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        logger_1.logger.error("Erreur lors de la suppression de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de supprimer l'utilisateur.",
        });
    }
}
/**
 * PATCH /api/users/:id/activate
 *
 * ADMIN uniquement.
 *
 * PENDING -> ACTIVE
 */
async function activateUser(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) ||
            id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }
        const user = await (0, user_service_1.activateUser)(id);
        logger_1.logger.info(`Compte utilisateur activé : ${user.email}`);
        return res.status(200).json({
            success: true,
            message: "Compte utilisateur activé avec succès.",
            user: sanitizeUser(user),
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_PENDING") {
            return res.status(400).json({
                success: false,
                message: "Seul un compte en attente peut être activé.",
            });
        }
        logger_1.logger.error("Erreur lors de l'activation de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible d'activer le compte utilisateur.",
        });
    }
}
/**
 * PATCH /api/users/:id/reject
 *
 * ADMIN uniquement.
 *
 * PENDING -> REJECTED
 */
async function rejectUser(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) ||
            id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }
        const user = await (0, user_service_1.rejectUser)(id);
        logger_1.logger.info(`Compte utilisateur rejeté : ${user.email}`);
        return res.status(200).json({
            success: true,
            message: "Compte utilisateur rejeté avec succès.",
            user: sanitizeUser(user),
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }
        if (error instanceof Error &&
            error.message ===
                "USER_NOT_PENDING") {
            return res.status(400).json({
                success: false,
                message: "Seul un compte en attente peut être rejeté.",
            });
        }
        logger_1.logger.error("Erreur lors du rejet de l'utilisateur.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de rejeter le compte utilisateur.",
        });
    }
}
//# sourceMappingURL=user.controller.js.map