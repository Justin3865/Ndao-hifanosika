// src/services/project.service.ts
import api, { ApiResponse } from "./api";

export interface Project {
  id: string;
  name: string;
  description: string;
  donor: string;
  startDate: string;
  endDate: string;
  status: "planifie" | "en_cours" | "cloture";
  progress: number;
  budget: number;
  members: number;
  beneficiaries: number;
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  donor?: string;
  page?: number;
  limit?: number;
}

export interface ProjectCreateData {
  name: string;
  description: string;
  donor: string;
  startDate: string;
  endDate: string;
  budget: number;
  objectives?: string[];
}

export interface ProjectUpdateData {
  name?: string;
  description?: string;
  donor?: string;
  startDate?: string;
  endDate?: string;
  status?: "planifie" | "en_cours" | "cloture";
  budget?: number;
  objectives?: string[];
}

class ProjectService {
  private readonly basePath = "/projects";

  // Récupérer la liste des projets
  async getProjects(filters: ProjectFilters = {}): Promise<{
    projects: Project[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ projects: Project[] }>(url);
    
    return {
      projects: response.data?.projects || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un projet par ID
  async getProjectById(id: string): Promise<Project> {
    const response = await api.get<Project>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un projet
  async createProject(data: ProjectCreateData): Promise<Project> {
    const response = await api.post<Project>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un projet
  async updateProject(id: string, data: ProjectUpdateData): Promise<Project> {
    const response = await api.patch<Project>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un projet
  async deleteProject(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les activités d'un projet
  async getProjectActivities(projectId: string): Promise<any[]> {
    const response = await api.get<{ activities: any[] }>(`${this.basePath}/${projectId}/activities`);
    return response.data?.activities || [];
  }

  // Récupérer les jalons d'un projet
  async getProjectMilestones(projectId: string): Promise<any[]> {
    const response = await api.get<{ milestones: any[] }>(`${this.basePath}/${projectId}/milestones`);
    return response.data?.milestones || [];
  }

  // Récupérer les membres d'un projet
  async getProjectMembers(projectId: string): Promise<any[]> {
    const response = await api.get<{ members: any[] }>(`${this.basePath}/${projectId}/members`);
    return response.data?.members || [];
  }

  // Récupérer les bénéficiaires d'un projet
  async getProjectBeneficiaries(projectId: string): Promise<any[]> {
    const response = await api.get<{ beneficiaries: any[] }>(`${this.basePath}/${projectId}/beneficiaries`);
    return response.data?.beneficiaries || [];
  }

  // Récupérer les statistiques des projets
  async getProjectStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byDonor: Record<string, number>;
    totalBudget: number;
    averageProgress: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byDonor: Record<string, number>;
      totalBudget: number;
      averageProgress: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les projets
  async exportProjects(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Mettre à jour la progression d'un projet
  async updateProjectProgress(id: string, progress: number): Promise<Project> {
    const response = await api.patch<Project>(`${this.basePath}/${id}/progress`, { progress });
    return response.data!;
  }

  // Clôturer un projet
  async closeProject(id: string): Promise<Project> {
    const response = await api.post<Project>(`${this.basePath}/${id}/close`);
    return response.data!;
  }

  // Vérifier si un nom de projet existe déjà
  async checkNameAvailability(name: string): Promise<boolean> {
    const response = await api.get<{ available: boolean }>(`${this.basePath}/check-name`, {
      params: { name },
    });
    return response.data?.available || false;
  }
}

// Singleton
export const projectService = new ProjectService();

export default projectService;