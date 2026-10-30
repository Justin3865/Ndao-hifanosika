import bcrypt from "bcrypt";
import { prisma } from "../config/database";

export async function loginUser(
  email: string,
  password: string,
) {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      department: true,
    },
  });

  if (!user) {
    throw new Error("EMAIL_OR_PASSWORD_INVALID");
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.password,
  );

  if (!passwordValid) {
    throw new Error("EMAIL_OR_PASSWORD_INVALID");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
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
    departmentId: user.departmentId,
    department: user.department,
    lastLoginAt: new Date(),
  };
}

export async function registerUser(data: {
  firstName?: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: any;
  departmentId?: number;
}) {
  const normalizedEmail = data.email
    .trim()
    .toLowerCase();

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    12,
  );

  return prisma.user.create({
    data: {
      firstName: (data.firstName ?? "").trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: data.phone || null,
      gender: data.gender || null,

      /*
       * IMPORTANT :
       * Une inscription publique ne choisit pas
       * son rôle.
       */
      role: "STAGIAIRE_L3",

      /*
       * Le compte doit être validé.
       */
      status: "PENDING",

      departmentId:
        data.departmentId ?? null,
    },
    include: {
      department: true,
    },
  });
}

export async function getUserSession(
  userId: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      department: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
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
    departmentId: user.departmentId,
    department: user.department,
    lastLoginAt: user.lastLoginAt,
  };
}