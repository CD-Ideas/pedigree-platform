import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from './errors';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL     || '15m';
const REFRESH_DAYS   = parseInt(process.env.JWT_REFRESH_TTL?.replace('d', '') || '30', 10);

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } as jwt.SignOptions);
}

export function signRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired token', 'TOKEN_INVALID');
  }
}

export function refreshTTLMs(): number {
  return REFRESH_DAYS * 24 * 60 * 60 * 1000;
}
