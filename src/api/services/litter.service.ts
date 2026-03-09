import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';

export class LitterService {
  async getById(id: string) {
    const litter = await prisma.litter.findUnique({
      where: { id },
      include: {
        sire: { select: { id: true, name: true, slug: true, sex: true } },
        dam:  { select: { id: true, name: true, slug: true, sex: true } },
        kennel: { select: { id: true, name: true, slug: true } },
        pups: { select: { id: true, name: true, slug: true, sex: true, color: true, profileImageUrl: true } },
      },
    });
    if (!litter) throw AppError.notFound('Litter not found');
    return litter;
  }

  async create(data: any, _user: JwtPayload) {
    const { sireId, damId, kennelId, whelpDate, numMales, numFemales, notes } = data;
    if (!sireId || !damId) throw AppError.badRequest('sireId and damId are required');
    const sire = await prisma.dog.findUnique({ where: { id: sireId } });
    const dam  = await prisma.dog.findUnique({ where: { id: damId } });
    if (!sire || sire.sex !== 'MALE')   throw AppError.badRequest('sireId must reference a male dog');
    if (!dam  || dam.sex  !== 'FEMALE') throw AppError.badRequest('damId must reference a female dog');
    const numTotal = (numMales ?? 0) + (numFemales ?? 0);
    return prisma.litter.create({
      data: { sireId, damId, kennelId, whelpDate: whelpDate ? new Date(whelpDate) : undefined, numMales: numMales ?? 0, numFemales: numFemales ?? 0, numTotal, notes, status: 'WHELPED' },
    });
  }

  async update(id: string, data: any, _user: JwtPayload) {
    await prisma.litter.findUniqueOrThrow({ where: { id } });
    return prisma.litter.update({ where: { id }, data });
  }

  async addPup(litterId: string, dogId: string) {
    await prisma.litter.findUniqueOrThrow({ where: { id: litterId } });
    await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    return prisma.dog.update({ where: { id: dogId }, data: { litterId } });
  }
}
