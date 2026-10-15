"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllInternships = findAllInternships;
exports.findInternshipById = findInternshipById;
exports.createInternship = createInternship;
exports.updateInternship = updateInternship;
exports.deleteInternship = deleteInternship;
exports.countInternships = countInternships;
exports.countCompletedInternships = countCompletedInternships;
const database_1 = require("../config/database");
async function findAllInternships() {
    return database_1.prisma.internship.findMany({
        include: {
            project: true,
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
}
async function findInternshipById(id) {
    return database_1.prisma.internship.findUnique({
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
}
async function createInternship(data) {
    return database_1.prisma.internship.create({
        data: {
            projectId: data.projectId,
            studentId: data.studentId,
            supervisorId: data.supervisorId,
            title: data.title,
            institution: data.institution,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status ?? "PENDING",
            description: data.description,
        },
        include: {
            project: true,
            student: true,
            supervisor: true,
        },
    });
}
async function updateInternship(id, data) {
    return database_1.prisma.internship.update({
        where: { id },
        data,
        include: {
            project: true,
            student: true,
            supervisor: true,
        },
    });
}
async function deleteInternship(id) {
    return database_1.prisma.internship.delete({
        where: { id },
    });
}
async function countInternships() {
    return database_1.prisma.internship.count();
}
async function countCompletedInternships() {
    return database_1.prisma.internship.count({
        where: {
            status: "COMPLETED",
        },
    });
}
//# sourceMappingURL=internship.service.js.map