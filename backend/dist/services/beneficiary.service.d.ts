export declare function findAllBeneficiaries(projectId?: number): Promise<({
    project: {
        id: number;
        name: string;
        code: string;
    };
} & {
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
})[]>;
export declare function findBeneficiaryById(id: number): Promise<({
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
} & {
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
}) | null>;
export declare function createBeneficiary(data: {
    projectId: number;
    firstName: string;
    lastName: string;
    gender?: any;
    age?: number;
    phone?: string;
    email?: string;
    vulnerable?: boolean;
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
} & {
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
}>;
export declare function updateBeneficiary(id: number, data: {
    projectId?: number;
    firstName?: string;
    lastName?: string;
    gender?: any;
    age?: number | null;
    phone?: string;
    email?: string;
    vulnerable?: boolean;
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
} & {
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
}>;
export declare function deleteBeneficiary(id: number): Promise<{
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
}>;
export declare function countBeneficiaries(projectId?: number): Promise<number>;
//# sourceMappingURL=beneficiary.service.d.ts.map