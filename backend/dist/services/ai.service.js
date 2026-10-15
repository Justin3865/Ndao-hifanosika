"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAIHealth = checkAIHealth;
exports.calculateDropoutRisk = calculateDropoutRisk;
const logger_1 = require("../config/logger");
async function checkAIHealth() {
    return {
        service: "Ndao Hifanosika AI",
        status: "online",
        provider: "FastAPI",
        timestamp: new Date().toISOString(),
    };
}
async function calculateDropoutRisk(input) {
    try {
        const attendance = Number(input.attendanceRate);
        const average = Number(input.evaluationAverage);
        const missed = Number(input.missedActivities ?? 0);
        const completed = Number(input.activitiesCompleted ?? 0);
        let riskScore = 0;
        if (attendance < 50) {
            riskScore += 40;
        }
        else if (attendance < 70) {
            riskScore += 25;
        }
        else if (attendance < 85) {
            riskScore += 10;
        }
        if (average < 8) {
            riskScore += 30;
        }
        else if (average < 10) {
            riskScore += 20;
        }
        else if (average < 12) {
            riskScore += 10;
        }
        if (missed >= 5) {
            riskScore += 20;
        }
        else if (missed >= 3) {
            riskScore += 10;
        }
        if (completed === 0) {
            riskScore += 10;
        }
        riskScore = Math.min(100, Math.max(0, riskScore));
        let riskLevel;
        if (riskScore >= 60) {
            riskLevel = "HIGH";
        }
        else if (riskScore >= 30) {
            riskLevel = "MEDIUM";
        }
        else {
            riskLevel = "LOW";
        }
        return {
            riskScore,
            riskLevel,
            model: "MVP",
        };
    }
    catch (error) {
        logger_1.logger.error("Erreur calcul risque IA", error);
        throw new Error("AI_RISK_CALCULATION_ERROR");
    }
}
//# sourceMappingURL=ai.service.js.map