"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiHealth = aiHealth;
exports.scoreDropoutRisk = scoreDropoutRisk;
const logger_1 = require("../config/logger");
async function aiHealth(req, res) {
    try {
        res.status(200).json({
            success: true,
            data: {
                service: "Ndao Hifanosika AI",
                status: "online",
                provider: "FastAPI",
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur AI health", error);
        res.status(500).json({
            success: false,
            message: "Service IA indisponible",
        });
    }
}
async function scoreDropoutRisk(req, res) {
    try {
        const { age, attendanceRate, evaluationAverage, activitiesCompleted, missedActivities, } = req.body;
        if (attendanceRate === undefined ||
            evaluationAverage === undefined) {
            res.status(400).json({
                success: false,
                message: "attendanceRate et evaluationAverage sont obligatoires",
            });
            return;
        }
        /*
         * Version MVP :
         * Le calcul définit simplement un score indicatif.
         *
         * Dans la version finale, cette fonction appellera
         * le service FastAPI /score/dropout-risk.
         */
        const attendance = Number(attendanceRate);
        const average = Number(evaluationAverage);
        const missed = Number(missedActivities ?? 0);
        const completed = Number(activitiesCompleted ?? 0);
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
        let level;
        if (riskScore >= 60) {
            level = "HIGH";
        }
        else if (riskScore >= 30) {
            level = "MEDIUM";
        }
        else {
            level = "LOW";
        }
        res.status(200).json({
            success: true,
            data: {
                age: age !== undefined ? Number(age) : null,
                attendanceRate: attendance,
                evaluationAverage: average,
                activitiesCompleted: completed,
                missedActivities: missed,
                riskScore,
                riskLevel: level,
                model: "MVP",
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur score risque abandon", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du calcul du risque d'abandon",
        });
    }
}
//# sourceMappingURL=ai.controller.js.map