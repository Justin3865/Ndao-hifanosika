"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllMilestones = findAllMilestones;
exports.findMilestoneById = findMilestoneById;
exports.createMilestone = createMilestone;
exports.updateMilestone = updateMilestone;
exports.deleteMilestone = deleteMilestone;
const database_1 = require("../config/database");
async function findAllMilestones() {
    return database_1.prisma.milestone.findMany({
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    createdById: true,
                },
            },
        },
        orderBy: [
            {
                dueDate: "asc",
            },
            {
                createdAt: "desc",
            },
        ],
    });
}
async function findMilestoneById(id) {
    return database_1.prisma.milestone.findUnique({
        where: {
            id,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    createdById: true,
                },
            },
        },
    });
}
async function createMilestone(data) {
    return database_1.prisma.milestone.create({
        data: {
            projectId: data.projectId,
            title: data.title,
            description: data.description ?? null,
            dueDate: data.dueDate ?? null,
            progress: data.progress ?? 0,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    createdById: true,
                },
            },
        },
    });
}
async function updateMilestone(id, data) {
    return database_1.prisma.milestone.update({
        where: {
            id,
        },
        data,
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    createdById: true,
                },
            },
        },
    });
}
async function deleteMilestone(id) {
    return database_1.prisma.milestone.delete({
        where: {
            id,
        },
    });
}
//# sourceMappingURL=milestone.service.js.map