"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvaluations = getEvaluations;
exports.getEvaluationById = getEvaluationById;
exports.createEvaluation = createEvaluation;
exports.updateEvaluation = updateEvaluation;
exports.deleteEvaluation = deleteEvaluation;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function getEvaluations(req, res) {
    try {
        const projectId = req.query.projectId
            ? Number(req.query.projectId)
            : undefined;
        const status = req.query.status
            ? String(req.query.status)
            : undefined;
        const evaluations = await database_1.prisma.evaluation.findMany({
            where: {
                ...(projectId ? { projectId } : {}),
                ...(status ? { status: status } : {}),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            success: true,
            data: evaluations,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération évaluations", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des évaluations",
        });
    }
}
async function getEvaluationById(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant évaluation invalide",
            });
            return;
        }
        const evaluation = await database_1.prisma.evaluation.findUnique({
            where: { id },
            include: {
                project: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!evaluation) {
            res.status(404).json({
                success: false,
                message: "Évaluation introuvable",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: evaluation,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération évaluation", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de l'évaluation",
        });
    }
}
async function createEvaluation(req, res) {
    try {
        const { projectId, title, description, score, status, evaluatedAt, createdById, } = req.body;
        if (!projectId || !title || !createdById) {
            res.status(400).json({
                success: false,
                message: "projectId, title et createdById sont obligatoires",
            });
            return;
        }
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
        const user = await database_1.prisma.user.findUnique({
            where: {
                id: Number(createdById),
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "Utilisateur créateur introuvable",
            });
            return;
        }
        const evaluation = await database_1.prisma.evaluation.create({
            data: {
                projectId: Number(projectId),
                title,
                description,
                score: score !== undefined && score !== null
                    ? Number(score)
                    : undefined,
                status: status ?? "DRAFT",
                evaluatedAt: evaluatedAt
                    ? new Date(evaluatedAt)
                    : undefined,
                createdById: Number(createdById),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                createdBy: {
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
            message: "Évaluation créée avec succès",
            data: evaluation,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur création évaluation", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de l'évaluation",
        });
    }
}
async function updateEvaluation(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant évaluation invalide",
            });
            return;
        }
        const existing = await database_1.prisma.evaluation.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Évaluation introuvable",
            });
            return;
        }
        const { projectId, title, description, score, status, evaluatedAt, createdById, } = req.body;
        const evaluation = await database_1.prisma.evaluation.update({
            where: { id },
            data: {
                projectId: projectId !== undefined ? Number(projectId) : undefined,
                title,
                description,
                score: score !== undefined && score !== null
                    ? Number(score)
                    : undefined,
                status,
                evaluatedAt: evaluatedAt !== undefined
                    ? evaluatedAt
                        ? new Date(evaluatedAt)
                        : null
                    : undefined,
                createdById: createdById !== undefined
                    ? Number(createdById)
                    : undefined,
            },
        });
        res.status(200).json({
            success: true,
            message: "Évaluation modifiée avec succès",
            data: evaluation,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur modification évaluation", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la modification de l'évaluation",
        });
    }
}
async function deleteEvaluation(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant évaluation invalide",
            });
            return;
        }
        const existing = await database_1.prisma.evaluation.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Évaluation introuvable",
            });
            return;
        }
        await database_1.prisma.evaluation.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Évaluation supprimée avec succès",
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur suppression évaluation", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de l'évaluation",
        });
    }
}
//# sourceMappingURL=evaluation.controller.js.map