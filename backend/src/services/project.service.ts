import { prisma } from "../config/database";

export async function findAllProjects(createdById?: number) {
  return prisma.project.findMany({
    where:
      createdById !== undefined
        ? {
            createdById,
          }
        : undefined,

    include: {
      department: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },

      _count: {
        select: {
          activities: true,
          milestones: true,
          beneficiaries: true,
          evaluations: true,
          internships: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findProjectById(id: number) {
  return prisma.project.findUnique({
    where: {
      id,
    },

    include: {
      department: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },

      activities: true,
      milestones: true,
      beneficiaries: true,
      evaluations: true,
      internships: true,
    },
  });
}

export async function createProject(data: {
  name: string;
  code: string;
  description?: string | null;
  objective?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?:
    | "DRAFT"
    | "ACTIVE"
    | "SUSPENDED"
    | "COMPLETED"
    | "CANCELLED";
  budget?: number | null;
  beneficiaryTarget?: number | null;
  departmentId?: number | null;
  createdById: number;
}) {
  return prisma.project.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      objective: data.objective ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status ?? "DRAFT",
      budget: data.budget ?? null,
      beneficiaryTarget:
        data.beneficiaryTarget ?? null,
      departmentId: data.departmentId ?? null,

      /*
       * Toujours issu du JWT.
       */
      createdById: data.createdById,
    },

    include: {
      department: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function updateProject(
  id: number,
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    objective?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?:
      | "DRAFT"
      | "ACTIVE"
      | "SUSPENDED"
      | "COMPLETED"
      | "CANCELLED";
    budget?: number | null;
    beneficiaryTarget?: number | null;
    departmentId?: number | null;
  },
) {
  return prisma.project.update({
    where: {
      id,
    },

    data,

    include: {
      department: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function deleteProject(id: number) {
  return prisma.project.delete({
    where: {
      id,
    },
  });
}