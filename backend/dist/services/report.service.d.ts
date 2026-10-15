export declare function getDashboardStatistics(): Promise<{
    totals: {
        projects: number;
        beneficiaries: number;
        users: number;
        evaluations: number;
        internships: number;
        activities: number;
    };
    status: {
        activeProjects: number;
        completedProjects: number;
        activeUsers: number;
        completedInternships: number;
    };
}>;
export declare function getProjectStatistics(projectId: number): Promise<{
    project: {
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
    };
    statistics: {
        activities: number;
        completedActivities: number;
        milestones: number;
        completedMilestones: number;
        beneficiaries: number;
        evaluations: number;
        internships: number;
        averageEvaluationScore: number | null;
    };
}>;
export declare function getEvaluationStatistics(): Promise<{
    total: number;
    averageScore: number | null;
    draft: number;
    submitted: number;
    validated: number;
}>;
export declare function getBeneficiaryStatistics(): Promise<{
    total: number;
    vulnerable: number;
    male: number;
    female: number;
    other: number;
}>;
//# sourceMappingURL=report.service.d.ts.map