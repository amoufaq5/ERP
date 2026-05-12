-- Phase 0 Track B2.1 — Add User.tenantId + replace email uniqueness.
--
-- WHY: docs/PHASE0_TRACK_B2_BRIEF.md
--
-- HOW TO APPLY:
--   1. Make sure prisma/schema.prisma matches the change in commit
--      that introduced this file (User now has tenantId + composite
--      unique on (tenantId, email)).
--   2. Generate the Prisma migration skeleton WITHOUT applying it:
--        npx prisma migrate dev --create-only \
--          --name add_user_tenantid_and_composite_unique
--   3. Open the generated `prisma/migrations/<ts>_*/migration.sql`.
--      Splice the BACKFILL block below in between the
--      `ALTER TABLE ... ADD COLUMN "tenantId" TEXT` statement and any
--      subsequent statements that require the column to be NOT NULL.
--   4. Apply: `npx prisma migrate dev`.
--   5. After the User column is in place, optionally insert the matching
--      Tenant row in the MASTER DB (per B2 decision 3):
--        sqlite3 prisma/master.db < scripts/b2-1-master-tenant-seed.sql
--      (or run the equivalent INSERT against the master Postgres if the
--      master DB has been migrated off SQLite.)
--
-- ROLLBACK: drop the column + restore the original constraint.
--   ALTER TABLE "users" DROP COLUMN "tenantId";
--   DROP INDEX IF EXISTS "users_tenantId_email_key";
--   DROP INDEX IF EXISTS "users_tenantId_idx";
--   CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ─── BACKFILL block (splice into Prisma's generated migration) ─────────────

-- 1. Add column as nullable so the ALTER doesn't fail on existing rows.
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;

-- 2. Backfill to the seed tenant. Phase-0 ERP has exactly one tenant in
--    seeded data; multi-tenant rollout is a Phase 1 kernel concern.
UPDATE "users"
   SET "tenantId" = 'tenant_pharmacorp_eg'
 WHERE "tenantId" IS NULL;

-- 3. Lock down.
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- 4. Replace the single-column email unique with the tenant-scoped composite.
--    Two tenants must be able to share an email; the master schema's
--    TenantUser already enforces this shape via @@unique([tenantId, email]).
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
