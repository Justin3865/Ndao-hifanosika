import {
  NextFunction,
  Request,
  Response,
} from "express";

import { logger } from "../config/logger";

export function errorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error(
    error instanceof Error
      ? error.message
      : String(error),
  );

  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode =
    typeof error?.statusCode === "number"
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "Une erreur interne est survenue",
    ...(process.env.NODE_ENV === "development"
      ? {
          error:
            error instanceof Error
              ? error.stack
              : error,
        }
      : {}),
  });
}