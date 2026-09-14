// src/services/user.service.ts
import api, { ApiResponse } from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  position?: string;
  status: "active" | "inactive" | "pending";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  department: string;
  position?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  status?: string;
}

class UserService {
  private readonly basePath = "/users";

  // Récupérer la liste des utilisateurs
  async getUsers(filters: UserFilters = {}): Promise<{
    users: User[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ users: User[] }>(url);
    
    return {
      users: response.data?.users || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un utilisateur par ID
  async getUserById(id: string): Promise<User> {
    const response = await api.get<User>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un utilisateur
  async createUser(data: UserCreateData): Promise<User> {
    const response = await api.post<User>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un utilisateur
  async updateUser(id: string, data: UserUpdateData): Promise<User> {
    const response = await api.patch<User>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un utilisateur
  async deleteUser(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Changer le statut d'un utilisateur
  async updateUserStatus(id: string, status: "active" | "inactive" | "pending"): Promise<User> {
    const response = await api.patch<User>(`${this.basePath}/${id}/status`, { status });
    return response.data!;
  }

  // Récupérer les utilisateurs par département
  async getUsersByDepartment(departmentId: string): Promise<User[]> {
    const response = await api.get<{ users: User[] }>(`${this.basePath}/department/${departmentId}`);
    return response.data?.users || [];
  }

  // Récupérer les utilisateurs par rôle
  async getUsersByRole(role: string): Promise<User[]> {
    const response = await api.get<{ users: User[] }>(`${this.basePath}/role/${role}`);
    return response.data?.users || [];
  }

  // Récupérer les utilisateurs par projet
  async getUsersByProject(projectId: string): Promise<User[]> {
    const response = await api.get<{ users: User[] }>(`${this.basePath}/project/${projectId}`);
    return response.data?.users || [];
  }

  // Rechercher des utilisateurs
  async searchUsers(query: string, filters: UserFilters = {}): Promise<User[]> {
    const response = await api.get<{ users: User[] }>(`${this.basePath}/search`, {
      params: { query, ...filters },
    });
    return response.data?.users || [];
  }

  // Récupérer les statistiques des utilisateurs
  async getUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const response = await api.get<{
      total: number;
      byRole: Record<string, number>;
      byDepartment: Record<string, number>;
      byStatus: Record<string, number>;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les utilisateurs
  async exportUsers(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Importer des utilisateurs
  async importUsers(file: File): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    return api.upload(`${this.basePath}/import`, file);
  }
}

// Singleton
export const userService = new UserService();

export default userService;