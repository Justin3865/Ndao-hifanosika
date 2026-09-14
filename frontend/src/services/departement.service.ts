// src/services/departement.service.ts
import api, { ApiResponse } from "./api";

export interface Departement {
  id: string;
  name: string;
  description: string;
  chef: string;
  chefEmail: string;
  memberCount: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  projects: string[];
}

export interface DepartementFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DepartementCreateData {
  name: string;
  description: string;
  chef: string;
  chefEmail: string;
  projects?: string[];
}

export interface DepartementUpdateData {
  name?: string;
  description?: string;
  chef?: string;
  chefEmail?: string;
  status?: "active" | "inactive";
  projects?: string[];
}

class DepartementService {
  private readonly basePath = "/departements";

  // Récupérer la liste des départements
  async getDepartements(filters: DepartementFilters = {}): Promise<{
    departements: Departement[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ departements: Departement[] }>(url);
    
    return {
      departements: response.data?.departements || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un département par ID
  async getDepartementById(id: string): Promise<Departement> {
    const response = await api.get<Departement>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un département
  async createDepartement(data: DepartementCreateData): Promise<Departement> {
    const response = await api.post<Departement>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un département
  async updateDepartement(id: string, data: DepartementUpdateData): Promise<Departement> {
    const response = await api.patch<Departement>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un département
  async deleteDepartement(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les membres d'un département
  async getDepartementMembers(departementId: string): Promise<any[]> {
    const response = await api.get<{ members: any[] }>(`${this.basePath}/${departementId}/members`);
    return response.data?.members || [];
  }

  // Récupérer les projets d'un département
  async getDepartementProjects(departementId: string): Promise<any[]> {
    const response = await api.get<{ projects: any[] }>(`${this.basePath}/${departementId}/projects`);
    return response.data?.projects || [];
  }

  // Récupérer les statistiques des départements
  async getDepartementStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    membersByDepartement: Record<string, number>;
  }> {
    const response = await api.get<{
      total: number;
      active: number;
      inactive: number;
      membersByDepartement: Record<string, number>;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les départements
  async exportDepartements(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Vérifier si un nom de département existe déjà
  async checkNameAvailability(name: string): Promise<boolean> {
    const response = await api.get<{ available: boolean }>(`${this.basePath}/check-name`, {
      params: { name },
    });
    return response.data?.available || false;
  }
}

// Singleton
export const departementService = new DepartementService();

export default departementService;