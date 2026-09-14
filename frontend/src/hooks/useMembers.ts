// src/hooks/useMembers.ts
import { useState, useEffect, useCallback } from "react";
import { memberService, Member, MemberFilters } from "@/services/member.service";

export interface UseMembersReturn {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchMembers: (filters?: MemberFilters) => Promise<void>;
  getMember: (id: string) => Promise<Member | null>;
  createMember: (data: any) => Promise<Member | null>;
  updateMember: (id: string, data: any) => Promise<Member | null>;
  deleteMember: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: "actif" | "inactif" | "en_conge") => Promise<Member | null>;
  getMemberEvaluations: (id: string) => Promise<any[]>;
  exportMembers: (format: "csv" | "excel" | "pdf") => Promise<Blob | null>;
  refetch: () => Promise<void>;
  filters: MemberFilters;
  setFilters: (filters: MemberFilters) => void;
}

export function useMembers(initialFilters: MemberFilters = {}): UseMembersReturn {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<MemberFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchMembers = useCallback(async (newFilters?: MemberFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const response = await memberService.getMembers(currentFilters);
      setMembers(response.members);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des membres");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getMember = useCallback(async (id: string): Promise<Member | null> => {
    try {
      return await memberService.getMemberById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du membre");
      return null;
    }
  }, []);

  const createMember = useCallback(async (data: any): Promise<Member | null> => {
    try {
      const newMember = await memberService.createMember(data);
      await fetchMembers();
      return newMember;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du membre");
      return null;
    }
  }, [fetchMembers]);

  const updateMember = useCallback(async (id: string, data: any): Promise<Member | null> => {
    try {
      const updatedMember = await memberService.updateMember(id, data);
      await fetchMembers();
      return updatedMember;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du membre");
      return null;
    }
  }, [fetchMembers]);

  const deleteMember = useCallback(async (id: string): Promise<boolean> => {
    try {
      await memberService.deleteMember(id);
      await fetchMembers();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du membre");
      return false;
    }
  }, [fetchMembers]);

  const updateStatus = useCallback(async (id: string, status: "actif" | "inactif" | "en_conge"): Promise<Member | null> => {
    try {
      const updatedMember = await memberService.updateMemberStatus(id, status);
      await fetchMembers();
      return updatedMember;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du statut");
      return null;
    }
  }, [fetchMembers]);

  const getMemberEvaluations = useCallback(async (id: string): Promise<any[]> => {
    try {
      return await memberService.getMemberEvaluations(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des évaluations");
      return [];
    }
  }, []);

  const exportMembers = useCallback(async (format: "csv" | "excel" | "pdf"): Promise<Blob | null> => {
    try {
      return await memberService.exportMembers(format);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export des membres");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    error,
    pagination,
    fetchMembers,
    getMember,
    createMember,
    updateMember,
    deleteMember,
    updateStatus,
    getMemberEvaluations,
    exportMembers,
    refetch,
    filters,
    setFilters,
  };
}