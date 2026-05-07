# Database Migration Guide

## Prerequisites

Install PostgreSQL 15+ locally or use Docker:

```bash
docker run --name pharma-pg -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=pharma_erp -p 5432:5432 -d postgres:16-alpine
```

## Setup Steps

1. **Copy environment file** and set your database URL:

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
```

2. **Generate Prisma Client** (types for your code):

```bash
npx prisma generate
```

3. **Run migrations** to create/update tables:

```bash
npx prisma migrate dev --name init
```

4. **Seed the database** with demo data:

```bash
npx prisma db seed
```

5. **Inspect the database** with Prisma Studio:

```bash
npx prisma studio
```

## Common Commands

| Command | Description |
|---|---|
| `npx prisma migrate dev` | Create & apply a new migration |
| `npx prisma migrate deploy` | Apply pending migrations (CI/production) |
| `npx prisma db push` | Push schema changes without migrations (dev only) |
| `npx prisma db seed` | Run the seed script |
| `npx prisma studio` | Open visual database browser |
| `npx prisma validate` | Check schema for errors |
| `npx prisma format` | Auto-format the schema file |

## Migration from Zustand to Prisma

The app currently uses an in-memory Zustand store with localStorage persistence
(`src/lib/data-store.tsx`). To switch to Prisma:

1. **Phase 1 -- Server Actions**: Create Next.js server actions in
   `src/app/actions/` that call the repository layer (`src/lib/db/repositories/`).
   Each action maps to a Zustand action (add, update, delete).

2. **Phase 2 -- Read Path**: Replace `useDataStore()` selectors in page
   components with server-side data fetching (RSC) or `useQuery` calls that hit
   API routes backed by repositories.

3. **Phase 3 -- Write Path**: Replace `useDataStore().addDoctor(...)` style
   mutations with server action calls (`addDoctorAction(...)`). Use
   `revalidatePath` or `router.refresh()` to update the UI.

4. **Phase 4 -- Remove Zustand**: Once all reads and writes go through Prisma,
   remove the Zustand store and localStorage sync code.

Each phase can be done per-module (Doctors first, then Visits, then Plans, etc.)
so the migration is incremental and testable.

## Production Checklist

- [ ] Set `DATABASE_URL` to a managed PostgreSQL (e.g., Neon, Supabase, RDS)
- [ ] Run `npx prisma migrate deploy` in CI/CD pipeline
- [ ] Set `NEXTAUTH_SECRET` to a strong random value
- [ ] Enable connection pooling (PgBouncer or built-in)
- [ ] Set up automated database backups
