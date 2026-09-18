import { prisma } from "../config/database";

export async function findAllActivities(projectId?: number) {
  return prisma.activity.findMany({
    where: projectId
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
    where: { id },
    include: {
      project: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export async function createActivity(data: {
  projectId: number;
  title: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status?: any;
  budget?: number;
  createdById: number;
}) {
  return prisma.activity.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? "PLANNED",
      budget: data.budget,
      createdById: data.createdById,
    },
    include: {
      project: true,
      createdBy: true,
    },
  });
}

export async function updateActivity(
  id: number,
  data: {
    projectId?: number;
    title?: string;
    description?: string;
    location?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: any;
    budget?: number | null;
    createdById?: number;
  },
) {
  return prisma.activity.update({
    where: { id },
    data,
    include: {
      project: true,
      createdBy: true,
    },
  });
}

export async function deleteActivity(id: number) {
  return prisma.activity.delete({
    where: { id },
  });
}