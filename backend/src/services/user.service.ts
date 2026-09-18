import { prisma } from "../config/database";

export async function findAllUsers() {
  return prisma.user.findMany({
    include: {
      department: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      projectsCreated: true,
      internships: true,
      supervisedInternships: true,
    },
  });
}

export async function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: any;
  role?: any;
  status?: any;
  departmentId?: number;
}) {
  return prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      gender: data.gender,
      role: data.role ?? "STAGIAIRE_L3",
      status: data.status ?? "PENDING",
      departmentId: data.departmentId,
    },
    include: {
      department: true,
    },
  });
}

export async function updateUser(
  id: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
    gender?: any;
    role?: any;
    status?: any;
    departmentId?: number | null;
  },
) {
  return prisma.user.update({
    where: { id },
    data,
    include: {
      department: true,
    },
  });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({
    where: { id },
  });
}

export async function getActiveUsers() {
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      department: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}