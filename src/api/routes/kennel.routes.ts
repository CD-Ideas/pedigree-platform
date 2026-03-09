import { Router } from 'express';
import { KennelController } from '../controllers/kennel.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const kennelRouter = Router();
const ctrl = new KennelController();

kennelRouter.get('/',                                    optionalAuth, ctrl.list);
kennelRouter.get('/:slug',                               optionalAuth, ctrl.getBySlug);
kennelRouter.get('/:id/dogs',                            optionalAuth, ctrl.getDogs);
kennelRouter.post('/',                                   authenticate, ctrl.create);
kennelRouter.put('/:id',                                 authenticate, ctrl.update);
kennelRouter.post('/:id/members',                        authenticate, ctrl.addMember);
kennelRouter.delete('/:id/members/:breederId',           authenticate, ctrl.removeMember);
