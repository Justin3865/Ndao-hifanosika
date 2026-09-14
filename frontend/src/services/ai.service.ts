// src/services/ai.service.ts
import api from "./api";

export interface DropoutRiskRequest {
  beneficiaryId: string;
  data: {
    presence: number[];
    progression: number[];
    evaluations: number[];
    socioEconomic?: any;
  };
}

export interface DropoutRiskResponse {
  score: number;
  level: "faible" | "modere" | "eleve" | "critique";
  factors: string[];
  recommendations: string[];
  confidence: number;
}

export interface PerformanceScoreRequest {
  memberId: string;
  data: {
    evaluations: { date: string; score: number; weight: number }[];
    skills: string[];
    objectives: string[];
  };
}

export interface PerformanceScoreResponse {
  score: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
  strengths: string[];
  improvements: string[];
  predictedScore: number;
  confidence: number;
}

export interface SummaryRequest {
  projectId: string;
  period: { from: string; to: string };
  data: {
    activities: any[];
    beneficiaries: any[];
    milestones: any[];
    evaluations: any[];
  };
}

export interface SummaryResponse {
  title: string;
  content: string;
  keyPoints: string[];
  wordCount: number;
  metrics: { label: string; value: string; trend: "up" | "down" | "stable" }[];
}

export interface AnomalyDetectionRequest {
  entityType: "beneficiary" | "member" | "project" | "activity" | "evaluation";
  data: any[];
}

export interface AnomalyDetectionResponse {
  anomalies: {
    id: string;
    type: "doublon" | "incoherent" | "manquant" | "suspect";
    description: string;
    entity: string;
    severity: "critique" | "eleve" | "modere" | "faible";
    suggestion: string;
  }[];
}

export interface RecommendationRequest {
  type: "dropout" | "performance" | "anomaly" | "summary";
  context: any;
}

export interface RecommendationResponse {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: "haute" | "moyenne" | "basse";
  confidence: number;
  actions: string[];
  targetName?: string;
  targetType?: string;
  createdAt: string;
}

class AiService {
  private readonly basePath = "/ai";

  // Health check
  async health(): Promise<{ status: string; version: string }> {
    const response = await api.aiGet(`${this.basePath}/health`);
    return response;
  }

  // Scoring de risque de décrochage
  async predictDropoutRisk(request: DropoutRiskRequest): Promise<DropoutRiskResponse> {
    const response = await api.aiPost(`${this.basePath}/score/dropout-risk`, request);
    return response;
  }

  // Scoring de performance
  async predictPerformanceScore(request: PerformanceScoreRequest): Promise<PerformanceScoreResponse> {
    const response = await api.aiPost(`${this.basePath}/score/performance`, request);
    return response;
  }

  // Génération de synthèse
  async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    const response = await api.aiPost(`${this.basePath}/report/summary`, request);
    return response;
  }

  // Détection d'anomalies
  async detectAnomalies(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResponse> {
    const response = await api.aiPost(`${this.basePath}/anomaly/detect`, request);
    return response;
  }

  // Recommandations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse[]> {
    const response = await api.aiPost(`${this.basePath}/recommendations`, request);
    return response;
  }

  // Analyse de texte
  async analyzeText(text: string): Promise<{
    sentiment: "positive" | "negative" | "neutral";
    keywords: string[];
    summary: string;
  }> {
    const response = await api.aiPost(`${this.basePath}/analyze-text`, { text });
    return response;
  }

  // Batch processing
  async batchPredictDropoutRisk(requests: DropoutRiskRequest[]): Promise<DropoutRiskResponse[]> {
    const response = await api.aiPost(`${this.basePath}/batch/dropout-risk`, { requests });
    return response;
  }

  async batchPredictPerformanceScore(requests: PerformanceScoreRequest[]): Promise<PerformanceScoreResponse[]> {
    const response = await api.aiPost(`${this.basePath}/batch/performance`, { requests });
    return response;
  }

  // Modèles
  async getModelStatus(): Promise<{
    models: {
      name: string;
      version: string;
      status: "active" | "training" | "inactive";
      accuracy: number;
      lastTraining: string;
    }[];
  }> {
    const response = await api.aiGet(`${this.basePath}/models/status`);
    return response;
  }

  async retrainModel(modelName: string): Promise<{ status: string; message: string }> {
    const response = await api.aiPost(`${this.basePath}/models/${modelName}/retrain`);
    return response;
  }
}

// Singleton
export const aiService = new AiService();

export default aiService;