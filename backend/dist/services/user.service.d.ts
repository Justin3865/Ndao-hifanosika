declare const USER_ROLES: readonly ["ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"];
declare const USER_STATUSES: readonly ["PENDING", "ACTIVE", "REJECTED", "INACTIVE"];
export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export declare function isValidUserRole(role: unknown): role is UserRole;
export declare function isValidUserStatus(status: unknown): status is UserStatus;
export declare function findAllUsers(): Promise<({
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
})[]>;
export declare function findUserById(id: number): Promise<({
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
    projectsCreated: {
        id: number;
        status: import("../../generated/prisma/enums").ProjectStatus;
        departmentId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string;
        objective: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: import("@prisma/client-runtime-utils").Decimal | null;
        beneficiaryTarget: number | null;
        createdById: number;
    }[];
    internships: {
        id: number;
        status: import("../../generated/prisma/enums").InternshipStatus;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        projectId: number | null;
        title: string;
        studentId: number;
        supervisorId: number | null;
        institution: string | null;
    }[];
    supervisedInternships: {
        id: number;
        status: import("../../generated/prisma/enums").InternshipStatus;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        projectId: number | null;
        title: string;
        studentId: number;
        supervisorId: number | null;
        institution: string | null;
    }[];
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}) | null>;
export declare function createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
    gender?: any;
    role?: string;
    status?: string;
    departmentId?: number | null;
}): Promise<{
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}>;
export declare function updateUser(id: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string | null;
    gender?: any;
    role?: string;
    status?: string;
    departmentId?: number | null;
}): Promise<{
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}>;
export declare function deleteUser(id: number): Promise<{
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}>;
export declare function activateUser(id: number): Promise<{
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}>;
export declare function rejectUser(id: number): Promise<{
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}>;
export declare function getActiveUsers(): Promise<({
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
} & {
    email: string;
    password: string;
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: import("../../generated/prisma/enums").UserStatus;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
})[]>;
export {};
//# sourceMappingURL=user.service.d.ts.map