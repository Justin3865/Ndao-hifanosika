"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidPassword = isValidPassword;
exports.isRequired = isRequired;
exports.isPositiveInteger = isPositiveInteger;
exports.isValidDate = isValidDate;
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPassword(password) {
    return password.length >= 6;
}
function isRequired(value) {
    return (value !== undefined &&
        value !== null &&
        String(value).trim().length > 0);
}
function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0;
}
function isValidDate(value) {
    if (!value) {
        return false;
    }
    return !Number.isNaN(new Date(String(value)).getTime());
}
//# sourceMappingURL=index.js.map