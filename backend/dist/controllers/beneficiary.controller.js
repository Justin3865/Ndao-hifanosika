"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeneficiaries = getBeneficiaries;
exports.getBeneficiaryById = getBeneficiaryById;
exports.createBeneficiary = createBeneficiary;
exports.updateBeneficiary = updateBeneficiary;
exports.deleteBeneficiary = deleteBeneficiary;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function getBeneficiaries(req, res) {
    try {
        const projectId = req.query.projectId
            ? Number(req.query.projectId)
            : undefined;
        const beneficiaries = await database_1.prisma.beneficiary.findMany({
            where: projectId ? { projectId } : undefined,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            success: true,
            data: beneficiaries,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération bénéficiaires", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des bénéficiaires",
        });
    }
}
async function getBeneficiaryById(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant bénéficiaire invalide",
            });
            return;
        }
        const beneficiary = await database_1.prisma.beneficiary.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true,
                    },
                },
            },
        });
        if (!beneficiary) {
            res.status(404).json({
                success: false,
                message: "Bénéficiaire introuvable",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: beneficiary,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération bénéficiaire", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du bénéficiaire",
        });
    }
}
async function createBeneficiary(req, res) {
    try {
        const { projectId, firstName, lastName, gender, age, phone, email, vulnerable, } = req.body;
        if (!projectId || !firstName || !lastName) {
            res.status(400).json({
                success: false,
                message: "projectId, firstName et lastName sont obligatoires",
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
        const beneficiary = await database_1.prisma.beneficiary.create({
            data: {
                projectId: Number(projectId),
                firstName,
                lastName,
                gender,
                age: age !== undefined && age !== null ? Number(age) : undefined,
                phone,
                email,
                vulnerable: vulnerable ?? false,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        logger_1.logger.info(`Bénéficiaire créé : ${beneficiary.id}`);
        res.status(201).json({
            success: true,
            message: "Bénéficiaire créé avec succès",
            data: beneficiary,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur création bénéficiaire", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création du bénéficiaire",
        });
    }
}
async function updateBeneficiary(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant bénéficiaire invalide",
            });
            return;
        }
        const existing = await database_1.prisma.beneficiary.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Bénéficiaire introuvable",
            });
            return;
        }
        const { projectId, firstName, lastName, gender, age, phone, email, vulnerable, } = req.body;
        if (projectId !== undefined) {
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
        const beneficiary = await database_1.prisma.beneficiary.update({
            where: { id },
            data: {
                projectId: projectId !== undefined ? Number(projectId) : undefined,
                firstName,
                lastName,
                gender,
                age: age !== undefined ? Number(age) : undefined,
                phone,
                email,
                vulnerable,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            message: "Bénéficiaire modifié avec succès",
            data: beneficiary,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur modification bénéficiaire", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la modification du bénéficiaire",
        });
    }
}
async function deleteBeneficiary(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant bénéficiaire invalide",
            });
            return;
        }
        const existing = await database_1.prisma.beneficiary.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({
                success: false,
                message: "Bénéficiaire introuvable",
            });
            return;
        }
        await database_1.prisma.beneficiary.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Bénéficiaire supprimé avec succès",
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur suppression bénéficiaire", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du bénéficiaire",
        });
    }
}
//# sourceMappingURL=beneficiary.controller.js.map