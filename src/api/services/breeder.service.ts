import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { generateSlug } from '../../utils/slug';

export class BreederService {
  async list(query: any) {
    return prisma.breeder.findMany({
      where: { isPublic: true },
      select: { id: true, displayName: true, slug: true, country: true, avatarUrl: true, isVerified: true },
      take: 50,
    });
  }

  async getBySlug(slug: string) {
    const b = await prisma.breeder.findUnique({
      where: { slug },
      include: {
        kennelMemberships: { include: { kennel: { select: { id: true, name: true, slug: true, logoUrl: true } } } },
      },
    });
    if (!b) throw AppError.notFound('Breeder not found');
    return b;
  }

  async getDogs(breederId: string) {
    return prisma.dog.findMany({
      where: { ownerBreederId: breederId, isPublic: true },
      select: { id: true, name: true, slug: true, sex: true, breed: true, dob: true, profileImageUrl: true },
    });
  }

  async getLitters(breederId: string) {
    return prisma.litter.findMany({
      where: { kennel: { members: { some: { breederId } } } },
      include: {
        sire: { select: { id: true, name: true, slug: true } },
        dam:  { select: { id: true, name: true, slug: true } },
        pups: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { whelpDate: 'desc' },
    });
  }

  async create(data: any, user: JwtPayload) {
    if (await prisma.breeder.findUnique({ where: { userId: user.sub } })) {
      throw AppError.conflict('Breeder profile already exists');
    }
    const slug = await generateSlug(data.displayName, 'breeder');
    return prisma.breeder.create({ data: { ...data, userId: user.sub, slug } });
  }

  async update(id: string, data: any, user: JwtPayload) {
    const b = await prisma.breeder.findUniqueOrThrow({ where: { id } });
    if (b.userId !== user.sub && user.role !== 'ADMIN') throw AppError.forbidden();
    return prisma.breeder.update({ where: { id }, data });
  }
}
