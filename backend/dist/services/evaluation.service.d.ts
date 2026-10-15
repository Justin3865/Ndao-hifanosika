export declare function findAllEvaluations(projectId?: number): Promise<({
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
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").EvaluationStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    createdById: number;
    projectId: number;
    title: string;
    score: number | null;
    evaluatedAt: Date | null;
})[]>;
export declare function findEvaluationById(id: number): Promise<({
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
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").EvaluationStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    createdById: number;
    projectId: number;
    title: string;
    score: number | null;
    evaluatedAt: Date | null;
}) | null>;
export declare function createEvaluation(data: {
    projectId: number;
    title: string;
    description?: string;
    score?: number;
    status?: any;
    evaluatedAt?: Date;
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
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").EvaluationStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    createdById: number;
    projectId: number;
    title: string;
    score: number | null;
    evaluatedAt: Date | null;
}>;
export declare function updateEvaluation(id: number, data: {
    projectId?: number;
    title?: string;
    description?: string;
    score?: number | null;
    status?: any;
    evaluatedAt?: Date | null;
    createdById?: number;
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
    };
} & {
    id: number;
    status: import("../../generated/prisma/enums").EvaluationStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    createdById: number;
    projectId: number;
    title: string;
    score: number | null;
    evaluatedAt: Date | null;
}>;
export declare function deleteEvaluation(id: number): Promise<{
    id: number;
    status: import("../../generated/prisma/enums").EvaluationStatus;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    createdById: number;
    projectId: number;
    title: string;
    score: number | null;
    evaluatedAt: Date | null;
}>;
export declare function getAverageEvaluationScore(projectId?: number): Promise<number | null>;
//# sourceMappingURL=evaluation.service.d.ts.map