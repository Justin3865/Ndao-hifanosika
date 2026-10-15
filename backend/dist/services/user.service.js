"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUserRole = isValidUserRole;
exports.isValidUserStatus = isValidUserStatus;
exports.findAllUsers = findAllUsers;
exports.findUserById = findUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.activateUser = activateUser;
exports.rejectUser = rejectUser;
exports.getActiveUsers = getActiveUsers;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const USER_ROLES = [
    "ADMIN",
    "DIRECTION",
    "DSI",
    "DAF",
    "RH",
    "COMMUNICATION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
];
const USER_STATUSES = [
    "PENDING",
    "ACTIVE",
    "REJECTED",
    "INACTIVE",
];
function isValidUserRole(role) {
    return (typeof role === "string" &&
        USER_ROLES.includes(role.toUpperCase()));
}
function isValidUserStatus(status) {
    return (typeof status === "string" &&
        USER_STATUSES.includes(status.toUpperCase()));
}
async function findAllUsers() {
    return database_1.prisma.user.findMany({
        include: {
            department: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function findUserById(id) {
    return database_1.prisma.user.findUnique({
        where: {
            id,
        },
        include: {
            department: true,
            projectsCreated: true,
            internships: true,
            supervisedInternships: true,
        },
    });
}
async function createUser(data) {
    const normalizedEmail = data.email
        .trim()
        .toLowerCase();
    const existingUser = await database_1.prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }
    const normalizedRole = (data.role ?? "STAGIAIRE_L3")
        .toString()
        .trim()
        .toUpperCase();
    const normalizedStatus = (data.status ?? "PENDING")
        .toString()
        .trim()
        .toUpperCase();
    if (!isValidUserRole(normalizedRole)) {
        throw new Error("INVALID_USER_ROLE");
    }
    if (!isValidUserStatus(normalizedStatus)) {
        throw new Error("INVALID_USER_STATUS");
    }
    const hashedPassword = await bcrypt_1.default.hash(data.password, 12);
    return database_1.prisma.user.create({
        data: {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: data.phone || null,
            gender: data.gender || null,
            role: normalizedRole,
            status: normalizedStatus,
            departmentId: data.departmentId ?? null,
        },
        include: {
            department: true,
        },
    });
}
async function updateUser(id, data) {
    const existingUser = await database_1.prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
    }
    const updateData = {};
    if (data.firstName !== undefined) {
        updateData.firstName =
            data.firstName.trim();
    }
    if (data.lastName !== undefined) {
        updateData.lastName =
            data.lastName.trim();
    }
    if (data.email !== undefined) {
        const normalizedEmail = data.email
            .trim()
            .toLowerCase();
        const emailUsed = await database_1.prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                NOT: {
                    id,
                },
            },
        });
        if (emailUsed) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }
        updateData.email = normalizedEmail;
    }
    if (data.password !== undefined) {
        if (data.password.length < 8) {
            throw new Error("PASSWORD_TOO_SHORT");
        }
        updateData.password =
            await bcrypt_1.default.hash(data.password, 12);
    }
    if (data.phone !== undefined) {
        updateData.phone =
            data.phone || null;
    }
    if (data.gender !== undefined) {
        updateData.gender =
            data.gender || null;
    }
    if (data.role !== undefined) {
        const normalizedRole = data.role
            .trim()
            .toUpperCase();
        if (!isValidUserRole(normalizedRole)) {
            throw new Error("INVALID_USER_ROLE");
        }
        updateData.role =
            normalizedRole;
    }
    if (data.status !== undefined) {
        const normalizedStatus = data.status
            .trim()
            .toUpperCase();
        if (!isValidUserStatus(normalizedStatus)) {
            throw new Error("INVALID_USER_STATUS");
        }
        updateData.status =
            normalizedStatus;
    }
    if (data.departmentId !== undefined) {
        updateData.departmentId =
            data.departmentId;
    }
    return database_1.prisma.user.update({
        where: {
            id,
        },
        data: updateData,
        include: {
            department: true,
        },
    });
}
async function deleteUser(id) {
    const existingUser = await database_1.prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
    }
    return database_1.prisma.user.delete({
        where: {
            id,
        },
    });
}
async function activateUser(id) {
    const existingUser = await database_1.prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
    }
    if (existingUser.status !== "PENDING") {
        throw new Error("USER_NOT_PENDING");
    }
    return database_1.prisma.user.update({
        where: {
            id,
        },
        data: {
            status: "ACTIVE",
        },
        include: {
            department: true,
        },
    });
}
async function rejectUser(id) {
    const existingUser = await database_1.prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
    }
    if (existingUser.status !== "PENDING") {
        throw new Error("USER_NOT_PENDING");
    }
    return database_1.prisma.user.update({
        where: {
            id,
        },
        data: {
            status: "REJECTED",
        },
        include: {
            department: true,
        },
    });
}
async function getActiveUsers() {
    return database_1.prisma.user.findMany({
        where: {
            status: "ACTIVE",
        },
        include: {
            department: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
//# sourceMappingURL=user.service.js.map