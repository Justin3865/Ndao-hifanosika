import { prisma } from "../config/database";

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

export async function findAllMilestones() {
  return prisma.milestone.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
    orderBy: [
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function findMilestoneById(
  id: number,
) {
  return prisma.milestone.findUnique({
    where: {
      id,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function createMilestone(
  data: MilestoneCreateData,
) {
  return prisma.milestone.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      progress: data.progress ?? 0,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function updateMilestone(
  id: number,
  data: MilestoneUpdateData,
) {
  return prisma.milestone.update({
    where: {
      id,
    },
    data,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function deleteMilestone(
  id: number,
) {
  return prisma.milestone.delete({
    where: {
      id,
    },
  });
}