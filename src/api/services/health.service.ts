import { HealthTestResult } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { getPresignedUploadUrl } from '../../lib/s3';

export class HealthService {
  async listForDog(dogId: string, publicOnly: boolean) {
    return prisma.healthRecord.findMany({
      where: { dogId, ...(publicOnly && { isPublic: true }) },
      orderBy: { testedDate: 'desc' },
    });
  }

  async create(data: any, _user: JwtPayload) {
    const { dogId, testType, result, resultDetail, testedDate, labName, certNumber, s3Key, certificateUrl } = data;
    if (!dogId || !testType || !result) throw AppError.badRequest('dogId, testType, and result are required');
    if (!Object.values(HealthTestResult).includes(result)) throw AppError.badRequest(`result must be one of: ${Object.values(HealthTestResult).join(', ')}`);
    await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    return prisma.healthRecord.create({
      data: { dogId, testType, result, resultDetail, testedDate: testedDate ? new Date(testedDate) : undefined, labName, certNumber, s3Key, certificateUrl },
    });
  }

  async remove(id: string, _user: JwtPayload) {
    await prisma.healthRecord.findUniqueOrThrow({ where: { id } });
    await prisma.healthRecord.delete({ where: { id } });
  }

  async getUploadUrl(filename: string, contentType: string) {
    return getPresignedUploadUrl('health', filename, contentType);
  }
}
