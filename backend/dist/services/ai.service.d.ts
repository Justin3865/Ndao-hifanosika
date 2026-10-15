export type DropoutRiskInput = {
    age?: number;
    attendanceRate: number;
    evaluationAverage: number;
    activitiesCompleted?: number;
    missedActivities?: number;
};
export type DropoutRiskResult = {
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    model: string;
};
export declare function checkAIHealth(): Promise<{
    service: string;
    status: string;
    provider: string;
    timestamp: string;
}>;
export declare function calculateDropoutRisk(input: DropoutRiskInput): Promise<DropoutRiskResult>;
//# sourceMappingURL=ai.service.d.ts.map