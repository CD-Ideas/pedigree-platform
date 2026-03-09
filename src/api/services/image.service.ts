import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { getPresignedUploadUrl, deleteS3Object } from '../../lib/s3';

export class ImageService {
  async getPresignUrl(filename: string, contentType: string, folder: 'dogs' | 'kennels' | 'breeders') {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(contentType)) throw AppError.badRequest('Unsupported image type');
    return getPresignedUploadUrl(folder, filename, contentType);
  }

  async confirmUpload(dogId: string, data: { s3Key: string; url: string; caption?: string; mimeType?: string; sizeBytes?: number; width?: number; height?: number }) {
    await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    return prisma.dogImage.create({
      data: { dogId, s3Key: data.s3Key, url: data.url, caption: data.caption, mimeType: data.mimeType, sizeBytes: data.sizeBytes, width: data.width, height: data.height, isPrimary: false },
    });
  }

  async setPrimary(imageId: string, userId: string) {
    const image = await prisma.dogImage.findUniqueOrThrow({ where: { id: imageId }, include: { dog: true } });
    // Unset current primary
    await prisma.dogImage.updateMany({ where: { dogId: image.dogId, isPrimary: true }, data: { isPrimary: false } });
    // Set new primary
    const updated = await prisma.dogImage.update({ where: { id: imageId }, data: { isPrimary: true } });
    // Update dog profile image
    await prisma.dog.update({ where: { id: image.dogId }, data: { profileImageUrl: image.url } });
    return updated;
  }

  async remove(imageId: string, user: JwtPayload) {
    const image = await prisma.dogImage.findUniqueOrThrow({ where: { id: imageId } });
    await deleteS3Object(image.s3Key);
    await prisma.dogImage.delete({ where: { id: imageId } });
  }

  async listForDog(dogId: string) {
    return prisma.dogImage.findMany({ where: { dogId }, orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }] });
  }
}
