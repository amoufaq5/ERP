#!/usr/bin/env tsx
// Generates Postgres RLS migration SQL from prisma/schema.prisma.
//
// Reads every model with a `tenantId` column, excludes anything in
// SHARED_LOOKUP_MODELS or TENANT_SCHEMA_DEBT (imported from
// src/lib/api/tenant-augment.ts so app-layer and DB-layer enforcement
// stay in sync), and writes two SQL files:
//
//   scripts/generated/rls-enable.sql   — splice into a Prisma migration
//   scripts/generated/rls-disable.sql  — rollback companion
//
// Output is deterministic (sorted by table name) so re-running on the
// same schema produces byte-identical files. CI can re-run this and
// fail if the committed output drifts.
//
// Usage:
//   npx tsx scripts/generate-rls-migration.ts
//
// Cross-references:
//   docs/PHASE0_TRACK_B2_BRIEF.md — B2.3 spec
//   amoufaq5/CrossEngin/docs/adr/0002-multi-tenancy-model.md
//   amoufaq5/CrossEngin/docs/adr/0017-observability-and-slos.md

import * as fs from "node:fs";
import * as path from "node:path";
import {
  SHARED_LOOKUP_MODELS,
  TENANT_SCHEMA_DEBT,
} from "../src/lib/api/tenant-augment";

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");
const OUT_DIR = path.join(__dirname, "generated");
const ENABLE_PATH = path.join(OUT_DIR, "rls-enable.sql");
const DISABLE_PATH = path.join(OUT_DIR, "rls-disable.sql");

interface ScopedModel {
  model: string;
  table: string;
}

/**
 * Parses schema.prisma and returns every model that has a `tenantId`
 * scalar field. Each entry carries the SQL table name (from `@@map(...)`
 * if present, else the model name).
 *
 * The parser is intentionally simple: it tracks brace nesting and the
 * presence of a `tenantId` field on the top-level fields of each model.
 */
export function findTenantScopedModels(schemaSource: string): ScopedModel[] {
  const lines = schemaSource.split("\n");
  const results: ScopedModel[] = [];

  let inModel = false;
  let model = "";
  let table = "";
  let hasTenant = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (!inModel) {
      const m = line.match(/^model\s+(\w+)\s*\{/);
      if (m) {
        inModel = true;
        model = m[1];
        table = "";
        hasTenant = false;
      }
      continue;
    }

    if (line === "}") {
      if (hasTenant) {
        results.push({ model, table: table || model });
      }
      inModel = false;
      continue;
    }

    if (/^tenantId\s/.test(line)) {
      hasTenant = true;
      continue;
    }

    const mapMatch = line.match(/^@@map\("([^"]+)"\)/);
    if (mapMatch) {
      table = mapMatch[1];
    }
  }

  return results;
}

function filterEnforceable(models: ScopedModel[]): ScopedModel[] {
  return models.filter(
    (m) =>
      !SHARED_LOOKUP_MODELS.has(m.model) && !TENANT_SCHEMA_DEBT.has(m.model),
  );
}

function emitEnableSql(models: ScopedModel[]): string {
  const banner = [
    "-- AUTO-GENERATED. DO NOT EDIT BY HAND.",
    "-- Source: prisma/schema.prisma",
    "-- Generator: scripts/generate-rls-migration.ts",
    "--",
    "-- Phase 0 Track B2.3 — Postgres Row-Level Security policies.",
    "-- Layer-2 defense-in-depth (Layer 1 is the Prisma extension in",
    "-- src/lib/api/with-tenant.ts).",
    "--",
    "-- HOW TO APPLY:",
    "--   npx prisma migrate dev --create-only --name enable_tenant_rls",
    "--   # then splice the body of this file into the generated migration.sql",
    "--   npx prisma migrate dev",
    "--",
    "-- The Prisma extension sets `app.current_tenant_id` per request via",
    "-- SET LOCAL (wired in Track B2.4). Outside that wrapper the session",
    "-- variable is unset and every SELECT/UPDATE/DELETE returns zero rows —",
    "-- fail-closed.",
    "--",
    "-- Migration / superuser roles bypass RLS (no FORCE). This keeps",
    "-- prisma migrate, prisma db seed, and ops runbooks working.",
    "",
  ].join("\n");

  const stmts = models
    .map(
      ({ table }) =>
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;\n` +
        `CREATE POLICY tenant_isolation ON "${table}"\n` +
        `  USING ("tenantId" = current_setting('app.current_tenant_id', true));`,
    )
    .join("\n\n");

  return banner + "\n" + stmts + "\n";
}

function emitDisableSql(models: ScopedModel[]): string {
  const banner = [
    "-- AUTO-GENERATED. DO NOT EDIT BY HAND.",
    "-- Rollback companion to rls-enable.sql.",
    "",
  ].join("\n");

  const stmts = models
    .map(
      ({ table }) =>
        `DROP POLICY IF EXISTS tenant_isolation ON "${table}";\n` +
        `ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`,
    )
    .join("\n\n");

  return banner + "\n" + stmts + "\n";
}

function main() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const all = findTenantScopedModels(schema);
  const enforceable = filterEnforceable(all).sort((a, b) =>
    a.table.localeCompare(b.table),
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(ENABLE_PATH, emitEnableSql(enforceable));
  fs.writeFileSync(DISABLE_PATH, emitDisableSql(enforceable));

  const skipped = all.length - enforceable.length;
  console.log(
    `Wrote RLS migration for ${enforceable.length} tenant-scoped tables.`,
  );
  if (skipped > 0) {
    console.log(
      `  Skipped ${skipped} (in SHARED_LOOKUP_MODELS or TENANT_SCHEMA_DEBT).`,
    );
  }
  console.log(`  Enable:  ${path.relative(process.cwd(), ENABLE_PATH)}`);
  console.log(`  Disable: ${path.relative(process.cwd(), DISABLE_PATH)}`);
}

if (require.main === module) {
  main();
}
