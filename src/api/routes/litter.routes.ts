import { Router } from 'express';
import { LitterController } from '../controllers/litter.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const litterRouter = Router();
const ctrl = new LitterController();

litterRouter.get('/:id',        optionalAuth, ctrl.get);
litterRouter.post('/',          authenticate, ctrl.create);
litterRouter.put('/:id',        authenticate, ctrl.update);
litterRouter.post('/:id/pups',  authenticate, ctrl.addPup);
