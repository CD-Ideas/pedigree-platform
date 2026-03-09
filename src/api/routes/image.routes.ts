import { Router } from 'express';
import { ImageController } from '../controllers/image.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { uploadRateLimiter } from '../middleware/rateLimiter';

export const imageRouter = Router();
const ctrl = new ImageController();

imageRouter.get('/dogs/:dogId',              optionalAuth,                        ctrl.listForDog);
imageRouter.post('/presign',                 authenticate, uploadRateLimiter,     ctrl.presign);
imageRouter.post('/dogs/:dogId/confirm',     authenticate,                        ctrl.confirm);
imageRouter.patch('/:imageId/primary',       authenticate,                        ctrl.setPrimary);
imageRouter.delete('/:imageId',              authenticate,                        ctrl.remove);
