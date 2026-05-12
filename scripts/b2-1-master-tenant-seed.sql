-- Phase 0 Track B2.1 — Seed the master DB Tenant row.
--
-- WHY: docs/PHASE0_TRACK_B2_BRIEF.md decision 3 (also create the matching
-- Tenant row in master DB during the migration). The seed tenant becomes
-- the single source of truth for tenant identity in the master DB.
--
-- HOW TO APPLY:
--   sqlite3 prisma/master.db < scripts/b2-1-master-tenant-seed.sql
--
-- (or run the equivalent INSERT against the master Postgres if the master
-- DB has been migrated off SQLite.)

INSERT OR IGNORE INTO tenants (
  id, name, slug, dbUrl, plan, maxUsers, isActive, createdAt, updatedAt
) VALUES (
  'tenant_pharmacorp_eg',
  'PharmaCorp Egypt',
  'pharmacorp-eg',
  '',                     -- single-DB Phase-0 model; per-tenant URL is unused
  'ENTERPRISE',
  100,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
