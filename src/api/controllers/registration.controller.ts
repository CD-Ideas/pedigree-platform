import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { RegistrationService } from '../services/registration.service';

const svc = new RegistrationService();

export class RegistrationController {
  submit = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await svc.submit(req.body, req.user!) });
  });
  listPending = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listPending() });
  });
  approve = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.approve(req.params.id, req.user!.sub) });
  });
  reject = asyncHandler(async (req: Request, res: Response) => {
    const { rejectionNote } = req.body;
    if (!rejectionNote) throw AppError.badRequest('rejectionNote required');
    res.json({ success: true, data: await svc.reject(req.params.id, req.user!.sub, rejectionNote) });
  });
  getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const { filename, contentType } = req.query;
    if (!filename || !contentType) throw AppError.badRequest('filename and contentType required');
    res.json({ success: true, data: await svc.getUploadUrl(filename as string, contentType as string) });
  });
}
