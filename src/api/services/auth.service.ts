import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { signAccessToken, signRefreshToken, verifyAccessToken, refreshTTLMs, JwtPayload } from '../../lib/jwt';

export class AuthService {
  async register(body: { email: string; password: string; firstName?: string; lastName?: string }) {
    const { email, password, firstName, lastName } = body;
    if (!email || !password) throw AppError.badRequest('Email and password required');
    if (password.length < 8)  throw AppError.badRequest('Password must be at least 8 characters');
    if (await prisma.user.findUnique({ where: { email } })) throw AppError.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role: UserRole.PUBLIC },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });
    return { user, ...(await this._issueTokens(user.id, user.email, user.role)) };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw AppError.unauthorized('Invalid credentials');
    if (!await bcrypt.compare(password, user.passwordHash)) throw AppError.unauthorized('Invalid credentials');
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { user: { id: user.id, email: user.email, role: user.role }, ...(await this._issueTokens(user.id, user.email, user.role)) };
  }

  async refreshTokens(rawToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) throw AppError.unauthorized('Invalid refresh token', 'REFRESH_INVALID');
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    return this._issueTokens(user.id, user.email, user.role);
  }

  async logout(rawToken?: string) {
    if (!rawToken) return;
    await prisma.refreshToken.updateMany({ where: { token: rawToken }, data: { revokedAt: new Date() } });
  }

  async getMe(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isEmailVerified: true, createdAt: true,
        breeder: { select: { id: true, displayName: true, slug: true, avatarUrl: true } } },
    });
  }

  private async _issueTokens(userId: string, email: string, role: UserRole) {
    const accessToken  = signAccessToken({ sub: userId, email, role });
    const refreshToken = signRefreshToken();
    await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt: new Date(Date.now() + refreshTTLMs()) } });
    return { accessToken, refreshToken };
  }
}
