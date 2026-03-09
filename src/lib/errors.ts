import { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string, code = 'BAD_REQUEST')       { return new AppError(msg, 400, code); }
  static unauthorized(msg = 'Unauthorized', code = 'UNAUTHORIZED') { return new AppError(msg, 401, code); }
  static forbidden(msg = 'Forbidden', code = 'FORBIDDEN')    { return new AppError(msg, 403, code); }
  static notFound(msg = 'Not found', code = 'NOT_FOUND')     { return new AppError(msg, 404, code); }
  static conflict(msg: string, code = 'CONFLICT')            { return new AppError(msg, 409, code); }
}

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
