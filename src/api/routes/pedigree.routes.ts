import { Router } from 'express';
import { PedigreeController } from '../controllers/pedigree.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const pedigreeRouter = Router();
const ctrl = new PedigreeController();

pedigreeRouter.get('/:dogId',            optionalAuth, ctrl.getTree);
pedigreeRouter.get('/:dogId/ancestors',  optionalAuth, ctrl.getAncestors);
pedigreeRouter.get('/:dogId/coi',        optionalAuth, ctrl.getCoi);
pedigreeRouter.post('/hypothetical',     authenticate, ctrl.hypothetical);
pedigreeRouter.post('/:dogId/rebuild',   authenticate, ctrl.rebuild);
