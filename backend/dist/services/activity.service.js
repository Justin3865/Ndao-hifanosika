"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllActivities = findAllActivities;
exports.findActivityById = findActivityById;
exports.createActivity = createActivity;
exports.updateActivity = updateActivity;
exports.deleteActivity = deleteActivity;
const database_1 = require("../config/database");
async function findAllActivities(projectId) {
    return database_1.prisma.activity.findMany({
        where: projectId !== undefined
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
                    role: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function findActivityById(id) {
    return database_1.prisma.activity.findUnique({
        where: {
            id,
        },
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
}
async function createActivity(data) {
    return database_1.prisma.activity.create({
        data: {
            projectId: data.projectId,
            title: data.title,
            description: data.description ?? null,
            location: data.location ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            status: data.status ?? "PLANNED",
            budget: data.budget ?? null,
            // Provient du JWT.
            createdById: data.createdById,
        },
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
}
async function updateActivity(id, data) {
    return database_1.prisma.activity.update({
        where: {
            id,
        },
        data,
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
}
async function deleteActivity(id) {
    return database_1.prisma.activity.delete({
        where: {
            id,
        },
    });
}
//# sourceMappingURL=activity.service.js.map