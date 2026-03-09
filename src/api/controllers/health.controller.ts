import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { HealthService } from '../services/health.service';

const svc = new HealthService();

export class HealthController {
  listForDog = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listForDog(req.params.dogId, !req.user) });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await svc.create(req.body, req.user!) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await svc.remove(req.params.id, req.user!);
    res.status(204).send();
  });

  getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) throw AppError.badRequest('filename and contentType required');
    res.json({ success: true, data: await svc.getUploadUrl(filename, contentType) });
  });
}
