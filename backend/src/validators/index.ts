export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isRequired(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim().length > 0
  );
}

export function isPositiveInteger(value: unknown): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function isValidDate(value: unknown): boolean {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(String(value)).getTime());
}