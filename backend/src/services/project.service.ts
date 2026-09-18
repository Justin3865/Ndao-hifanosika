import { prisma } from "../config/database";

export async function findAllProjects() {
  return prisma.project.findMany({
    include: {
      department: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
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
    where: { id },
    include: {
      department: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
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
  description?: string;
  objective?: string;
  startDate?: Date;
  endDate?: Date;
  status?: any;
  budget?: number;
  beneficiaryTarget?: number;
  departmentId?: number;
  createdById: number;
}) {
  return prisma.project.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description,
      objective: data.objective,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? "DRAFT",
      budget: data.budget,
      beneficiaryTarget: data.beneficiaryTarget,
      departmentId: data.departmentId,
      createdById: data.createdById,
    },
    include: {
      department: true,
      createdBy: true,
    },
  });
}

export async function updateProject(
  id: number,
  data: {
    name?: string;
    code?: string;
    description?: string;
    objective?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: any;
    budget?: number | null;
    beneficiaryTarget?: number | null;
    departmentId?: number | null;
    createdById?: number;
  },
) {
  return prisma.project.update({
    where: { id },
    data,
    include: {
      department: true,
      createdBy: true,
    },
  });
}

export async function deleteProject(id: number) {
  return prisma.project.delete({
    where: { id },
  });
}