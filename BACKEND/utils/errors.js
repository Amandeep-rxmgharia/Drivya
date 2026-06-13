/**
 * Application error with HTTP status for consistent error handling.
 */
export class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function notFound(message = "Resource not found.") {
  return new AppError(message, 404, "NOT_FOUND");
}

export function forbidden(message = "Access denied.") {
  return new AppError(message, 403, "FORBIDDEN");
}

export function badRequest(message = "Invalid request.") {
  return new AppError(message, 400, "BAD_REQUEST");
}

export function conflict(message = "Resource conflict.") {
  return new AppError(message, 409, "CONFLICT");
}

export function gone(message = "Resource is no longer available.") {
  return new AppError(message, 410, "GONE");
}
