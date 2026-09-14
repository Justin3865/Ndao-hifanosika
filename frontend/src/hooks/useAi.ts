// src/hooks/useAi.ts
import { useState, useCallback } from "react";
import { aiService } from "@/services/ai.service";

export interface UseAiReturn {
  isLoading: boolean;
  error: string | null;
  health: () => Promise<{ status: string; version: string } | null>;
  predictDropoutRisk: (data: any) => Promise<any>;
  predictPerformanceScore: (data: any) => Promise<any>;
  generateSummary: (data: any) => Promise<any>;
  detectAnomalies: (data: any) => Promise<any>;
  getRecommendations: (data: any) => Promise<any[]>;
  analyzeText: (text: string) => Promise<any>;
  getModelStatus: () => Promise<any>;
  retrainModel: (modelName: string) => Promise<any>;
  clearError: () => void;
}

export function useAi(): UseAiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleRequest = useCallback(async <T>(
    request: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await request();
      return result;
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const health = useCallback(async () => {
    return handleRequest(() => aiService.health());
  }, [handleRequest]);

  const predictDropoutRisk = useCallback(async (data: any) => {
    return handleRequest(() => aiService.predictDropoutRisk(data));
  }, [handleRequest]);

  const predictPerformanceScore = useCallback(async (data: any) => {
    return handleRequest(() => aiService.predictPerformanceScore(data));
  }, [handleRequest]);

  const generateSummary = useCallback(async (data: any) => {
    return handleRequest(() => aiService.generateSummary(data));
  }, [handleRequest]);

  const detectAnomalies = useCallback(async (data: any) => {
    return handleRequest(() => aiService.detectAnomalies(data));
  }, [handleRequest]);

  const getRecommendations = useCallback(async (data: any) => {
    return handleRequest(() => aiService.getRecommendations(data));
  }, [handleRequest]);

  const analyzeText = useCallback(async (text: string) => {
    return handleRequest(() => aiService.analyzeText(text));
  }, [handleRequest]);

  const getModelStatus = useCallback(async () => {
    return handleRequest(() => aiService.getModelStatus());
  }, [handleRequest]);

  const retrainModel = useCallback(async (modelName: string) => {
    return handleRequest(() => aiService.retrainModel(modelName));
  }, [handleRequest]);

  return {
    isLoading,
    error,
    health,
    predictDropoutRisk,
    predictPerformanceScore,
    generateSummary,
    detectAnomalies,
    getRecommendations,
    analyzeText,
    getModelStatus,
    retrainModel,
    clearError,
  };
}

// Hook pour les prédictions de risque de décrochage
export function useDropoutRisk() {
  const { predictDropoutRisk, isLoading, error } = useAi();

  const predict = useCallback(async (beneficiaryId: string, data: any) => {
    return predictDropoutRisk({ beneficiaryId, data });
  }, [predictDropoutRisk]);

  return { predict, isLoading, error };
}

// Hook pour les prédictions de performance
export function usePerformanceScore() {
  const { predictPerformanceScore, isLoading, error } = useAi();

  const predict = useCallback(async (memberId: string, data: any) => {
    return predictPerformanceScore({ memberId, data });
  }, [predictPerformanceScore]);

  return { predict, isLoading, error };
}

// Hook pour les synthèses
export function useSummary() {
  const { generateSummary, isLoading, error } = useAi();

  const generate = useCallback(async (projectId: string, period: { from: string; to: string }, data: any) => {
    return generateSummary({ projectId, period, data });
  }, [generateSummary]);

  return { generate, isLoading, error };
}

// Hook pour les anomalies
export function useAnomalyDetection() {
  const { detectAnomalies, isLoading, error } = useAi();

  const detect = useCallback(async (entityType: string, data: any[]) => {
    return detectAnomalies({ entityType, data });
  }, [detectAnomalies]);

  return { detect, isLoading, error };
}

// Hook pour les recommandations
export function useAiRecommendations() {
  const { getRecommendations, isLoading, error } = useAi();

  const get = useCallback(async (type: string, context: any) => {
    return getRecommendations({ type, context });
  }, [getRecommendations]);

  return { get, isLoading, error };
}