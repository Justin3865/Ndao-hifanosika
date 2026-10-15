"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStatistics = getDashboardStatistics;
exports.getProjectStatistics = getProjectStatistics;
exports.getEvaluationStatistics = getEvaluationStatistics;
exports.getBeneficiaryStatistics = getBeneficiaryStatistics;
const database_1 = require("../config/database");
async function getDashboardStatistics() {
    const [projects, beneficiaries, users, evaluations, internships, activities, activeProjects, completedProjects, activeUsers, completedInternships,] = await Promise.all([
        database_1.prisma.project.count(),
        database_1.prisma.beneficiary.count(),
        database_1.prisma.user.count(),
        database_1.prisma.evaluation.count(),
        database_1.prisma.internship.count(),
        database_1.prisma.activity.count(),
        database_1.prisma.project.count({
            where: {
                status: "ACTIVE",
            },
        }),
        database_1.prisma.project.count({
            where: {
                status: "COMPLETED",
            },
        }),
        database_1.prisma.user.count({
            where: {
                status: "ACTIVE",
            },
        }),
        database_1.prisma.internship.count({
            where: {
                status: "COMPLETED",
            },
        }),
    ]);
    return {
        totals: {
            projects,
            beneficiaries,
            users,
            evaluations,
            internships,
            activities,
        },
        status: {
            activeProjects,
            completedProjects,
            activeUsers,
            completedInternships,
        },
    };
}
async function getProjectStatistics(projectId) {
    const project = await database_1.prisma.project.findUnique({
        where: {
            id: projectId,
        },
        include: {
            activities: true,
            milestones: true,
            beneficiaries: true,
            evaluations: true,
            internships: true,
        },
    });
    if (!project) {
        throw new Error("PROJECT_NOT_FOUND");
    }
    const completedActivities = project.activities.filter((activity) => activity.status === "COMPLETED").length;
    const completedMilestones = project.milestones.filter((milestone) => milestone.progress >= 100).length;
    const scores = project.evaluations
        .map((evaluation) => evaluation.score)
        .filter((score) => score !== null);
    const averageScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) /
            scores.length
        : null;
    return {
        project,
        statistics: {
            activities: project.activities.length,
            completedActivities,
            milestones: project.milestones.length,
            completedMilestones,
            beneficiaries: project.beneficiaries.length,
            evaluations: project.evaluations.length,
            internships: project.internships.length,
            averageEvaluationScore: averageScore,
        },
    };
}
async function getEvaluationStatistics() {
    const evaluations = await database_1.prisma.evaluation.findMany();
    const scores = evaluations
        .map((evaluation) => evaluation.score)
        .filter((score) => score !== null);
    const averageScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) /
            scores.length
        : null;
    return {
        total: evaluations.length,
        averageScore,
        draft: evaluations.filter((evaluation) => evaluation.status === "DRAFT").length,
        submitted: evaluations.filter((evaluation) => evaluation.status === "SUBMITTED").length,
        validated: evaluations.filter((evaluation) => evaluation.status === "VALIDATED").length,
    };
}
async function getBeneficiaryStatistics() {
    const beneficiaries = await database_1.prisma.beneficiary.findMany();
    return {
        total: beneficiaries.length,
        vulnerable: beneficiaries.filter((beneficiary) => beneficiary.vulnerable).length,
        male: beneficiaries.filter((beneficiary) => beneficiary.gender === "MALE").length,
        female: beneficiaries.filter((beneficiary) => beneficiary.gender === "FEMALE").length,
        other: beneficiaries.filter((beneficiary) => beneficiary.gender === "OTHER").length,
    };
}
//# sourceMappingURL=report.service.js.map