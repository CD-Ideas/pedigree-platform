import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { getPresignedUploadUrl } from '../../lib/s3';

export class RegistrationService {
  async submit(data: any, user: JwtPayload) {
    const { dogId, registryName, regNumber, regDate, s3Key, documentUrl } = data;
    if (!dogId || !registryName || !regNumber) throw AppError.badRequest('dogId, registryName, and regNumber are required');
    const breeder = await prisma.breeder.findUnique({ where: { userId: user.sub } });
    return prisma.registration.create({
      data: { dogId, breederId: breeder?.id, registryName, regNumber, regDate: regDate ? new Date(regDate) : undefined, s3Key, documentUrl, status: 'PENDING' },
    });
  }

  async listPending() {
    return prisma.registration.findMany({
      where: { status: 'PENDING' },
      include: {
        dog:     { select: { id: true, name: true, slug: true } },
        breeder: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string, reviewerId: string) {
    const reg = await prisma.registration.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() },
    });
    // Sync reg number onto the dog
    await prisma.dog.update({ where: { id: reg.dogId }, data: { regNumber: reg.regNumber, isApproved: true } });
    return updated;
  }

  async reject(id: string, reviewerId: string, rejectionNote: string) {
    return prisma.registration.update({
      where: { id },
      data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionNote },
    });
  }

  async getUploadUrl(filename: string, contentType: string) {
    return getPresignedUploadUrl('registrations', filename, contentType);
  }
}
