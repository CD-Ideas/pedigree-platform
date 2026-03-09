import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();
const ctrl = new AuthController();

authRouter.post('/register', authRateLimiter, ctrl.register);
authRouter.post('/login',    authRateLimiter, ctrl.login);
authRouter.post('/refresh',  authRateLimiter, ctrl.refresh);
authRouter.post('/logout',   authenticate,    ctrl.logout);
authRouter.get('/me',        authenticate,    ctrl.me);
