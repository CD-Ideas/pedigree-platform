import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { KennelService } from '../services/kennel.service';

const svc = new KennelService();

export class KennelController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await svc.list() });
  });
  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getBySlug(req.params.slug) });
  });
  getDogs = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getDogs(req.params.id) });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await svc.create(req.body, req.user!) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.update(req.params.id, req.body, req.user!) });
  });
  addMember = asyncHandler(async (req: Request, res: Response) => {
    const { breederId, role = 'MEMBER' } = req.body;
    if (!breederId) throw AppError.badRequest('breederId required');
    res.json({ success: true, data: await svc.addMember(req.params.id, breederId, role) });
  });
  removeMember = asyncHandler(async (req: Request, res: Response) => {
    await svc.removeMember(req.params.id, req.params.breederId);
    res.status(204).send();
  });
}
