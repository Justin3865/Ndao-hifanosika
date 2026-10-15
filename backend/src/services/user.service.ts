import bcrypt from "bcrypt";

import { prisma } from "../config/database";

const USER_ROLES = [
  "ADMIN",
  "DIRECTION",
  "DSI",
  "DAF",
  "RH",
  "COMMUNICATION",
  "COORDINATOR",
  "TUTEUR_L3",
  "TUTEUR_M2",
  "STAGIAIRE_L3",
  "STAGIAIRE_M2",
] as const;

const USER_STATUSES = [
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "INACTIVE",
] as const;

/**
 * Un seul ADMIN est autorisé dans tout le système.
 * excludeUserId : l'utilisateur modifié (il peut rester ADMIN).
 */
async function assertSingleAdmin(
  role: string,
  excludeUserId?: number,
): Promise<void> {
  if (role !== "ADMIN") return;

  const otherAdmins = await prisma.user.count({
    where: {
      role: "ADMIN",
      ...(excludeUserId !== undefined
        ? { id: { not: excludeUserId } }
        : {}),
    },
  });

  if (otherAdmins > 0) {
    throw new Error("ADMIN_ALREADY_EXISTS");
  }
}

export type UserRole =
  (typeof USER_ROLES)[number];

export type UserStatus =
  (typeof USER_STATUSES)[number];

export function isValidUserRole(
  role: unknown,
): role is UserRole {
  return (
    typeof role === "string" &&
    USER_ROLES.includes(
      role.toUpperCase() as UserRole,
    )
  );
}

export function isValidUserStatus(
  status: unknown,
): status is UserStatus {
  return (
    typeof status === "string" &&
    USER_STATUSES.includes(
      status.toUpperCase() as UserStatus,
    )
  );
}

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

export async function findUserById(
  id: number,
) {
  return prisma.user.findUnique({
    where: {
      id,
    },
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
  phone?: string | null;
  gender?: any;
  role?: string;
  status?: string;
  departmentId?: number | null;
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

  const normalizedRole = (
    data.role ?? "STAGIAIRE_L3"
  )
    .toString()
    .trim()
    .toUpperCase();

  const normalizedStatus = (
    data.status ?? "PENDING"
  )
    .toString()
    .trim()
    .toUpperCase();

  if (!isValidUserRole(normalizedRole)) {
    throw new Error("INVALID_USER_ROLE");
  }

  if (!isValidUserStatus(normalizedStatus)) {
    throw new Error("INVALID_USER_STATUS");
  }

  await assertSingleAdmin(normalizedRole);

  const hashedPassword =
    await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: data.phone || null,
      gender: data.gender || null,
      role: normalizedRole,
      status: normalizedStatus,
      departmentId:
        data.departmentId ?? null,
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
    phone?: string | null;
    gender?: any;
    role?: string;
    status?: string;
    departmentId?: number | null;
  },
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  const updateData: any = {};

  if (data.firstName !== undefined) {
    updateData.firstName =
      data.firstName.trim();
  }

  if (data.lastName !== undefined) {
    updateData.lastName =
      data.lastName.trim();
  }

  if (data.email !== undefined) {
    const normalizedEmail = data.email
      .trim()
      .toLowerCase();

    const emailUsed =
      await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

    if (emailUsed) {
      throw new Error(
        "EMAIL_ALREADY_EXISTS",
      );
    }

    updateData.email = normalizedEmail;
  }

  if (data.password !== undefined) {
    if (data.password.length < 8) {
      throw new Error(
        "PASSWORD_TOO_SHORT",
      );
    }

    updateData.password =
      await bcrypt.hash(
        data.password,
        12,
      );
  }

  if (data.phone !== undefined) {
    updateData.phone =
      data.phone || null;
  }

  if (data.gender !== undefined) {
    updateData.gender =
      data.gender || null;
  }

  if (data.role !== undefined) {
    const normalizedRole =
      data.role
        .trim()
        .toUpperCase();

    if (!isValidUserRole(normalizedRole)) {
      throw new Error(
        "INVALID_USER_ROLE",
      );
    }

    await assertSingleAdmin(normalizedRole, id);

    updateData.role =
      normalizedRole;
  }

  if (data.status !== undefined) {
    const normalizedStatus =
      data.status
        .trim()
        .toUpperCase();

    if (!isValidUserStatus(normalizedStatus)) {
      throw new Error(
        "INVALID_USER_STATUS",
      );
    }

    updateData.status =
      normalizedStatus;
  }

  if (
    data.departmentId !== undefined
  ) {
    updateData.departmentId =
      data.departmentId;
  }

  return prisma.user.update({
    where: {
      id,
    },
    data: updateData,
    include: {
      department: true,
    },
  });
}

export async function deleteUser(
  id: number,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  return prisma.user.delete({
    where: {
      id,
    },
  });
}

export async function activateUser(
  id: number,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  if (existingUser.status !== "PENDING") {
    throw new Error(
      "USER_NOT_PENDING",
    );
  }

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
    include: {
      department: true,
    },
  });
}

export async function rejectUser(
  id: number,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  if (existingUser.status !== "PENDING") {
    throw new Error(
      "USER_NOT_PENDING",
    );
  }

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      status: "REJECTED",
    },
    include: {
      department: true,
    },
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