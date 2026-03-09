import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const healthRouter = Router();
const ctrl = new HealthController();

healthRouter.get('/dogs/:dogId',   optionalAuth, ctrl.listForDog);
healthRouter.post('/',             authenticate, ctrl.create);
healthRouter.delete('/:id',        authenticate, ctrl.remove);
healthRouter.post('/upload-url',   authenticate, ctrl.getUploadUrl);
