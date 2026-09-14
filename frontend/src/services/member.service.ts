// src/services/member.service.ts
import api, { ApiResponse } from "./api";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  departmentId: string;
  status: "actif" | "inactif" | "en_conge";
  type: "salarie" | "stagiaire" | "benevole";
  joinDate: string;
  evaluations: number;
  skills: string[];
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface MemberCreateData {
  name: string;
  email: string;
  phone?: string;
  position: string;
  departmentId: string;
  type: string;
  joinDate: string;
  skills?: string[];
  objectives?: string[];
}

export interface MemberUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  departmentId?: string;
  status?: "actif" | "inactif" | "en_conge";
  type?: "salarie" | "stagiaire" | "benevole";
  joinDate?: string;
  skills?: string[];
  objectives?: string[];
}

export interface MemberEvaluation {
  id: string;
  memberId: string;
  date: string;
  score: number;
  type: string;
  evaluator: string;
  comments?: string;
}

class MemberService {
  private readonly basePath = "/members";

  // Récupérer la liste des membres
  async getMembers(filters: MemberFilters = {}): Promise<{
    members: Member[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ members: Member[] }>(url);
    
    return {
      members: response.data?.members || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Récupérer un membre par ID
  async getMemberById(id: string): Promise<Member> {
    const response = await api.get<Member>(`${this.basePath}/${id}`);
    return response.data!;
  }

  // Créer un membre
  async createMember(data: MemberCreateData): Promise<Member> {
    const response = await api.post<Member>(this.basePath, data);
    return response.data!;
  }

  // Mettre à jour un membre
  async updateMember(id: string, data: MemberUpdateData): Promise<Member> {
    const response = await api.patch<Member>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  // Supprimer un membre
  async deleteMember(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Récupérer les membres d'un département
  async getMembersByDepartment(departmentId: string): Promise<Member[]> {
    const response = await api.get<{ members: Member[] }>(`${this.basePath}/department/${departmentId}`);
    return response.data?.members || [];
  }

  // Récupérer les membres d'un projet
  async getMembersByProject(projectId: string): Promise<Member[]> {
    const response = await api.get<{ members: Member[] }>(`${this.basePath}/project/${projectId}`);
    return response.data?.members || [];
  }

  // Récupérer les évaluations d'un membre
  async getMemberEvaluations(memberId: string): Promise<MemberEvaluation[]> {
    const response = await api.get<{ evaluations: MemberEvaluation[] }>(`${this.basePath}/${memberId}/evaluations`);
    return response.data?.evaluations || [];
  }

  // Ajouter une évaluation à un membre
  async addMemberEvaluation(memberId: string, data: Omit<MemberEvaluation, "id" | "memberId">): Promise<MemberEvaluation> {
    const response = await api.post<MemberEvaluation>(`${this.basePath}/${memberId}/evaluations`, data);
    return response.data!;
  }

  // Récupérer les statistiques des membres
  async getMemberStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byDepartment: Record<string, number>;
    averageScore: number;
  }> {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byDepartment: Record<string, number>;
      averageScore: number;
    }>(`${this.basePath}/stats`);
    return response.data!;
  }

  // Exporter les membres
  async exportMembers(format: "csv" | "excel" | "pdf"): Promise<Blob> {
    const response = await api.get<Blob>(`${this.basePath}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data!;
  }

  // Mettre à jour le statut d'un membre
  async updateMemberStatus(id: string, status: "actif" | "inactif" | "en_conge"): Promise<Member> {
    const response = await api.patch<Member>(`${this.basePath}/${id}/status`, { status });
    return response.data!;
  }
}

// Singleton
export const memberService = new MemberService();

export default memberService;