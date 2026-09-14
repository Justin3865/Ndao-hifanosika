// src/hooks/useUsers.ts
import { useState, useEffect, useCallback } from "react";
import { userService, User, UserFilters } from "@/services/user.service";

export interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  getUser: (id: string) => Promise<User | null>;
  createUser: (data: any) => Promise<User | null>;
  updateUser: (id: string, data: any) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: "active" | "inactive" | "pending") => Promise<User | null>;
  exportUsers: (format: "csv" | "excel" | "pdf") => Promise<Blob | null>;
  refetch: () => Promise<void>;
  filters: UserFilters;
  setFilters: (filters: UserFilters) => void;
}

export function useUsers(initialFilters: UserFilters = {}): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchUsers = useCallback(async (newFilters?: UserFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const response = await userService.getUsers(currentFilters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des utilisateurs");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getUser = useCallback(async (id: string): Promise<User | null> => {
    try {
      return await userService.getUserById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de l'utilisateur");
      return null;
    }
  }, []);

  const createUser = useCallback(async (data: any): Promise<User | null> => {
    try {
      const newUser = await userService.createUser(data);
      await fetchUsers();
      return newUser;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'utilisateur");
      return null;
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: string, data: any): Promise<User | null> => {
    try {
      const updatedUser = await userService.updateUser(id, data);
      await fetchUsers();
      return updatedUser;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour de l'utilisateur");
      return null;
    }
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      await userService.deleteUser(id);
      await fetchUsers();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'utilisateur");
      return false;
    }
  }, [fetchUsers]);

  const updateStatus = useCallback(async (id: string, status: "active" | "inactive" | "pending"): Promise<User | null> => {
    try {
      const updatedUser = await userService.updateUserStatus(id, status);
      await fetchUsers();
      return updatedUser;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du statut");
      return null;
    }
  }, [fetchUsers]);

  const exportUsers = useCallback(async (format: "csv" | "excel" | "pdf"): Promise<Blob | null> => {
    try {
      return await userService.exportUsers(format);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export des utilisateurs");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    pagination,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    updateStatus,
    exportUsers,
    refetch,
    filters,
    setFilters,
  };
}