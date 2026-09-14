// src/services/activity.service.ts
import api, { ApiResponse } from "./api";

export interface Activity {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: string;
  date: string;
  time: string;
  endTime: string;
  location?: string;
  type: "formation" | "atelier" | "reunion" | "suivi" | "autre";
  status: "planifie" | "en_cours" | "termine" | "annule";
  participants: number;
  organizer: string;
  objectives: string[];
  report?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFilters {
  search?: string;
  projectId?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ActivityCreateData {
  title: string;
  description: string;
  projectId: string;
  date: string;
  time: string;
  endTime: string;
  location?: string;
  type: string;
  participants: number;
  organizer: string;
  objectives?: string[];
}

export interface ActivityUpdateData {
  title?: string;
  description?: string;
  projectId?: string;
  date?: string;
  time?: string;
  endTime?: string;
  location?: string;
  type?: string;
  status?: "planifie" | "en_cours" | "termine" | "annule";
  participants?: number;
  organizer?: string;
  objectives?: string[];
  report?: string;
}

class ActivityService {
  private readonly basePath = "/activities";

  // Récupérer la liste des activités
  async getActivities(filters: ActivityFilters = {}): Promise<{
    activities: Activity[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ activities: Activity[] }>(url);
    
    return {
      activities: response.data?.activities || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer une activité par ID
  async getActivityById(id: string): Promise<Activity> {
    const response = await api.get<Activity>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer une activité
  async createActivity(data: ActivityCreateData): Promise<Activity> {
    const response = await api.post<Activity>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour une activité
  async updateActivity(id: string, data: ActivityUpdateData): Promise<Activity> {
    const response = await api.patch<Activity>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer une activité
  async deleteActivity(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les activités d'un projet
  async getActivitiesByProject(projectId: string, filters: Omit<ActivityFilters, "projectId"> = {}): Promise<Activity[]> {
    const response = await api.get<{ activities: Activity[] }>(`${this.basePath}/project/${projectId}`, {
      params: filters,
    });
    return response.data?.activities || [];
  }

  // Récupérer les activités par statut
  async getActivitiesByStatus(status: string): Promise<Activity[]> {
    const response = await api.get<{ activities: Activity[] }>(`${this.basePath}/status/${status}`);
    return response.data?.activities || [];
  }

  // Récupérer les activités à venir
  async getUpcomingActivities(limit: number = 10): Promise<Activity[]> {
    const response = await api.get<{ activities: Activity[] }>(`${this.basePath}/upcoming`, {
      params: { limit },
    });
    return response.data?.activities || [];
  }

  // Récupérer les statistiques des activités
  async getActivityStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byProject: Record<string, number>;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byProject: Record<string, number>;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les activités
  async exportActivities(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Marquer une activité comme terminée
  async completeActivity(id: string, report?: string): Promise<Activity> {
    const response = await api.post<Activity>(`${this.basePath}/${id}/complete`, { report });
    return response.data!;
  }

  // Annuler une activité
  async cancelActivity(id: string, reason?: string): Promise<Activity> {
    const response = await api.post<Activity>(`${this.basePath}/${id}/cancel`, { reason });
    return response.data!;
  }

  // Ajouter un rapport à une activité
  async addReport(id: string, report: string): Promise<Activity> {
    const response = await api.patch<Activity>(`${this.basePath}/${id}/report`, { report });
    return response.data!;
  }
}

// Singleton
export const activityService = new ActivityService();

export default activityService;