import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { DogService } from '../services/dog.service';
import { PedigreeService } from '../services/pedigree.service';

const svc  = new DogService();
const pSvc = new PedigreeService();

export class DogController {
  search = asyncHandler(async (req: Request, res: Response) => {
    const { q, breed, sex, country, page = '1', limit = '20' } = req.query;
    const result = await svc.search({
      q: q as string, breed: breed as string, sex: sex as string, country: country as string,
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 50),
      publicOnly: !req.user,
    });
    res.json({ success: true, ...result });
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const dog = await svc.getBySlug(req.params.slug, req.user);
    res.json({ success: true, data: dog });
  });

  getPedigree = asyncHandler(async (req: Request, res: Response) => {
    const generations = Math.min(parseInt(req.query.generations as string || '4', 10), 10);
    const data = await pSvc.getTree(req.params.id, generations);
    res.json({ success: true, data });
  });

  getOffspring = asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getOffspring(req.params.id);
    res.json({ success: true, data });
  });

  getLitters = asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getLitters(req.params.id);
    res.json({ success: true, data });
  });

  getHealth = asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getHealthRecords(req.params.id, !req.user);
    res.json({ success: true, data });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const dog = await svc.create(req.body, req.user!);
    res.status(201).json({ success: true, data: dog });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const dog = await svc.update(req.params.id, req.body, req.user!);
    res.json({ success: true, data: dog });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await svc.remove(req.params.id, req.user!);
    res.status(204).send();
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const dog = await svc.approve(req.params.id);
    res.json({ success: true, data: dog });
  });
}
