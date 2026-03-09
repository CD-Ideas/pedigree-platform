import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const registrationRouter = Router();
const ctrl = new RegistrationController();

registrationRouter.post('/',               authenticate,                       ctrl.submit);
registrationRouter.get('/pending',         authenticate, requireRole('ADMIN'), ctrl.listPending);
registrationRouter.post('/:id/approve',    authenticate, requireRole('ADMIN'), ctrl.approve);
registrationRouter.post('/:id/reject',     authenticate, requireRole('ADMIN'), ctrl.reject);
registrationRouter.get('/upload-url',      authenticate,                       ctrl.getUploadUrl);
