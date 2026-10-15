"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMembers = getMembers;
exports.getMemberById = getMemberById;
exports.updateMember = updateMember;
exports.deactivateMember = deactivateMember;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function getMembers(_req, res) {
    try {
        const members = await database_1.prisma.user.findMany({
            where: {
                status: "ACTIVE",
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true,
                department: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({
            success: true,
            count: members.length,
            members,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération des membres.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de récupérer les membres.",
        });
    }
}
async function getMemberById(req, res) {
    try {
        const id = Number(req.params.id);
        const member = await database_1.prisma.user.findFirst({
            where: {
                id,
                status: "ACTIVE",
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                department: true,
                projectsCreated: true,
                internships: true,
            },
        });
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Membre introuvable.",
            });
        }
        return res.status(200).json({
            success: true,
            member,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération du membre.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
async function updateMember(req, res) {
    try {
        const id = Number(req.params.id);
        const { firstName, lastName, email, phone, gender, role, departmentId, } = req.body;
        const member = await database_1.prisma.user.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email,
                phone,
                gender,
                role,
                departmentId: departmentId === null
                    ? null
                    : departmentId !== undefined
                        ? Number(departmentId)
                        : undefined,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                role: true,
                status: true,
                department: true,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Membre modifié avec succès.",
            member,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la modification du membre.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier le membre.",
        });
    }
}
async function deactivateMember(req, res) {
    try {
        const id = Number(req.params.id);
        const member = await database_1.prisma.user.update({
            where: { id },
            data: {
                status: "INACTIVE",
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Membre désactivé avec succès.",
            member,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la désactivation du membre.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de désactiver le membre.",
        });
    }
}
//# sourceMappingURL=member.controller.js.map