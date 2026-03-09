import { PrismaClient, UserRole, Sex } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash: adminHash, role: UserRole.ADMIN, firstName: 'Platform', lastName: 'Admin', isEmailVerified: true },
  });

  const breederHash = await bcrypt.hash('Breeder1234!', 12);
  const breederUser = await prisma.user.upsert({
    where: { email: 'breeder@example.com' },
    update: {},
    create: { email: 'breeder@example.com', passwordHash: breederHash, role: UserRole.BREEDER, firstName: 'Demo', lastName: 'Breeder', isEmailVerified: true },
  });

  const breeder = await prisma.breeder.upsert({
    where: { userId: breederUser.id },
    update: {},
    create: { userId: breederUser.id, displayName: 'Demo Kennels', slug: 'demo-kennels', bio: 'Demo breeder.', country: 'US', isVerified: true },
  });

  const kennel = await prisma.kennel.upsert({
    where: { slug: 'demo-kennels-official' },
    update: {},
    create: { name: 'Demo Kennels Official', slug: 'demo-kennels-official', country: 'US', isVerified: true },
  });

  await prisma.kennelMember.upsert({
    where: { kennelId_breederId: { kennelId: kennel.id, breederId: breeder.id } },
    update: {},
    create: { kennelId: kennel.id, breederId: breeder.id, role: 'OWNER' },
  });

  const sire = await prisma.dog.upsert({
    where: { slug: 'demo-champion-sire' },
    update: {},
    create: { name: 'Demo Champion Sire', slug: 'demo-champion-sire', breed: 'American Pit Bull Terrier', sex: Sex.MALE, dob: new Date('2018-03-10'), color: 'Red Nose', titles: ['GRCH'], ownerBreederId: breeder.id, isPublic: true, isApproved: true },
  });

  const dam = await prisma.dog.upsert({
    where: { slug: 'demo-ruby-dam' },
    update: {},
    create: { name: 'Demo Ruby Dam', slug: 'demo-ruby-dam', breed: 'American Pit Bull Terrier', sex: Sex.FEMALE, dob: new Date('2019-07-22'), color: 'Brindle', titles: ['CH'], ownerBreederId: breeder.id, isPublic: true, isApproved: true },
  });

  const litter = await prisma.litter.create({
    data: { sireId: sire.id, damId: dam.id, kennelId: kennel.id, whelpDate: new Date('2021-05-01'), numMales: 3, numFemales: 2, numTotal: 5, status: 'REGISTERED' },
  });

  await prisma.dog.upsert({
    where: { slug: 'demo-offspring-one' },
    update: {},
    create: { name: 'Demo Offspring One', slug: 'demo-offspring-one', breed: 'American Pit Bull Terrier', sex: Sex.MALE, dob: new Date('2021-05-01'), color: 'Red Nose', sireId: sire.id, damId: dam.id, litterId: litter.id, ownerBreederId: breeder.id, isPublic: true, isApproved: true },
  });

  console.log('✅ Done!');
  console.log('  admin@example.com   / Admin1234!');
  console.log('  breeder@example.com / Breeder1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
