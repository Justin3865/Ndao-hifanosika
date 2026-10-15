"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllProjects = findAllProjects;
exports.findProjectById = findProjectById;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const database_1 = require("../config/database");
async function findAllProjects(createdById) {
    return database_1.prisma.project.findMany({
        where: createdById !== undefined
            ? {
                createdById,
            }
            : undefined,
        include: {
            department: true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                },
            },
            _count: {
                select: {
                    activities: true,
                    milestones: true,
                    beneficiaries: true,
                    evaluations: true,
                    internships: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function findProjectById(id) {
    return database_1.prisma.project.findUnique({
        where: {
            id,
        },
        include: {
            department: true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                },
            },
            activities: true,
            milestones: true,
            beneficiaries: true,
            evaluations: true,
            internships: true,
        },
    });
}
async function createProject(data) {
    return database_1.prisma.project.create({
        data: {
            name: data.name,
            code: data.code,
            description: data.description ?? null,
            objective: data.objective ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            status: data.status ?? "DRAFT",
            budget: data.budget ?? null,
            beneficiaryTarget: data.beneficiaryTarget ?? null,
            departmentId: data.departmentId ?? null,
            /*
             * Toujours issu du JWT.
             */
            createdById: data.createdById,
        },
        include: {
            department: true,
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
}
async function updateProject(id, data) {
    return database_1.prisma.project.update({
        where: {
            id,
        },
        data,
        include: {
            department: true,
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
}
async function deleteProject(id) {
    return database_1.prisma.project.delete({
        where: {
            id,
        },
    });
}
//# sourceMappingURL=project.service.js.map