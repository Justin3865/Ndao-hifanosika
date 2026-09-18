const getTimestamp = (): string => {
  return new Date().toISOString();
};

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(
      `[${getTimestamp()}] [INFO] ${message}`,
      ...args,
    );
  },

  success(message: string, ...args: unknown[]): void {
    console.log(
      `[${getTimestamp()}] [SUCCESS] ${message}`,
      ...args,
    );
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(
      `[${getTimestamp()}] [WARN] ${message}`,
      ...args,
    );
  },

  error(message: string, ...args: unknown[]): void {
    console.error(
      `[${getTimestamp()}] [ERROR] ${message}`,
      ...args,
    );
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[${getTimestamp()}] [DEBUG] ${message}`,
        ...args,
      );
    }
  },
};