import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { PedigreeService } from '../services/pedigree.service';

const svc = new PedigreeService();

export class PedigreeController {
  getTree = asyncHandler(async (req: Request, res: Response) => {
    const generations = Math.min(parseInt(req.query.generations as string || '4', 10), 10);
    const data = await svc.getTree(req.params.dogId, generations);
    res.json({ success: true, data });
  });

  getAncestors = asyncHandler(async (req: Request, res: Response) => {
    const generations = Math.min(parseInt(req.query.generations as string || '10', 10), 10);
    const data = await svc.getAncestors(req.params.dogId, generations);
    res.json({ success: true, data });
  });

  getCoi = asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getCoi(req.params.dogId);
    res.json({ success: true, data });
  });

  hypothetical = asyncHandler(async (req: Request, res: Response) => {
    const { sireId, damId, generations = 6 } = req.body;
    if (!sireId || !damId) throw AppError.badRequest('sireId and damId required');
    const coi = await svc.hypotheticalCoi(sireId, damId, Math.min(generations, 10));
    res.json({ success: true, data: { sireId, damId, generations, ...coi } });
  });

  rebuild = asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.queueRebuild(req.params.dogId, req.user!);
    res.json({ success: true, data: result });
  });
}
