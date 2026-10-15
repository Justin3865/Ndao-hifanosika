"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.registerUser = registerUser;
exports.getUserSession = getUserSession;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
async function loginUser(email, password) {
    const normalizedEmail = email
        .trim()
        .toLowerCase();
    const user = await database_1.prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
        include: {
            department: true,
        },
    });
    if (!user) {
        throw new Error("EMAIL_OR_PASSWORD_INVALID");
    }
    const passwordValid = await bcrypt_1.default.compare(password, user.password);
    if (!passwordValid) {
        throw new Error("EMAIL_OR_PASSWORD_INVALID");
    }
    if (user.status !== "ACTIVE") {
        throw new Error("ACCOUNT_NOT_ACTIVE");
    }
    await database_1.prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            lastLoginAt: new Date(),
        },
    });
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        department: user.department,
        lastLoginAt: new Date(),
    };
}
async function registerUser(data) {
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
    const hashedPassword = await bcrypt_1.default.hash(data.password, 12);
    return database_1.prisma.user.create({
        data: {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: data.phone || null,
            gender: data.gender || null,
            /*
             * IMPORTANT :
             * Une inscription publique ne choisit pas
             * son rôle.
             */
            role: "STAGIAIRE_L3",
            /*
             * Le compte doit être validé.
             */
            status: "PENDING",
            departmentId: data.departmentId ?? null,
        },
        include: {
            department: true,
        },
    });
}
async function getUserSession(userId) {
    const user = await database_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
        include: {
            department: true,
        },
    });
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }
    if (user.status !== "ACTIVE") {
        throw new Error("ACCOUNT_NOT_ACTIVE");
    }
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        department: user.department,
        lastLoginAt: user.lastLoginAt,
    };
}
//# sourceMappingURL=auth.service.js.map