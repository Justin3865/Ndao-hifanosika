"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllEvaluations = findAllEvaluations;
exports.findEvaluationById = findEvaluationById;
exports.createEvaluation = createEvaluation;
exports.updateEvaluation = updateEvaluation;
exports.deleteEvaluation = deleteEvaluation;
exports.getAverageEvaluationScore = getAverageEvaluationScore;
const database_1 = require("../config/database");
async function findAllEvaluations(projectId) {
    return database_1.prisma.evaluation.findMany({
        where: projectId
            ? {
                projectId,
            }
            : undefined,
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
}
async function findEvaluationById(id) {
    return database_1.prisma.evaluation.findUnique({
        where: { id },
        include: {
            project: true,
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
}
async function createEvaluation(data) {
    return database_1.prisma.evaluation.create({
        data: {
            projectId: data.projectId,
            title: data.title,
            description: data.description,
            score: data.score,
            status: data.status ?? "DRAFT",
            evaluatedAt: data.evaluatedAt,
            createdById: data.createdById,
        },
        include: {
            project: true,
            createdBy: true,
        },
    });
}
async function updateEvaluation(id, data) {
    return database_1.prisma.evaluation.update({
        where: { id },
        data,
        include: {
            project: true,
            createdBy: true,
        },
    });
}
async function deleteEvaluation(id) {
    return database_1.prisma.evaluation.delete({
        where: { id },
    });
}
async function getAverageEvaluationScore(projectId) {
    const result = await database_1.prisma.evaluation.aggregate({
        where: {
            ...(projectId ? { projectId } : {}),
            score: {
                not: null,
            },
        },
        _avg: {
            score: true,
        },
    });
    return result._avg.score;
}
//# sourceMappingURL=evaluation.service.js.map