// src/lib/usersApi.ts
// Accès API réel pour le module Utilisateurs (remplace les données mock).

import api from "@/lib/axios";

export interface ApiUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  departmentId?: number | null;
  department?: { id: number; name: string; code?: string } | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface ApiDepartment {
  id: number;
  name: string;
  code?: string;
}

export interface UserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  role?: string;
  status?: string;
  departmentId?: number | null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;

  return message || fallback;
}

export async function fetchUsers(): Promise<ApiUser[]> {
  const res = await api.get("/users");
  return res.data?.users ?? [];
}

export async function fetchUser(id: string | number): Promise<ApiUser> {
  const res = await api.get(`/users/${id}`);
  return res.data.user;
}

export async function fetchDepartments(): Promise<ApiDepartment[]> {
  const res = await api.get("/departements");
  return res.data?.departments ?? [];
}

export async function createUser(payload: UserPayload): Promise<ApiUser> {
  const res = await api.post("/users", payload);
  return res.data.user;
}

export async function updateUser(
  id: string | number,
  payload: Partial<UserPayload>
): Promise<ApiUser> {
  const res = await api.put(`/users/${id}`, payload);
  return res.data.user;
}

export async function deleteUser(id: string | number): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function activateUser(id: string | number): Promise<void> {
  await api.patch(`/users/${id}/activate`);
}

export async function rejectUser(id: string | number): Promise<void> {
  await api.patch(`/users/${id}/reject`);
}

export function fullName(user: Pick<ApiUser, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initialsOf(user: Pick<ApiUser, "firstName" | "lastName">) {
  return (
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?"
  );
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Jamais";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
