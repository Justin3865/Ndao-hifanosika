export declare function loginUser(email: string, password: string): Promise<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: "ACTIVE";
    departmentId: number | null;
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
    lastLoginAt: Date;
}>;
export declare function registerUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    gender?: any;
    departmentId?: number;
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
export declare function getUserSession(userId: number): Promise<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: import("../../generated/prisma/enums").Gender | null;
    role: import("../../generated/prisma/enums").UserRole;
    status: "ACTIVE";
    departmentId: number | null;
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
    lastLoginAt: Date | null;
}>;
//# sourceMappingURL=auth.service.d.ts.map