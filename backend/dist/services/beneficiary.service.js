"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllBeneficiaries = findAllBeneficiaries;
exports.findBeneficiaryById = findBeneficiaryById;
exports.createBeneficiary = createBeneficiary;
exports.updateBeneficiary = updateBeneficiary;
exports.deleteBeneficiary = deleteBeneficiary;
exports.countBeneficiaries = countBeneficiaries;
const database_1 = require("../config/database");
async function findAllBeneficiaries(projectId) {
    return database_1.prisma.beneficiary.findMany({
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
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function findBeneficiaryById(id) {
    return database_1.prisma.beneficiary.findUnique({
        where: { id },
        include: {
            project: true,
        },
    });
}
async function createBeneficiary(data) {
    return database_1.prisma.beneficiary.create({
        data: {
            projectId: data.projectId,
            firstName: data.firstName,
            lastName: data.lastName,
            gender: data.gender,
            age: data.age,
            phone: data.phone,
            email: data.email,
            vulnerable: data.vulnerable ?? false,
        },
        include: {
            project: true,
        },
    });
}
async function updateBeneficiary(id, data) {
    return database_1.prisma.beneficiary.update({
        where: { id },
        data,
        include: {
            project: true,
        },
    });
}
async function deleteBeneficiary(id) {
    return database_1.prisma.beneficiary.delete({
        where: { id },
    });
}
async function countBeneficiaries(projectId) {
    return database_1.prisma.beneficiary.count({
        where: projectId
            ? {
                projectId,
            }
            : undefined,
    });
}
//# sourceMappingURL=beneficiary.service.js.map