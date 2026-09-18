import { prisma } from "../config/database";

export async function findAllInternships() {
  return prisma.internship.findMany({
    include: {
      project: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      supervisor: {
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

export async function findInternshipById(id: number) {
  return prisma.internship.findUnique({
    where: { id },
    include: {
      project: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      supervisor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
  });
}

export async function createInternship(data: {
  projectId?: number;
  studentId: number;
  supervisorId?: number;
  title: string;
  institution?: string;
  startDate: Date;
  endDate?: Date;
  status?: any;
  description?: string;
}) {
  return prisma.internship.create({
    data: {
      projectId: data.projectId,
      studentId: data.studentId,
      supervisorId: data.supervisorId,
      title: data.title,
      institution: data.institution,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? "PENDING",
      description: data.description,
    },
    include: {
      project: true,
      student: true,
      supervisor: true,
    },
  });
}

export async function updateInternship(
  id: number,
  data: {
    projectId?: number | null;
    studentId?: number;
    supervisorId?: number | null;
    title?: string;
    institution?: string;
    startDate?: Date;
    endDate?: Date | null;
    status?: any;
    description?: string;
  },
) {
  return prisma.internship.update({
    where: { id },
    data,
    include: {
      project: true,
      student: true,
      supervisor: true,
    },
  });
}

export async function deleteInternship(id: number) {
  return prisma.internship.delete({
    where: { id },
  });
}

export async function countInternships() {
  return prisma.internship.count();
}

export async function countCompletedInternships() {
  return prisma.internship.count({
    where: {
      status: "COMPLETED",
    },
  });
}