// src/services/milestone.service.ts
import api, { ApiResponse } from "./api";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: string;
  targetDate: string;
  actualDate?: string;
  status: "planifie" | "en_cours" | "termine" | "retard";
  progress: number;
  objectives: string[];
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneFilters {
  search?: string;
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MilestoneCreateData {
  title: string;
  description: string;
  projectId: string;
  targetDate: string;
  objectives?: string[];
  deliverables?: string[];
}

export interface MilestoneUpdateData {
  title?: string;
  description?: string;
  projectId?: string;
  targetDate?: string;
  actualDate?: string;
  status?: "planifie" | "en_cours" | "termine" | "retard";
  progress?: number;
  objectives?: string[];
  deliverables?: string[];
}

class MilestoneService {
  private readonly basePath = "/milestones";

  // Récupérer la liste des jalons
  async getMilestones(filters: MilestoneFilters = {}): Promise<{
    milestones: Milestone[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ milestones: Milestone[] }>(url);
    
    return {
      milestones: response.data?.milestones || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un jalon par ID
  async getMilestoneById(id: string): Promise<Milestone> {
    const response = await api.get<Milestone>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un jalon
  async createMilestone(data: MilestoneCreateData): Promise<Milestone> {
    const response = await api.post<Milestone>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un jalon
  async updateMilestone(id: string, data: MilestoneUpdateData): Promise<Milestone> {
    const response = await api.patch<Milestone>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un jalon
  async deleteMilestone(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les jalons d'un projet
  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    const response = await api.get<{ milestones: Milestone[] }>(`${this.basePath}/project/${projectId}`);
    return response.data?.milestones || [];
  }

  // Récupérer les jalons par statut
  async getMilestonesByStatus(status: string): Promise<Milestone[]> {
    const response = await api.get<{ milestones: Milestone[] }>(`${this.basePath}/status/${status}`);
    return response.data?.milestones || [];
  }

  // Récupérer les jalons à venir
  async getUpcomingMilestones(limit: number = 10): Promise<Milestone[]> {
    const response = await api.get<{ milestones: Milestone[] }>(`${this.basePath}/upcoming`, {
      params: { limit },
    });
    return response.data?.milestones || [];
  }

  // Récupérer les statistiques des jalons
  async getMilestoneStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProject: Record<string, number>;
    completed: number;
    overdue: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byProject: Record<string, number>;
      completed: number;
      overdue: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Marquer un jalon comme terminé
  async completeMilestone(id: string, actualDate?: string): Promise<Milestone> {
    const response = await api.post<Milestone>(`${this.basePath}/${id}/complete`, { actualDate });
    return response.data!;
  }

  // Mettre à jour la progression d'un jalon
  async updateMilestoneProgress(id: string, progress: number): Promise<Milestone> {
    const response = await api.patch<Milestone>(`${this.basePath}/${id}/progress`, { progress });
    return response.data!;
  }

  // Exporter les jalons
  async exportMilestones(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }
}

// Singleton
export const milestoneService = new MilestoneService();

export default milestoneService;