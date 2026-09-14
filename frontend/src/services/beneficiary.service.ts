// src/services/beneficiary.service.ts
import api, { ApiResponse } from "./api";

export interface Beneficiary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age: number;
  gender: "F" | "M";
  program: string;
  programId: string;
  status: "actif" | "en_cours" | "termine" | "abandon";
  vulnerability: "enfant" | "femme" | "jeune" | "handicap" | "aucune";
  address?: string;
  education?: string;
  joinDate: string;
  progress: number;
  evaluations: number;
  skills: string[];
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryFilters {
  search?: string;
  programId?: string;
  status?: string;
  vulnerability?: string;
  page?: number;
  limit?: number;
}

export interface BeneficiaryCreateData {
  name: string;
  email?: string;
  phone?: string;
  age: number;
  gender: string;
  programId: string;
  vulnerability: string;
  address?: string;
  education?: string;
  joinDate: string;
  skills?: string[];
  objectives?: string[];
}

export interface BeneficiaryUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  programId?: string;
  status?: "actif" | "en_cours" | "termine" | "abandon";
  vulnerability?: "enfant" | "femme" | "jeune" | "handicap" | "aucune";
  address?: string;
  education?: string;
  joinDate?: string;
  progress?: number;
  skills?: string[];
  objectives?: string[];
}

export interface BeneficiaryEvaluation {
  id: string;
  beneficiaryId: string;
  date: string;
  score: number;
  type: string;
  evaluator: string;
  comments?: string;
}

export interface BeneficiaryProgress {
  id: string;
  beneficiaryId: string;
  date: string;
  progress: number;
  notes?: string;
}

class BeneficiaryService {
  private readonly basePath = "/beneficiaries";

  // Récupérer la liste des bénéficiaires
  async getBeneficiaries(filters: BeneficiaryFilters = {}): Promise<{
    beneficiaries: Beneficiary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ beneficiaries: Beneficiary[] }>(url);
    
    return {
      beneficiaries: response.data?.beneficiaries || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un bénéficiaire par ID
  async getBeneficiaryById(id: string): Promise<Beneficiary> {
    const response = await api.get<Beneficiary>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un bénéficiaire
  async createBeneficiary(data: BeneficiaryCreateData): Promise<Beneficiary> {
    const response = await api.post<Beneficiary>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un bénéficiaire
  async updateBeneficiary(id: string, data: BeneficiaryUpdateData): Promise<Beneficiary> {
    const response = await api.patch<Beneficiary>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un bénéficiaire
  async deleteBeneficiary(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les bénéficiaires d'un programme
  async getBeneficiariesByProgram(programId: string): Promise<Beneficiary[]> {
    const response = await api.get<{ beneficiaries: Beneficiary[] }>(`${this.basePath}/program/${programId}`);
    return response.data?.beneficiaries || [];
  }

  // Récupérer les bénéficiaires par statut
  async getBeneficiariesByStatus(status: string): Promise<Beneficiary[]> {
    const response = await api.get<{ beneficiaries: Beneficiary[] }>(`${this.basePath}/status/${status}`);
    return response.data?.beneficiaries || [];
  }

  // Récupérer les bénéficiaires par vulnérabilité
  async getBeneficiariesByVulnerability(vulnerability: string): Promise<Beneficiary[]> {
    const response = await api.get<{ beneficiaries: Beneficiary[] }>(`${this.basePath}/vulnerability/${vulnerability}`);
    return response.data?.beneficiaries || [];
  }

  // Récupérer les évaluations d'un bénéficiaire
  async getBeneficiaryEvaluations(beneficiaryId: string): Promise<BeneficiaryEvaluation[]> {
    const response = await api.get<{ evaluations: BeneficiaryEvaluation[] }>(`${this.basePath}/${beneficiaryId}/evaluations`);
    return response.data?.evaluations || [];
  }

  // Ajouter une évaluation à un bénéficiaire
  async addBeneficiaryEvaluation(beneficiaryId: string, data: Omit<BeneficiaryEvaluation, "id" | "beneficiaryId">): Promise<BeneficiaryEvaluation> {
    const response = await api.post<BeneficiaryEvaluation>(`${this.basePath}/${beneficiaryId}/evaluations`, data);
    return response.data!;
  }

  // Récupérer la progression d'un bénéficiaire
  async getBeneficiaryProgress(beneficiaryId: string): Promise<BeneficiaryProgress[]> {
    const response = await api.get<{ progress: BeneficiaryProgress[] }>(`${this.basePath}/${beneficiaryId}/progress`);
    return response.data?.progress || [];
  }

  // Mettre à jour la progression d'un bénéficiaire
  async updateBeneficiaryProgress(beneficiaryId: string, progress: number, notes?: string): Promise<BeneficiaryProgress> {
    const response = await api.post<BeneficiaryProgress>(`${this.basePath}/${beneficiaryId}/progress`, { progress, notes });
    return response.data!;
  }

  // Récupérer les statistiques des bénéficiaires
  async getBeneficiaryStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProgram: Record<string, number>;
    byVulnerability: Record<string, number>;
    averageProgress: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byProgram: Record<string, number>;
      byVulnerability: Record<string, number>;
      averageProgress: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les bénéficiaires
  async exportBeneficiaries(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Anonymiser un bénéficiaire pour l'export
  async anonymizeBeneficiary(id: string): Promise<Beneficiary> {
    const response = await api.post<Beneficiary>(`${this.basePath}/${id}/anonymize`);
    return response.data!;
  }

  // Vérifier si un bénéficiaire existe déjà
  async checkBeneficiaryExists(name: string, programId: string): Promise<boolean> {
    const response = await api.get<{ exists: boolean }>(`${this.basePath}/check-exists`, {
      params: { name, programId },
    });
    return response.data?.exists || false;
  }
}

// Singleton
export const beneficiaryService = new BeneficiaryService();

export default beneficiaryService;