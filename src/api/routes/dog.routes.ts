import { Router } from 'express';
import { DogController } from '../controllers/dog.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';

export const dogRouter = Router();
const ctrl = new DogController();

dogRouter.get('/',               optionalAuth,                              ctrl.search);
dogRouter.get('/:slug',          optionalAuth,                              ctrl.getBySlug);
dogRouter.get('/:id/pedigree',   optionalAuth,                              ctrl.getPedigree);
dogRouter.get('/:id/offspring',  optionalAuth,                              ctrl.getOffspring);
dogRouter.get('/:id/litters',    optionalAuth,                              ctrl.getLitters);
dogRouter.get('/:id/health',     optionalAuth,                              ctrl.getHealth);
dogRouter.post('/',              authenticate,                              ctrl.create);
dogRouter.put('/:id',            authenticate,                              ctrl.update);
dogRouter.delete('/:id',         authenticate,                              ctrl.remove);
dogRouter.post('/:id/approve',   authenticate, requireRole('ADMIN'),        ctrl.approve);
