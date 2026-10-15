export declare function findAllActivities(projectId?: number): Promise<({
    project: {
        id: number;
        name: string;
        code: string;
    };
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").ActivityStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budget: import("@prisma/client-runtime-utils").Decimal | null;
    createdById: number;
    projectId: number;
    title: string;
    location: string | null;
})[]>;
export declare function findActivityById(id: number): Promise<({
    project: {
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
    };
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").ActivityStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budget: import("@prisma/client-runtime-utils").Decimal | null;
    createdById: number;
    projectId: number;
    title: string;
    location: string | null;
}) | null>;
export declare function createActivity(data: {
    projectId: number;
    title: string;
    description?: string | null;
    location?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    budget?: number | null;
    createdById: number;
}): Promise<{
    project: {
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
    };
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").ActivityStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budget: import("@prisma/client-runtime-utils").Decimal | null;
    createdById: number;
    projectId: number;
    title: string;
    location: string | null;
}>;
export declare function updateActivity(id: number, data: {
    projectId?: number;
    title?: string;
    description?: string | null;
    location?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    budget?: number | null;
}): Promise<{
    project: {
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
    };
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").ActivityStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budget: import("@prisma/client-runtime-utils").Decimal | null;
    createdById: number;
    projectId: number;
    title: string;
    location: string | null;
}>;
export declare function deleteActivity(id: number): Promise<{
    id: number;
    status: import("../../generated/prisma/enums").ActivityStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budget: import("@prisma/client-runtime-utils").Decimal | null;
    createdById: number;
    projectId: number;
    title: string;
    location: string | null;
}>;
//# sourceMappingURL=activity.service.d.ts.map