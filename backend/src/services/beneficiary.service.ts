import { prisma } from "../config/database";

export async function findAllBeneficiaries(projectId?: number) {
  return prisma.beneficiary.findMany({
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findBeneficiaryById(id: number) {
  return prisma.beneficiary.findUnique({
    where: { id },
    include: {
      project: true,
    },
  });
}

export async function createBeneficiary(data: {
  projectId: number;
  firstName: string;
  lastName: string;
  gender?: any;
  age?: number;
  phone?: string;
  email?: string;
  vulnerable?: boolean;
}) {
  return prisma.beneficiary.create({
    data: {
      projectId: data.projectId,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      age: data.age,
      phone: data.phone,
      email: data.email,
      vulnerable: data.vulnerable ?? false,
    },
    include: {
      project: true,
    },
  });
}

export async function updateBeneficiary(
  id: number,
  data: {
    projectId?: number;
    firstName?: string;
    lastName?: string;
    gender?: any;
    age?: number | null;
    phone?: string;
    email?: string;
    vulnerable?: boolean;
  },
) {
  return prisma.beneficiary.update({
    where: { id },
    data,
    include: {
      project: true,
    },
  });
}

export async function deleteBeneficiary(id: number) {
  return prisma.beneficiary.delete({
    where: { id },
  });
}

export async function countBeneficiaries(projectId?: number) {
  return prisma.beneficiary.count({
    where: projectId
      ? {
          projectId,
        }
      : undefined,
  });
}