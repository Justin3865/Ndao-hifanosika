export declare function parseId(value: string | number): number;
export declare function parseOptionalId(value: string | number | undefined | null): number | undefined;
export declare function normalizeEmail(email: string): string;
export declare function normalizeText(value?: string | null): string | null;
export declare function toDate(value?: string | Date | null): Date | undefined;
export declare function successResponse<T>(data: T, message?: string): {
    success: boolean;
    message: string;
    data: T;
};
export declare function errorResponse(message: string, details?: unknown): {
    details?: {} | null | undefined;
    success: boolean;
    message: string;
};
//# sourceMappingURL=index.d.ts.map