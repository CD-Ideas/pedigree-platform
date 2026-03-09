# Dog Pedigree Platform — Backend API

Node.js · Express · TypeScript · PostgreSQL · Prisma

---

## Quick Start

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL + JWT secrets
npx prisma generate         # generate Prisma client
npx prisma migrate deploy   # run SQL migrations (or: npx prisma migrate dev)
npx tsx prisma/seed.ts      # optional: load demo data
npm run dev                 # → http://localhost:4000
```

Or exactly as requested:

```bash
npm install
npx prisma generate
npx tsx src/server.ts
```

---

## Project Structure

```
src/
├── server.ts                         Entry point
├── app.ts                            Express setup, all routes mounted
├── lib/
│   ├── prisma.ts                     Prisma singleton
│   ├── logger.ts                     Winston logger
│   ├── errors.ts                     AppError + asyncHandler
│   ├── jwt.ts                        JWT sign/verify/refresh
│   └── s3.ts                         S3 presigned URL helpers
├── utils/
│   └── slug.ts                       Unique slug generator
└── api/
    ├── middleware/
    │   ├── auth.ts                   JWT authenticate / requireRole / optionalAuth
    │   ├── rateLimiter.ts            Global, auth, upload rate limits
    │   └── errorHandler.ts          Global error + 404 handler
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── dog.routes.ts
    │   ├── breeder.routes.ts
    │   ├── kennel.routes.ts
    │   ├── litter.routes.ts
    │   ├── pedigree.routes.ts
    │   ├── registration.routes.ts
    │   ├── image.routes.ts
    │   └── health.routes.ts
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── dog.controller.ts
    │   ├── pedigree.controller.ts
    │   ├── breeder.controller.ts
    │   ├── kennel.controller.ts
    │   ├── litter.controller.ts
    │   ├── registration.controller.ts
    │   ├── image.controller.ts
    │   └── health.controller.ts
    └── services/
        ├── auth.service.ts           Register, login, JWT rotation
        ├── dog.service.ts            CRUD, search, pedigree, offspring
        ├── pedigree.service.ts       Tree builder + Wright's COI calculator
        ├── breeder.service.ts
        ├── kennel.service.ts
        ├── litter.service.ts
        ├── registration.service.ts
        ├── image.service.ts
        └── health.service.ts
prisma/
├── schema.prisma                     Prisma schema (10 models)
├── seed.ts                           Demo data
└── migrations/
    └── 0001_initial_schema.sql       Raw DDL with indexes + COI function
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | — | Register |
| POST | /api/v1/auth/login | — | Login → tokens |
| POST | /api/v1/auth/refresh | — | Rotate refresh token |
| GET | /api/v1/auth/me | ✓ | Current user |
| GET | /api/v1/dogs | — | Search dogs |
| GET | /api/v1/dogs/:slug | — | Dog profile |
| POST | /api/v1/dogs | ✓ | Register dog |
| PUT | /api/v1/dogs/:id | ✓ | Update dog |
| GET | /api/v1/dogs/:id/pedigree | — | Tree (1–10 gen) |
| GET | /api/v1/dogs/:id/offspring | — | Offspring |
| GET | /api/v1/dogs/:id/litters | — | Litters |
| GET | /api/v1/pedigree/:dogId | — | Full tree JSON |
| GET | /api/v1/pedigree/:dogId/coi | — | Cached COI values |
| POST | /api/v1/pedigree/hypothetical | ✓ | Sim breeding COI |
| POST | /api/v1/pedigree/:dogId/rebuild | ✓ | Rebuild cache |
| GET | /api/v1/breeders | — | List breeders |
| GET | /api/v1/breeders/:slug | — | Breeder profile |
| POST | /api/v1/breeders | ✓ | Create profile |
| GET | /api/v1/kennels/:slug | — | Kennel page |
| POST | /api/v1/kennels | ✓ | Create kennel |
| GET | /api/v1/litters/:id | — | Litter detail |
| POST | /api/v1/litters | ✓ | Create litter |
| POST | /api/v1/registrations | ✓ | Submit registration |
| POST | /api/v1/registrations/:id/approve | ADMIN | Approve |
| GET | /api/v1/images/dogs/:dogId | — | List dog images |
| POST | /api/v1/images/presign | ✓ | S3 upload URL |
| GET | /api/v1/health-records/dogs/:dogId | — | Health records |

---

## Seed Credentials

After running `npx tsx prisma/seed.ts`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin1234! |
| Breeder | breeder@example.com | Breeder1234! |
