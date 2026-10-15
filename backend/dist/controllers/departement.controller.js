"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartments = getDepartments;
exports.getDepartmentById = getDepartmentById;
exports.createDepartment = createDepartment;
exports.updateDepartment = updateDepartment;
exports.deleteDepartment = deleteDepartment;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function getDepartments(_req, res) {
    try {
        const departments = await database_1.prisma.department.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        projects: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });
        return res.status(200).json({
            success: true,
            count: departments.length,
            departments,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération des départements.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de récupérer les départements.",
        });
    }
}
async function getDepartmentById(req, res) {
    try {
        const id = Number(req.params.id);
        const department = await database_1.prisma.department.findUnique({
            where: { id },
            include: {
                users: true,
                projects: true,
            },
        });
        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Département introuvable.",
            });
        }
        return res.status(200).json({
            success: true,
            department,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la récupération du département.", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur.",
        });
    }
}
async function createDepartment(req, res) {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Le nom et le code sont obligatoires.",
            });
        }
        const department = await database_1.prisma.department.create({
            data: {
                name,
                code,
                description: description || null,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Département créé avec succès.",
            department,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la création du département.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de créer le département.",
        });
    }
}
async function updateDepartment(req, res) {
    try {
        const id = Number(req.params.id);
        const { name, code, description } = req.body;
        const department = await database_1.prisma.department.update({
            where: { id },
            data: {
                name,
                code,
                description,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Département modifié avec succès.",
            department,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la modification du département.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier le département.",
        });
    }
}
async function deleteDepartment(req, res) {
    try {
        const id = Number(req.params.id);
        const usersCount = await database_1.prisma.user.count({
            where: {
                departmentId: id,
            },
        });
        const projectsCount = await database_1.prisma.project.count({
            where: {
                departmentId: id,
            },
        });
        if (usersCount > 0 || projectsCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Ce département ne peut pas être supprimé car il est encore utilisé.",
            });
        }
        await database_1.prisma.department.delete({
            where: { id },
        });
        return res.status(200).json({
            success: true,
            message: "Département supprimé avec succès.",
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur lors de la suppression du département.", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de supprimer le département.",
        });
    }
}
//# sourceMappingURL=departement.controller.js.map