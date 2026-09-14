// src/services/internship.service.ts
import api, { ApiResponse } from "./api";

export interface Internship {
  id: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  studentPhone?: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  level: "L3" | "M2";
  establishment: string;
  establishmentAddress?: string;
  subject: string;
  department: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  status: "en_cours" | "termine" | "annule";
  progress: number;
  finalGrade?: number;
  objectives: string[];
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InternshipFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  level?: string;
  page?: number;
  limit?: number;
}

export interface InternshipCreateData {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  tutorId: string;
  level: string;
  establishment: string;
  establishmentAddress?: string;
  subject: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  objectives?: string[];
  deliverables?: string[];
}

export interface InternshipUpdateData {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  tutorId?: string;
  level?: string;
  establishment?: string;
  establishmentAddress?: string;
  subject?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: "en_cours" | "termine" | "annule";
  progress?: number;
  objectives?: string[];
  deliverables?: string[];
}

export interface InternshipEvaluation {
  id: string;
  internshipId: string;
  criteria: {
    id: string;
    name: string;
    score: number;
    maxScore: number;
    weight: number;
  }[];
  totalScore: number;
  comments: string;
  recommendations: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
}

export interface InternshipCertificateData {
  internshipId: string;
  studentName: string;
  level: string;
  establishment: string;
  subject: string;
  startDate: string;
  endDate: string;
  tutorName: string;
  tutorTitle: string;
  department: string;
  finalGrade: number;
  comments: string;
}

class InternshipService {
  private readonly basePath = "/internships";

  // Récupérer la liste des stages
  async getInternships(filters: InternshipFilters = {}): Promise<{
    internships: Internship[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ internships: Internship[] }>(url);
    
    return {
      internships: response.data?.internships || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getInternshipById(id: string): Promise<Internship> {
    const response = await api.get<Internship>(`${this.basePath}/${id}`);
    return response.data!;
  }

  async createInternship(data: InternshipCreateData): Promise<Internship> {
    const response = await api.post<Internship>(this.basePath, data);
    return response.data!;
  }

  async updateInternship(id: string, data: InternshipUpdateData): Promise<Internship> {
    const response = await api.patch<Internship>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  async deleteInternship(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Évaluations de stage
  async getInternshipEvaluation(internshipId: string): Promise<InternshipEvaluation | null> {
    const response = await api.get<{ evaluation: InternshipEvaluation | null }>(`${this.basePath}/${internshipId}/evaluation`);
    return response.data?.evaluation || null;
  }

  async submitInternshipEvaluation(internshipId: string, data: {
    criteria: { id: string; score: number }[];
    comments: string;
    recommendations: string;
  }): Promise<InternshipEvaluation> {
    const response = await api.post<InternshipEvaluation>(`${this.basePath}/${internshipId}/evaluation`, data);
    return response.data!;
  }

  // Attestation de stage
  async generateCertificate(internshipId: string): Promise<InternshipCertificateData> {
    const response = await api.get<InternshipCertificateData>(`${this.basePath}/${internshipId}/certificate`);
    return response.data!;
  }

  async downloadCertificate(internshipId: string, format: "pdf" | "word" = "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/${internshipId}/certificate/download`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  async sendCertificateByEmail(internshipId: string, email?: string): Promise<ApiResponse> {
    return api.post(`${this.basePath}/${internshipId}/certificate/send`, { email });
  }

  // Statistiques
  async getInternshipStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byLevel: Record<string, number>;
    byDepartment: Record<string, number>;
    averageGrade: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byLevel: Record<string, number>;
      byDepartment: Record<string, number>;
      averageGrade: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exports
  async exportInternships(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Validation
  async validateInternship(id: string): Promise<Internship> {
    const response = await api.post<Internship>(`${this.basePath}/${id}/validate`);
    return response.data!;
  }

  async cancelInternship(id: string, reason?: string): Promise<Internship> {
    const response = await api.post<Internship>(`${this.basePath}/${id}/cancel`, { reason });
    return response.data!;
  }
}

// Singleton
export const internshipService = new InternshipService();

export default internshipService;