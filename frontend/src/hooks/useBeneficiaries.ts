// src/hooks/useBeneficiaries.ts
import { useState, useEffect, useCallback } from "react";
import { beneficiaryService, Beneficiary, BeneficiaryFilters } from "@/services/beneficiary.service";

export interface UseBeneficiariesReturn {
  beneficiaries: Beneficiary[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchBeneficiaries: (filters?: BeneficiaryFilters) => Promise<void>;
  getBeneficiary: (id: string) => Promise<Beneficiary | null>;
  createBeneficiary: (data: any) => Promise<Beneficiary | null>;
  updateBeneficiary: (id: string, data: any) => Promise<Beneficiary | null>;
  deleteBeneficiary: (id: string) => Promise<boolean>;
  updateProgress: (id: string, progress: number, notes?: string) => Promise<any>;
  getBeneficiaryEvaluations: (id: string) => Promise<any[]>;
  exportBeneficiaries: (format: "csv" | "excel" | "pdf") => Promise<Blob | null>;
  refetch: () => Promise<void>;
  filters: BeneficiaryFilters;
  setFilters: (filters: BeneficiaryFilters) => void;
}

export function useBeneficiaries(initialFilters: BeneficiaryFilters = {}): UseBeneficiariesReturn {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<BeneficiaryFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchBeneficiaries = useCallback(async (newFilters?: BeneficiaryFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const response = await beneficiaryService.getBeneficiaries(currentFilters);
      setBeneficiaries(response.beneficiaries);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des bénéficiaires");
      setBeneficiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getBeneficiary = useCallback(async (id: string): Promise<Beneficiary | null> => {
    try {
      return await beneficiaryService.getBeneficiaryById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du bénéficiaire");
      return null;
    }
  }, []);

  const createBeneficiary = useCallback(async (data: any): Promise<Beneficiary | null> => {
    try {
      const newBeneficiary = await beneficiaryService.createBeneficiary(data);
      await fetchBeneficiaries();
      return newBeneficiary;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du bénéficiaire");
      return null;
    }
  }, [fetchBeneficiaries]);

  const updateBeneficiary = useCallback(async (id: string, data: any): Promise<Beneficiary | null> => {
    try {
      const updatedBeneficiary = await beneficiaryService.updateBeneficiary(id, data);
      await fetchBeneficiaries();
      return updatedBeneficiary;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du bénéficiaire");
      return null;
    }
  }, [fetchBeneficiaries]);

  const deleteBeneficiary = useCallback(async (id: string): Promise<boolean> => {
    try {
      await beneficiaryService.deleteBeneficiary(id);
      await fetchBeneficiaries();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du bénéficiaire");
      return false;
    }
  }, [fetchBeneficiaries]);

  const updateProgress = useCallback(async (id: string, progress: number, notes?: string): Promise<any> => {
    try {
      const result = await beneficiaryService.updateBeneficiaryProgress(id, progress, notes);
      await fetchBeneficiaries();
      return result;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour de la progression");
      return null;
    }
  }, [fetchBeneficiaries]);

  const getBeneficiaryEvaluations = useCallback(async (id: string): Promise<any[]> => {
    try {
      return await beneficiaryService.getBeneficiaryEvaluations(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des évaluations");
      return [];
    }
  }, []);

  const exportBeneficiaries = useCallback(async (format: "csv" | "excel" | "pdf"): Promise<Blob | null> => {
    try {
      return await beneficiaryService.exportBeneficiaries(format);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export des bénéficiaires");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  return {
    beneficiaries,
    isLoading,
    error,
    pagination,
    fetchBeneficiaries,
    getBeneficiary,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    updateProgress,
    getBeneficiaryEvaluations,
    exportBeneficiaries,
    refetch,
    filters,
    setFilters,
  };
}