import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { AuthService } from '../services/auth.service';

const svc = new AuthService();

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.register(req.body);
    res.status(201).json({ success: true, data: result });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) throw AppError.badRequest('Email and password required');
    const result = await svc.login(email, password);
    res.json({ success: true, data: result });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw AppError.badRequest('refreshToken required');
    const result = await svc.refreshTokens(refreshToken);
    res.json({ success: true, data: result });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    await svc.logout(req.body.refreshToken);
    res.json({ success: true });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await svc.getMe(req.user!.sub);
    res.json({ success: true, data: user });
  });
}
