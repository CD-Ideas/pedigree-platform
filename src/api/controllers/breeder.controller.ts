import { Request, Response } from 'express';
import { asyncHandler } from '../../lib/errors';
import { BreederService } from '../services/breeder.service';

const svc = new BreederService();

export class BreederController {
  list = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.list(req.query) });
  });
  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getBySlug(req.params.slug) });
  });
  getDogs = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getDogs(req.params.id) });
  });
  getLitters = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getLitters(req.params.id) });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await svc.create(req.body, req.user!) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.update(req.params.id, req.body, req.user!) });
  });
}
