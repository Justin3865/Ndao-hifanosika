export type MilestoneCreateData = {
    projectId: number;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    progress?: number;
};
export type MilestoneUpdateData = {
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
    progress?: number;
};
export declare function findAllMilestones(): Promise<({
    project: {
        id: number;
        status: import("../../generated/prisma/enums").ProjectStatus;
        name: string;
        code: string;
        createdById: number;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    projectId: number;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
})[]>;
export declare function findMilestoneById(id: number): Promise<({
    project: {
        id: number;
        status: import("../../generated/prisma/enums").ProjectStatus;
        name: string;
        code: string;
        createdById: number;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    projectId: number;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
}) | null>;
export declare function createMilestone(data: MilestoneCreateData): Promise<{
    project: {
        id: number;
        status: import("../../generated/prisma/enums").ProjectStatus;
        name: string;
        code: string;
        createdById: number;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    projectId: number;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
}>;
export declare function updateMilestone(id: number, data: MilestoneUpdateData): Promise<{
    project: {
        id: number;
        status: import("../../generated/prisma/enums").ProjectStatus;
        name: string;
        code: string;
        createdById: number;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    projectId: number;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
}>;
export declare function deleteMilestone(id: number): Promise<{
    id: number;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    projectId: number;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
}>;
//# sourceMappingURL=milestone.service.d.ts.map