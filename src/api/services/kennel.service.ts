import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { generateSlug } from '../../utils/slug';

export class KennelService {
  async list() {
    return prisma.kennel.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, slug: true, country: true, logoUrl: true, isVerified: true },
      take: 50,
    });
  }

  async getBySlug(slug: string) {
    const k = await prisma.kennel.findUnique({
      where: { slug },
      include: {
        members: { include: { breeder: { select: { id: true, displayName: true, slug: true, avatarUrl: true } } } },
      },
    });
    if (!k) throw AppError.notFound('Kennel not found');
    return k;
  }

  async getDogs(kennelId: string) {
    return prisma.dog.findMany({
      where: { ownerKennelId: kennelId, isPublic: true },
      select: { id: true, name: true, slug: true, sex: true, breed: true, dob: true, profileImageUrl: true },
    });
  }

  async create(data: any, user: JwtPayload) {
    const slug = await generateSlug(data.name, 'kennel');
    const breeder = await prisma.breeder.findUnique({ where: { userId: user.sub } });
    const kennel = await prisma.kennel.create({ data: { ...data, slug } });
    if (breeder) {
      await prisma.kennelMember.create({ data: { kennelId: kennel.id, breederId: breeder.id, role: 'OWNER' } });
    }
    return kennel;
  }

  async update(id: string, data: any, user: JwtPayload) {
    if (user.role !== 'ADMIN') {
      const breeder = await prisma.breeder.findUnique({ where: { userId: user.sub } });
      if (!breeder) throw AppError.forbidden();
      const member = await prisma.kennelMember.findUnique({ where: { kennelId_breederId: { kennelId: id, breederId: breeder.id } } });
      if (!member || !['OWNER', 'CO_OWNER'].includes(member.role)) throw AppError.forbidden();
    }
    return prisma.kennel.update({ where: { id }, data });
  }

  async addMember(kennelId: string, breederId: string, role: string) {
    return prisma.kennelMember.create({ data: { kennelId, breederId, role } });
  }

  async removeMember(kennelId: string, breederId: string) {
    await prisma.kennelMember.delete({ where: { kennelId_breederId: { kennelId, breederId } } });
  }
}
