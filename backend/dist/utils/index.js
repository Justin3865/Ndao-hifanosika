"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseId = parseId;
exports.parseOptionalId = parseOptionalId;
exports.normalizeEmail = normalizeEmail;
exports.normalizeText = normalizeText;
exports.toDate = toDate;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Identifiant invalide");
    }
    return id;
}
function parseOptionalId(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Identifiant invalide");
    }
    return id;
}
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function normalizeText(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const text = value.trim();
    return text.length > 0 ? text : null;
}
function toDate(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Date invalide");
    }
    return date;
}
function successResponse(data, message = "Opération réussie") {
    return {
        success: true,
        message,
        data,
    };
}
function errorResponse(message, details) {
    return {
        success: false,
        message,
        ...(details !== undefined ? { details } : {}),
    };
}
//# sourceMappingURL=index.js.map