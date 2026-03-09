import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { generateSlug } from '../../utils/slug';

const DOG_PUBLIC_SELECT = {
  id: true, regNumber: true, name: true, slug: true, callName: true,
  breed: true, sex: true, dob: true, dod: true, color: true,
  weightLbs: true, weightKg: true, titles: true, country: true, about: true,
  profileImageUrl: true, coi4gen: true, coi6gen: true, coi10gen: true,
  sireId: true, damId: true,
  sire: { select: { id: true, name: true, slug: true, regNumber: true } },
  dam:  { select: { id: true, name: true, slug: true, regNumber: true } },
  ownerBreeder: { select: { id: true, displayName: true, slug: true } },
  ownerKennel:  { select: { id: true, name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1 },
  createdAt: true,
} satisfies Prisma.DogSelect;

export class DogService {
  async search(params: { q?: string; breed?: string; sex?: string; country?: string; page: number; limit: number; publicOnly: boolean }) {
    const { q, breed, sex, country, page, limit, publicOnly } = params;
    const where: Prisma.DogWhereInput = {
      ...(publicOnly && { isPublic: true, isApproved: true }),
      ...(breed && { breed: { contains: breed, mode: 'insensitive' } }),
      ...(sex   && { sex: sex as any }),
      ...(country && { country }),
      ...(q && { OR: [
        { name:      { contains: q, mode: 'insensitive' } },
        { callName:  { contains: q, mode: 'insensitive' } },
        { regNumber: { contains: q, mode: 'insensitive' } },
      ]}),
    };
    const [data, total] = await Promise.all([
      prisma.dog.findMany({ where, select: DOG_PUBLIC_SELECT, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dog.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getBySlug(slug: string, user?: JwtPayload) {
    const dog = await prisma.dog.findUnique({
      where: { slug },
      select: { ...DOG_PUBLIC_SELECT,
        registrations: { where: { status: 'APPROVED' }, select: { id: true, registryName: true, regNumber: true, regDate: true } },
      },
    });
    if (!dog) throw AppError.notFound('Dog not found');
    if (!dog.isPublic && !user) throw AppError.forbidden('This profile is private');
    return dog;
  }

  async getById(id: string) {
    return prisma.dog.findUnique({ where: { id }, select: DOG_PUBLIC_SELECT });
  }

  async getOffspring(dogId: string) {
    return prisma.dog.findMany({
      where: { OR: [{ sireId: dogId }, { damId: dogId }] },
      select: { id: true, name: true, slug: true, sex: true, dob: true, profileImageUrl: true },
      orderBy: { dob: 'desc' },
    });
  }

  async getLitters(dogId: string) {
    return prisma.litter.findMany({
      where: { OR: [{ sireId: dogId }, { damId: dogId }] },
      include: {
        sire: { select: { id: true, name: true, slug: true } },
        dam:  { select: { id: true, name: true, slug: true } },
        pups: { select: { id: true, name: true, slug: true, sex: true, profileImageUrl: true } },
      },
      orderBy: { whelpDate: 'desc' },
    });
  }

  async getHealthRecords(dogId: string, publicOnly: boolean) {
    return prisma.healthRecord.findMany({
      where: { dogId, ...(publicOnly && { isPublic: true }) },
      orderBy: { testedDate: 'desc' },
    });
  }

  async create(data: any, user: JwtPayload) {
    const slug = await generateSlug(data.name, 'dog');
    return prisma.dog.create({ data: { ...data, slug, isApproved: user.role === 'ADMIN' } });
  }

  async update(dogId: string, data: any, user: JwtPayload) {
    await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    if (user.role !== 'ADMIN') throw AppError.forbidden('Only admins can update dogs at this time');
    return prisma.dog.update({ where: { id: dogId }, data });
  }

  async remove(dogId: string, user: JwtPayload) {
    await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    if (user.role !== 'ADMIN') throw AppError.forbidden('Only admins can delete dogs');
    await prisma.dog.delete({ where: { id: dogId } });
  }

  async approve(dogId: string) {
    return prisma.dog.update({ where: { id: dogId }, data: { isApproved: true } });
  }
}
