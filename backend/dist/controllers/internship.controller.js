"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInternships = getInternships;
exports.getInternshipById = getInternshipById;
exports.createInternship = createInternship;
exports.updateInternship = updateInternship;
exports.deleteInternship = deleteInternship;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function getInternships(req, res) {
    try {
        const studentId = req.query.studentId
            ? Number(req.query.studentId)
            : undefined;
        const supervisorId = req.query.supervisorId
            ? Number(req.query.supervisorId)
            : undefined;
        const projectId = req.query.projectId
            ? Number(req.query.projectId)
            : undefined;
        const internships = await database_1.prisma.internship.findMany({
            where: {
                ...(studentId ? { studentId } : {}),
                ...(supervisorId ? { supervisorId } : {}),
                ...(projectId ? { projectId } : {}),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
                supervisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            success: true,
            data: internships,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération stages", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des stages",
        });
    }
}
async function getInternshipById(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant stage invalide",
            });
            return;
        }
        const internship = await database_1.prisma.internship.findUnique({
            where: { id },
            include: {
                project: true,
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
                supervisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
            },
        });
        if (!internship) {
            res.status(404).json({
                success: false,
                message: "Stage introuvable",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: internship,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération stage", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du stage",
        });
    }
}
async function createInternship(req, res) {
    try {
        const { projectId, studentId, supervisorId, title, institution, startDate, endDate, status, description, } = req.body;
        if (!studentId || !title || !startDate) {
            res.status(400).json({
                success: false,
                message: "studentId, title et startDate sont obligatoires",
            });
            return;
        }
        const student = await database_1.prisma.user.findUnique({
            where: {
                id: Number(studentId),
            },
        });
        if (!student) {
            res.status(404).json({
                success: false,
                message: "Étudiant introuvable",
            });
            return;
        }
        if (supervisorId) {
            const supervisor = await database_1.prisma.user.findUnique({
                where: {
                    id: Number(supervisorId),
                },
            });
            if (!supervisor) {
                res.status(404).json({
                    success: false,
                    message: "Tuteur introuvable",
                });
                return;
            }
        }
        if (projectId) {
            const project = await database_1.prisma.project.findUnique({
                where: {
                    id: Number(projectId),
                },
            });
            if (!project) {
                res.status(404).json({
                    success: false,
                    message: "Projet introuvable",
                });
                return;
            }
        }
        const internship = await database_1.prisma.internship.create({
            data: {
                projectId: projectId ? Number(projectId) : undefined,
                studentId: Number(studentId),
                supervisorId: supervisorId
                    ? Number(supervisorId)
                    : undefined,
                title,
                institution,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                status: status ?? "PENDING",
                description,
            },
            include: {
                project: true,
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                supervisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        res.status(201).json({
            success: true,
            message: "Stage créé avec succès",
            data: internship,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur création stage", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création du stage",
        });
    }
}
async function updateInternship(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant stage invalide",
            });
            return;
        }
        const existing = await database_1.prisma.internship.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Stage introuvable",
            });
            return;
        }
        const { projectId, studentId, supervisorId, title, institution, startDate, endDate, status, description, } = req.body;
        const internship = await database_1.prisma.internship.update({
            where: { id },
            data: {
                projectId: projectId !== undefined
                    ? projectId
                        ? Number(projectId)
                        : null
                    : undefined,
                studentId: studentId !== undefined ? Number(studentId) : undefined,
                supervisorId: supervisorId !== undefined
                    ? supervisorId
                        ? Number(supervisorId)
                        : null
                    : undefined,
                title,
                institution,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate !== undefined
                    ? endDate
                        ? new Date(endDate)
                        : null
                    : undefined,
                status,
                description,
            },
        });
        res.status(200).json({
            success: true,
            message: "Stage modifié avec succès",
            data: internship,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur modification stage", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la modification du stage",
        });
    }
}
async function deleteInternship(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant stage invalide",
            });
            return;
        }
        const existing = await database_1.prisma.internship.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Stage introuvable",
            });
            return;
        }
        await database_1.prisma.internship.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Stage supprimé avec succès",
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur suppression stage", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du stage",
        });
    }
}
//# sourceMappingURL=internship.controller.js.map