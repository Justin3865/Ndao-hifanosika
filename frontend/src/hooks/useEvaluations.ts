// src/hooks/useEvaluations.ts
import { useState, useEffect, useCallback } from "react";
import { evaluationService, Evaluation, EvaluationFilters } from "@/services/evaluation.service";

export interface UseEvaluationsReturn {
  evaluations: Evaluation[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchEvaluations: (filters?: EvaluationFilters) => Promise<void>;
  getEvaluation: (id: string) => Promise<Evaluation | null>;
  createEvaluation: (data: any) => Promise<Evaluation | null>;
  updateEvaluation: (id: string, data: any) => Promise<Evaluation | null>;
  deleteEvaluation: (id: string) => Promise<boolean>;
  getEvaluationScores: (id: string) => Promise<any[]>;
  submitEvaluationScores: (id: string, scores: any[]) => Promise<Evaluation | null>;
  completeEvaluation: (id: string) => Promise<Evaluation | null>;
  exportEvaluations: (format: "csv" | "excel" | "pdf") => Promise<Blob | null>;
  refetch: () => Promise<void>;
  filters: EvaluationFilters;
  setFilters: (filters: EvaluationFilters) => void;
}

export function useEvaluations(initialFilters: EvaluationFilters = {}): UseEvaluationsReturn {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<EvaluationFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchEvaluations = useCallback(async (newFilters?: EvaluationFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const response = await evaluationService.getEvaluations(currentFilters);
      setEvaluations(response.evaluations);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des évaluations");
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getEvaluation = useCallback(async (id: string): Promise<Evaluation | null> => {
    try {
      return await evaluationService.getEvaluationById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de l'évaluation");
      return null;
    }
  }, []);

  const createEvaluation = useCallback(async (data: any): Promise<Evaluation | null> => {
    try {
      const newEvaluation = await evaluationService.createEvaluation(data);
      await fetchEvaluations();
      return newEvaluation;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'évaluation");
      return null;
    }
  }, [fetchEvaluations]);

  const updateEvaluation = useCallback(async (id: string, data: any): Promise<Evaluation | null> => {
    try {
      const updatedEvaluation = await evaluationService.updateEvaluation(id, data);
      await fetchEvaluations();
      return updatedEvaluation;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour de l'évaluation");
      return null;
    }
  }, [fetchEvaluations]);

  const deleteEvaluation = useCallback(async (id: string): Promise<boolean> => {
    try {
      await evaluationService.deleteEvaluation(id);
      await fetchEvaluations();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'évaluation");
      return false;
    }
  }, [fetchEvaluations]);

  const getEvaluationScores = useCallback(async (id: string): Promise<any[]> => {
    try {
      return await evaluationService.getEvaluationScores(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des scores");
      return [];
    }
  }, []);

  const submitEvaluationScores = useCallback(async (id: string, scores: any[]): Promise<Evaluation | null> => {
    try {
      const result = await evaluationService.submitEvaluationScores(id, scores);
      await fetchEvaluations();
      return result;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la soumission des scores");
      return null;
    }
  }, [fetchEvaluations]);

  const completeEvaluation = useCallback(async (id: string): Promise<Evaluation | null> => {
    try {
      const result = await evaluationService.completeEvaluation(id);
      await fetchEvaluations();
      return result;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la finalisation de l'évaluation");
      return null;
    }
  }, [fetchEvaluations]);

  const exportEvaluations = useCallback(async (format: "csv" | "excel" | "pdf"): Promise<Blob | null> => {
    try {
      return await evaluationService.exportEvaluations(format);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export des évaluations");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchEvaluations();
  }, [fetchEvaluations]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  return {
    evaluations,
    isLoading,
    error,
    pagination,
    fetchEvaluations,
    getEvaluation,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    getEvaluationScores,
    submitEvaluationScores,
    completeEvaluation,
    exportEvaluations,
    refetch,
    filters,
    setFilters,
  };
}