import { prisma } from "../config/database";

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      department: true,
    },
  });

  if (!user) {
    throw new Error("EMAIL_OR_PASSWORD_INVALID");
  }

  if (user.password !== password) {
    throw new Error("EMAIL_OR_PASSWORD_INVALID");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    role: user.role,
    status: user.status,
    department: user.department,
  };
}

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: any;
  role?: any;
  departmentId?: number;
}) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  return prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      gender: data.gender,
      role: data.role ?? "STAGIAIRE_L3",
      status: "PENDING",
      departmentId: data.departmentId,
    },
    include: {
      department: true,
    },
  });
}

export async function getUserSession(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    role: user.role,
    status: user.status,
    department: user.department,
    lastLoginAt: user.lastLoginAt,
  };
}