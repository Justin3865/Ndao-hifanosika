// src/services/report.service.ts
import api, { ApiResponse } from "./api";

export interface Report {
  id: string;
  title: string;
  type: "projet" | "beneficiaire" | "membre" | "global" | "bailleur";
  projectId?: string;
  project?: string;
  period: string;
  description?: string;
  generatedBy: string;
  generatedById: string;
  generatedDate: string;
  status: "termine" | "en_cours" | "planifie";
  format: "pdf" | "excel" | "word";
  size?: string;
  sections: ReportSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  pages?: number;
}

export interface ReportFilters {
  search?: string;
  type?: string;
  status?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: string;
  page?: number;
  limit?: number;
}

export interface ReportCreateData {
  title: string;
  type: string;
  projectId?: string;
  period: string;
  description?: string;
  format: string;
  sections: { title: string; content: string }[];
  includeCharts?: boolean;
  includeMetrics?: boolean;
}

export interface ReportUpdateData {
  title?: string;
  type?: string;
  projectId?: string;
  period?: string;
  description?: string;
  status?: "termine" | "en_cours" | "planifie";
  format?: string;
  sections?: { title: string; content: string }[];
}

export interface ReportExportData {
  format: "pdf" | "excel" | "word" | "csv";
  includeCharts?: boolean;
  includeMetrics?: boolean;
  dateRange?: { from: string; to: string };
}

export interface BailleurReport {
  id: string;
  projectName: string;
  donor: string;
  period: string;
  generatedDate: string;
  status: "termine" | "en_cours" | "planifie";
  format: string;
  recipient: string;
  sent: boolean;
  sentDate?: string;
}

class ReportService {
  private readonly basePath = "/reports";

  // Récupérer la liste des rapports
  async getReports(filters: ReportFilters = {}): Promise<{
    reports: Report[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ reports: Report[] }>(url);
    
    return {
      reports: response.data?.reports || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getReportById(id: string): Promise<Report> {
    const response = await api.get<Report>(`${this.basePath}/${id}`);
    return response.data!;
  }

  async createReport(data: ReportCreateData): Promise<Report> {
    const response = await api.post<Report>(this.basePath, data);
    return response.data!;
  }

  async updateReport(id: string, data: ReportUpdateData): Promise<Report> {
    const response = await api.patch<Report>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  async deleteReport(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Génération de rapport
  async generateReport(data: ReportCreateData): Promise<Report> {
    const response = await api.post<Report>(`${this.basePath}/generate`, data);
    return response.data!;
  }

  async generateFromTemplate(templateId: string, data: any): Promise<Report> {
    const response = await api.post<Report>(`${this.basePath}/generate-from-template`, {
      templateId,
      data,
    });
    return response.data!;
  }

  // Export de rapport
  async exportReport(id: string, exportData: ReportExportData): Promise<Blob> {
    const response = await api.post<Blob>(`${this.basePath}/${id}/export`, exportData, {
      responseType: "blob",
    });
    return response.data!;
  }

  async downloadReport(id: string, format: "pdf" | "excel" | "word" = "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/${id}/download`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Rapports bailleurs
  async getBailleurReports(): Promise<BailleurReport[]> {
    const response = await api.get<{ reports: BailleurReport[] }>(`${this.basePath}/bailleurs`);
    return response.data?.reports || [];
  }

  async getBailleurReportById(id: string): Promise<BailleurReport> {
    const response = await api.get<BailleurReport>(`${this.basePath}/bailleurs/${id}`);
    return response.data!;
  }

  async sendBailleurReport(id: string, recipientEmail?: string): Promise<ApiResponse> {
    return api.post(`${this.basePath}/bailleurs/${id}/send`, { recipientEmail });
  }

  async generateBailleurReport(projectId: string, period: string, donor: string): Promise<Report> {
    const response = await api.post<Report>(`${this.basePath}/bailleurs/generate`, {
      projectId,
      period,
      donor,
    });
    return response.data!;
  }

  // Statistiques
  async getReportStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byFormat: Record<string, number>;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byFormat: Record<string, number>;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exports
  async exportReports(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Templates
  async getReportTemplates(): Promise<{ id: string; name: string; description: string; type: string }[]> {
    const response = await api.get<{ templates: any[] }>(`${this.basePath}/templates`);
    return response.data?.templates || [];
  }

  async createReportTemplate(data: any): Promise<any> {
    const response = await api.post(`${this.basePath}/templates`, data);
    return response.data;
  }
}

// Singleton
export const reportService = new ReportService();

export default reportService;