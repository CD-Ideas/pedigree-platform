import { Router } from 'express';
import { BreederController } from '../controllers/breeder.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const breederRouter = Router();
const ctrl = new BreederController();

breederRouter.get('/',            optionalAuth, ctrl.list);
breederRouter.get('/:slug',       optionalAuth, ctrl.getBySlug);
breederRouter.get('/:id/dogs',    optionalAuth, ctrl.getDogs);
breederRouter.get('/:id/litters', optionalAuth, ctrl.getLitters);
breederRouter.post('/',           authenticate, ctrl.create);
breederRouter.put('/:id',         authenticate, ctrl.update);
