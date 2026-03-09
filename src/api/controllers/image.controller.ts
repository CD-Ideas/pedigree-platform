import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../lib/errors';
import { ImageService } from '../services/image.service';

const svc = new ImageService();

export class ImageController {
  presign = asyncHandler(async (req: Request, res: Response) => {
    const { filename, contentType, folder = 'dogs' } = req.body;
    if (!filename || !contentType) throw AppError.badRequest('filename and contentType required');
    if (!['dogs','kennels','breeders'].includes(folder)) throw AppError.badRequest('Invalid folder');
    res.json({ success: true, data: await svc.getPresignUrl(filename, contentType, folder) });
  });

  confirm = asyncHandler(async (req: Request, res: Response) => {
    const image = await svc.confirmUpload(req.params.dogId, req.body);
    res.status(201).json({ success: true, data: image });
  });

  setPrimary = asyncHandler(async (req: Request, res: Response) => {
    const image = await svc.setPrimary(req.params.imageId, req.user!.sub);
    res.json({ success: true, data: image });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await svc.remove(req.params.imageId, req.user!);
    res.status(204).send();
  });

  listForDog = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listForDog(req.params.dogId) });
  });
}
