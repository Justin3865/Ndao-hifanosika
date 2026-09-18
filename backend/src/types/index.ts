import { Request } from "express";

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  status?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}