import { prisma } from "../config/database";

export async function findAllActivities(projectId?: number) {
  return prisma.activity.findMany({
    where:
      projectId !== undefined
        ? {
            projectId,
          }
        : undefined,

    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

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

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findActivityById(id: number) {
  return prisma.activity.findUnique({
    where: {
      id,
    },

    include: {
      project: true,

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

export async function createActivity(data: {
  projectId: number;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?:
    | "PLANNED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  budget?: number | null;
  createdById: number;
}) {
  return prisma.activity.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status ?? "PLANNED",
      budget: data.budget ?? null,

      // Provient du JWT.
      createdById: data.createdById,
    },

    include: {
      project: true,

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

export async function updateActivity(
  id: number,
  data: {
    projectId?: number;
    title?: string;
    description?: string | null;
    location?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?:
      | "PLANNED"
      | "IN_PROGRESS"
      | "COMPLETED"
      | "CANCELLED";
    budget?: number | null;
  },
) {
  return prisma.activity.update({
    where: {
      id,
    },

    data,

    include: {
      project: true,

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

export async function deleteActivity(id: number) {
  return prisma.activity.delete({
    where: {
      id,
    },
  });
}