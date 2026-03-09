import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { LitterService } from '../services/litter.service';

const svc = new LitterService();

export class LitterController {
  get = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getById(req.params.id) });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await svc.create(req.body, req.user!) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.update(req.params.id, req.body, req.user!) });
  });
  addPup = asyncHandler(async (req: Request, res: Response) => {
    const { dogId } = req.body;
    if (!dogId) throw AppError.badRequest('dogId required');
    res.json({ success: true, data: await svc.addPup(req.params.id, dogId) });
  });
}
