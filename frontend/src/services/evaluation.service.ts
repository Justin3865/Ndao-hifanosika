// src/services/evaluation.service.ts
import api, { ApiResponse } from "./api";

export interface Evaluation {
  id: string;
  title: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  targetId: string;
  targetName: string;
  targetType: string;
  evaluatorId: string;
  evaluatorName: string;
  gridId: string;
  gridName: string;
  period: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  score?: number;
  dueDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  description?: string;
}

export interface EvaluationScore {
  criteriaId: string;
  score: number;
  comment?: string;
}

export interface EvaluationFilters {
  search?: string;
  type?: string;
  status?: string;
  targetId?: string;
  evaluatorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface EvaluationCreateData {
  title: string;
  type: string;
  targetId: string;
  evaluatorId: string;
  gridId: string;
  period: string;
  dueDate: string;
}

export interface EvaluationUpdateData {
  title?: string;
  type?: string;
  targetId?: string;
  evaluatorId?: string;
  gridId?: string;
  period?: string;
  status?: "planifie" | "en_cours" | "termine" | "annule";
  dueDate?: string;
}

export interface EvaluationGrid {
  id: string;
  name: string;
  description?: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  criteria: EvaluationCriteria[];
  status: "actif" | "inactif";
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationGridCreateData {
  name: string;
  description?: string;
  type: string;
  criteria: Omit<EvaluationCriteria, "id">[];
}

export interface EvaluationCampaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  totalEvaluations: number;
  completedEvaluations: number;
  createdAt: string;
}

export interface EvaluationCampaignCreateData {
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  targetIds?: string[];
  evaluatorIds?: string[];
  gridId: string;
}

class EvaluationService {
  private readonly basePath = "/evaluations";

  // ----- Évaluations -----
  async getEvaluations(filters: EvaluationFilters = {}): Promise<{
    evaluations: Evaluation[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ evaluations: Evaluation[] }>(url);
    
    return {
      evaluations: response.data?.evaluations || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getEvaluationById(id: string): Promise<Evaluation> {
    const response = await api.get<Evaluation>(`${this.basePath}/${id}`);
    return response.data!;
  }

  async createEvaluation(data: EvaluationCreateData): Promise<Evaluation> {
    const response = await api.post<Evaluation>(this.basePath, data);
    return response.data!;
  }

  async updateEvaluation(id: string, data: EvaluationUpdateData): Promise<Evaluation> {
    const response = await api.patch<Evaluation>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  async deleteEvaluation(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // ----- Scores d'évaluation -----
  async getEvaluationScores(evaluationId: string): Promise<EvaluationScore[]> {
    const response = await api.get<{ scores: EvaluationScore[] }>(`${this.basePath}/${evaluationId}/scores`);
    return response.data?.scores || [];
  }

  async submitEvaluationScores(evaluationId: string, scores: EvaluationScore[]): Promise<Evaluation> {
    const response = await api.post<Evaluation>(`${this.basePath}/${evaluationId}/scores`, { scores });
    return response.data!;
  }

  async completeEvaluation(evaluationId: string): Promise<Evaluation> {
    const response = await api.post<Evaluation>(`${this.basePath}/${evaluationId}/complete`);
    return response.data!;
  }

  // ----- Grilles d'évaluation -----
  async getEvaluationGrids(filters?: { type?: string; status?: string }): Promise<EvaluationGrid[]> {
    const response = await api.get<{ grids: EvaluationGrid[] }>(`${this.basePath}/grids`, {
      params: filters,
    });
    return response.data?.grids || [];
  }

  async getEvaluationGridById(id: string): Promise<EvaluationGrid> {
    const response = await api.get<EvaluationGrid>(`${this.basePath}/grids/${id}`);
    return response.data!;
  }

  async createEvaluationGrid(data: EvaluationGridCreateData): Promise<EvaluationGrid> {
    const response = await api.post<EvaluationGrid>(`${this.basePath}/grids`, data);
    return response.data!;
  }

  async updateEvaluationGrid(id: string, data: Partial<EvaluationGridCreateData>): Promise<EvaluationGrid> {
    const response = await api.patch<EvaluationGrid>(`${this.basePath}/grids/${id}`, data);
    return response.data!;
  }

  async deleteEvaluationGrid(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/grids/${id}`);
  }

  // ----- Campagnes d'évaluation -----
  async getEvaluationCampaigns(): Promise<EvaluationCampaign[]> {
    const response = await api.get<{ campaigns: EvaluationCampaign[] }>(`${this.basePath}/campaigns`);
    return response.data?.campaigns || [];
  }

  async getEvaluationCampaignById(id: string): Promise<EvaluationCampaign> {
    const response = await api.get<EvaluationCampaign>(`${this.basePath}/campaigns/${id}`);
    return response.data!;
  }

  async createEvaluationCampaign(data: EvaluationCampaignCreateData): Promise<EvaluationCampaign> {
    const response = await api.post<EvaluationCampaign>(`${this.basePath}/campaigns`, data);
    return response.data!;
  }

  async updateEvaluationCampaign(id: string, data: Partial<EvaluationCampaignCreateData>): Promise<EvaluationCampaign> {
    const response = await api.patch<EvaluationCampaign>(`${this.basePath}/campaigns/${id}`, data);
    return response.data!;
  }

  async deleteEvaluationCampaign(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/campaigns/${id}`);
  }

  async launchEvaluationCampaign(id: string): Promise<EvaluationCampaign> {
    const response = await api.post<EvaluationCampaign>(`${this.basePath}/campaigns/${id}/launch`);
    return response.data!;
  }

  // ----- Statistiques -----
  async getEvaluationStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageScore: number;
    completionRate: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      averageScore: number;
      completionRate: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // ----- Exports -----
  async exportEvaluations(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }
}

// Singleton
export const evaluationService = new EvaluationService();

export default evaluationService;