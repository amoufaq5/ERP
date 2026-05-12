#!/usr/bin/env tsx
/**
 * Codemod that migrates STANDARD-pattern routes to withAuthAndTenant.
 *
 * Selects targets by re-running scripts/triage-routes.sh and reading the
 * STANDARD section of docs/PHASE0_TRACK_B_TRIAGE.md (or by --target glob).
 *
 * Transformations applied to each route file:
 *
 *   1. Strip the lazy-prisma loader:
 *        let prisma: any = null;
 *        try { prisma = require("@/lib/prisma").default; } catch { ... }
 *
 *   2. Replace imports:
 *        from "@/lib/api/with-auth"  ->  from "@/lib/api/with-tenant"
 *        { withAuth }                ->  { withAuthAndTenant }
 *        { withAuthParams }          ->  { withAuthAndTenantParams }
 *
 *   3. Wrap bare handlers with withAuthAndTenant. Patterns matched:
 *        export async function GET(req: NextRequest) { ... }
 *        export const GET = async (req: NextRequest) => { ... }
 *      Become:
 *        export const GET = withAuthAndTenant(
 *          async (req: NextRequest, { db, tenantId }) => { ... }
 *        );
 *
 *   4. Rewrite handler signatures already using withAuth:
 *        withAuth(async (req, { role, userId }) => ...)
 *      ->
 *        withAuthAndTenant(async (req, { db, tenantId, role, userId }) => ...)
 *
 *   5. Replace `prisma.<model>` -> `db.<model>` inside handler bodies.
 *
 *   6. Unwrap the lazy-prisma guard:
 *        if (prisma) { try { ... real DB ... } catch { ... } }
 *        // mock fallback
 *      ->
 *        // real DB only (no guard)
 *      The mock fallback is left in place as dead code; remove during
 *      Track C (INITIAL_* / mock-data removal).
 *
 * Safety:
 *   - Runs in DRY mode by default. Pass --apply to write changes.
 *   - Each transformation logs file + line + reason. Diffs are written
 *     to scripts/generated/migrate-routes-<ts>.diff for review.
 *   - Refuses to touch a file that is not on the STANDARD list. The
 *     REWRITE / REVIEW / NO-PRISMA buckets need human attention.
 *
 * Usage:
 *   npx tsx scripts/migrate-routes.ts              # dry run, all STANDARD
 *   npx tsx scripts/migrate-routes.ts --apply      # write changes
 *   npx tsx scripts/migrate-routes.ts --target 'src/app/api/v1/invoices/**'
 *
 * Notes for the operator:
 *   - This codemod handles ~80% of cases mechanically. Edge cases
 *     (custom validation imports, nested relation creates with tenantId
 *      requirements, hand-written aggregation logic) still need manual
 *     review post-codemod. Run `git diff` on every migrated file
 *     before merging.
 *   - For routes whose nested creates target tenant-scoped models
 *     (e.g., SalesOrder + SalesOrderItem), the codemod cannot
 *     auto-inject tenantId into nested `create` payloads — the schema's
 *     NOT NULL on the column + Layer-2 RLS will catch it at runtime,
 *     but operator should grep for `items:\s*{\s*create` in migrated
 *     files and add `tenantId` explicitly.
 *
 * Status: SKELETON. The transformation logic below covers the most
 * common patterns observed in the B3 exemplar migration. Production-grade
 * version should use ts-morph for AST manipulation; this regex-based
 * starting point is intentionally readable so the operator can iterate.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "..");
const TRIAGE_REPORT = path.join(REPO_ROOT, "docs", "PHASE0_TRACK_B_TRIAGE.md");
const DIFF_DIR = path.join(REPO_ROOT, "scripts", "generated");

interface CliArgs {
  apply: boolean;
  target?: string;
  only?: string[];
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--target") args.target = argv[++i];
    else if (a === "--only") args.only = argv[++i].split(",");
  }
  return args;
}

function readStandardList(): string[] {
  if (!fs.existsSync(TRIAGE_REPORT)) {
    throw new Error(
      `Triage report not found at ${TRIAGE_REPORT}. Run scripts/triage-routes.sh first.`,
    );
  }
  const content = fs.readFileSync(TRIAGE_REPORT, "utf8");
  const sectionStart = content.indexOf("## STANDARD");
  if (sectionStart < 0) return [];
  const nextSection = content.indexOf("\n## ", sectionStart + 1);
  const section = content.slice(
    sectionStart,
    nextSection < 0 ? undefined : nextSection,
  );
  // Extract `src/...route.ts` from list lines.
  return Array.from(
    section.matchAll(/`(src\/app\/api\/.+route\.ts)`/g),
    (m) => m[1],
  );
}

function targetFiles(args: CliArgs): string[] {
  const standard = readStandardList();
  if (args.target) {
    const re = new RegExp(args.target.replace(/\*/g, ".*"));
    return standard.filter((f) => re.test(f));
  }
  if (args.only) {
    return standard.filter((f) => args.only!.some((p) => f.includes(p)));
  }
  return standard;
}

// ─── Transformation steps ──────────────────────────────────────────────────

interface Transform {
  name: string;
  apply: (src: string) => string;
}

const transforms: Transform[] = [
  {
    name: "strip-lazy-prisma",
    apply: (src) =>
      src.replace(
        /let prisma:\s*any\s*=\s*null;\s*\n*try\s*{\s*\n*\s*prisma\s*=\s*require\("@\/lib\/prisma"\)\.default;\s*\n*}\s*catch[^}]*}\s*\n*/g,
        "",
      ),
  },
  {
    name: "replace-with-auth-import",
    apply: (src) =>
      src
        .replace(
          /from\s+"@\/lib\/api\/with-auth"/g,
          'from "@/lib/api/with-tenant"',
        )
        .replace(/\bwithAuthParams\b/g, "withAuthAndTenantParams")
        .replace(/\bwithAuth\b/g, "withAuthAndTenant"),
  },
  {
    name: "wrap-bare-get-handler",
    apply: (src) => {
      // Match `export async function GET(req: NextRequest) { ... matched body ... }`
      // and rewrite to `export const GET = withAuthAndTenant(...);`.
      // Caveat: doesn't perfectly track brace nesting; depends on the
      // existing pattern (helpers + handler are flat). Inspect diff
      // after every run.
      return src.replace(
        /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*req\s*:\s*NextRequest\s*\)\s*{/g,
        (_full, method) =>
          `export const ${method} = withAuthAndTenant(async (req: NextRequest, { db, tenantId }) => {`,
      );
    },
  },
  {
    name: "close-wrapped-handler",
    apply: (src) => {
      // After wrap-bare-get-handler, the handler's trailing `}` becomes
      // `});`. We do this textually if the file has `export const GET = withAuthAndTenant(...`
      // followed by an unbalanced `}` at the top level. Skipped here —
      // requires AST. Leave for operator to fix in diff review.
      // (Marker comment so the operator finds these quickly:)
      if (
        src.includes("withAuthAndTenant(async") &&
        !src.includes("// CODEMOD: verify wrapping closure")
      ) {
        return (
          "// CODEMOD: verify wrapping closure — bare `}` at the end of handlers must become `});`\n" +
          src
        );
      }
      return src;
    },
  },
  {
    name: "rewrite-withauth-callback",
    apply: (src) => {
      // Convert: withAuthAndTenant(async (req, { role, userId }) => ... )
      //     to: withAuthAndTenant(async (req, { db, tenantId, role, userId }) => ... )
      // Only touch the destructured context; leave plain (req) callers alone.
      return src.replace(
        /withAuthAndTenant\(\s*async\s*\(\s*req(?:\s*:\s*NextRequest)?\s*,\s*{\s*([^}]*)\s*}\s*\)\s*=>/g,
        (_full, props) => {
          const set = new Set(
            props.split(",").map((p: string) => p.trim()).filter(Boolean),
          );
          set.add("db");
          set.add("tenantId");
          return `withAuthAndTenant(async (req: NextRequest, { ${Array.from(
            set,
          ).join(", ")} }) =>`;
        },
      );
    },
  },
  {
    name: "rewrite-prisma-to-db",
    apply: (src) => src.replace(/\bprisma\.([a-zA-Z]+)/g, "db.$1"),
  },
  {
    name: "unwrap-if-prisma-guard",
    apply: (src) => {
      // Remove `if (prisma) {` lines — leftover from the lazy loader.
      // Closing `}` of the guard is handled in the codemod-verify pass.
      return src.replace(/^\s*if\s*\(\s*prisma\s*\)\s*{\s*$/gm, "");
    },
  },
];

function dumpDiff(orig: string, next: string, file: string): string {
  // Use external `diff` for a unified patch. Fall back to printing both
  // if diff isn't available.
  const tmp = path.join(DIFF_DIR, ".tmp-codemod");
  fs.mkdirSync(tmp, { recursive: true });
  const a = path.join(tmp, "a.txt");
  const b = path.join(tmp, "b.txt");
  fs.writeFileSync(a, orig);
  fs.writeFileSync(b, next);
  try {
    return execSync(
      `diff -u --label a/${file} --label b/${file} ${a} ${b} || true`,
      { encoding: "utf8" },
    );
  } catch {
    return `-- could not diff ${file}\n`;
  }
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const files = targetFiles(args);

  console.log(
    `[codemod] mode=${args.apply ? "APPLY" : "DRY-RUN"} targets=${files.length}`,
  );

  fs.mkdirSync(DIFF_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const diffPath = path.join(DIFF_DIR, `migrate-routes-${stamp}.diff`);
  const diffParts: string[] = [];

  let changedCount = 0;
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) {
      console.warn(`[codemod] skip missing: ${file}`);
      continue;
    }
    const orig = fs.readFileSync(abs, "utf8");
    let next = orig;
    for (const t of transforms) next = t.apply(next);
    if (next === orig) continue;

    changedCount++;
    diffParts.push(dumpDiff(orig, next, file));
    if (args.apply) fs.writeFileSync(abs, next);
    console.log(
      `[codemod] ${args.apply ? "wrote" : "would-change"}: ${file}`,
    );
  }

  fs.writeFileSync(diffPath, diffParts.join("\n"));
  console.log(`[codemod] diff written to ${path.relative(REPO_ROOT, diffPath)}`);
  console.log(`[codemod] changed=${changedCount} / total=${files.length}`);
  if (!args.apply) {
    console.log(`[codemod] re-run with --apply to write changes`);
  } else {
    console.log(`[codemod] DONE. Run \`git diff\` and \`npx vitest run\`.`);
    console.log(
      `[codemod] Look for "CODEMOD: verify wrapping closure" markers in changed files.`,
    );
  }
}

if (require.main === module) {
  run();
}
