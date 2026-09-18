export function parseId(value: string | number): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identifiant invalide");
  }

  return id;
}

export function parseOptionalId(
  value: string | number | undefined | null,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identifiant invalide");
  }

  return id;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = value.trim();

  return text.length > 0 ? text : null;
}

export function toDate(
  value?: string | Date | null,
): Date | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Date invalide");
  }

  return date;
}

export function successResponse<T>(
  data: T,
  message = "Opération réussie",
) {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(
  message: string,
  details?: unknown,
) {
  return {
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
  };
}