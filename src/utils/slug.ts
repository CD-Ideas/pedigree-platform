import { prisma } from '../lib/prisma';

export async function generateSlug(name: string, table: 'dog' | 'breeder' | 'kennel'): Promise<string> {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);

  let slug = base;
  let n = 1;
  while (await slugExists(slug, table)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

async function slugExists(slug: string, table: string): Promise<boolean> {
  if (table === 'dog')     return !!(await prisma.dog.findUnique({ where: { slug } }));
  if (table === 'breeder') return !!(await prisma.breeder.findUnique({ where: { slug } }));
  if (table === 'kennel')  return !!(await prisma.kennel.findUnique({ where: { slug } }));
  return false;
}
