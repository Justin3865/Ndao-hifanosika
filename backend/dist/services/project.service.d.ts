export declare function findAllProjects(createdById?: number): Promise<({
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
    _count: {
        internships: number;
        activities: number;
        milestones: number;
        evaluations: number;
        beneficiaries: number;
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
})[]>;
export declare function findProjectById(id: number): Promise<({
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
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
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
    activities: {
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
    }[];
    milestones: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        projectId: number;
        title: string;
        dueDate: Date | null;
        completedAt: Date | null;
        progress: number;
    }[];
    evaluations: {
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
    }[];
    beneficiaries: {
        email: string | null;
        id: number;
        firstName: string;
        lastName: string;
        phone: string | null;
        gender: import("../../generated/prisma/enums").Gender | null;
        createdAt: Date;
        updatedAt: Date;
        projectId: number;
        age: number | null;
        vulnerable: boolean;
    }[];
} & {
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
}) | null>;
export declare function createProject(data: {
    name: string;
    code: string;
    description?: string | null;
    objective?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: "DRAFT" | "ACTIVE" | "SUSPENDED" | "COMPLETED" | "CANCELLED";
    budget?: number | null;
    beneficiaryTarget?: number | null;
    departmentId?: number | null;
    createdById: number;
}): Promise<{
    department: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    } | null;
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
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
}>;
export declare function updateProject(id: number, data: {
    name?: string;
    code?: string;
    description?: string | null;
    objective?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: "DRAFT" | "ACTIVE" | "SUSPENDED" | "COMPLETED" | "CANCELLED";
    budget?: number | null;
    beneficiaryTarget?: number | null;
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
    createdBy: {
        email: string;
        id: number;
        firstName: string;
        lastName: string;
        role: import("../../generated/prisma/enums").UserRole;
    };
} & {
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
}>;
export declare function deleteProject(id: number): Promise<{
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
}>;
//# sourceMappingURL=project.service.d.ts.map