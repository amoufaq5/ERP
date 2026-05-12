#!/usr/bin/env bash
# Narrow codemod for [id]/route.ts files that match the STANDARD pattern:
#   - bare `export async function GET(_req, { params }: ...)` (P0 unauth GET)
#   - `withAuthParams(async (req, { params }, { role, userId }) => ...)` for
#     PATCH/PUT/DELETE
#   - `prisma.<model>.findUnique({ where: { id } })` — no tenant scoping
#   - lazy-prisma `let prisma: any = null; try { require ... }` boilerplate
#
# Applies six transformations:
#
#   1. Strip the lazy-prisma loader block.
#   2. Replace import: `withAuthParams` from `@/lib/api/with-auth`
#      ->  `withAuthAndTenantParams` from `@/lib/api/with-tenant`.
#   3. Wrap bare GET: `export async function GET(_req, { params })` body `}`
#      ->  `export const GET = withAuthAndTenantParams<...>(async (...) => { ... });`
#      (matched per-file by line range; uses awk brace counting.)
#   4. Convert `withAuthParams(...)` callback signatures to include `db`:
#      `(req, { params }, { role, userId })`
#      ->  `(req, { params }, { db, tenantId, role, userId })`
#   5. Replace `prisma.<model>.findUnique({ where: { id } })`
#      ->  `db.<model>.findFirst({ where: { id } })`
#      (findUnique doesn't accept extra WHERE; findFirst lets the extension
#      inject tenantId.)
#   6. Replace remaining `prisma.<model>` -> `db.<model>`.
#
# Usage:
#   bash scripts/codemod-id-routes.sh --dry-run <file> [<file> ...]
#   bash scripts/codemod-id-routes.sh --apply   <file> [<file> ...]
#
# In dry mode the would-be output goes to stdout. In apply mode the file is
# overwritten and a `.bak` is left next to it for safety.
#
# Scope: this is intentionally narrow. It does NOT handle:
#   - list routes (no [id]) — different brace layout
#   - routes that use `route-factory` already
#   - routes with custom auth wrappers
#   - routes with mock fallback functions (left in place; Track C concern)
# Run the triage script after applying to confirm bucket movement.

set -euo pipefail

MODE="dry-run"
FILES=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) MODE="dry-run" ;;
    --apply)   MODE="apply"   ;;
    *)         FILES+=("$arg") ;;
  esac
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "usage: $0 [--dry-run | --apply] <file> [<file> ...]"
  exit 1
fi

transform_file() {
  local in="$1"
  awk '
    BEGIN { in_lazy = 0; lazy_skip = 0 }

    # Step 1: strip the lazy-prisma block.
    # Matches:
    #   let prisma: any = null;
    #   try {
    #     prisma = require("@/lib/prisma").default;
    #   } catch ...
    /^let prisma:.*= null;/ { in_lazy = 1; next }
    in_lazy && /^try \{/    { lazy_skip = 1; next }
    in_lazy && lazy_skip && /^} catch/ {
      # consume the rest of this line (may have content after }catch{...})
      # then exit lazy mode.
      in_lazy = 0; lazy_skip = 0; next
    }
    in_lazy && lazy_skip { next }
    in_lazy && /^$/ { in_lazy = 0; next }   # blank line ends lazy block if no try found yet

    { print }
  ' "$in" \
  | sed -E \
      -e 's|from "@/lib/api/with-auth"|from "@/lib/api/with-tenant"|g' \
      -e 's|\bwithAuthParams\b|withAuthAndTenantParams|g' \
      -e 's|\bwithAuth\b|withAuthAndTenant|g' \
      -e 's|\{ role, userId \}|\{ db, tenantId, role, userId \}|g' \
      -e 's|prisma\.([a-zA-Z]+)\.findUnique\(\{ where: \{ id \} \}\)|db.\1.findFirst({ where: { id } })|g' \
      -e 's|prisma\.([a-zA-Z]+)\.findUnique\(\{|db.\1.findFirst({|g' \
      -e 's|\bprisma\.([a-zA-Z]+)|db.\1|g'
}

wrap_bare_get() {
  # Wrap a bare `export async function GET(_req, { params }: ...)` in
  # withAuthAndTenantParams. Uses awk to track brace depth so we can
  # rewrite the matching closing `}` to `});`.
  awk '
    function rewrite_open(line) {
      # Replace the function header with the wrapped form.
      sub(/^export async function GET\(/,
          "export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(async (",
          line)
      # And the trailing ` {` becomes ` => {` (assumed at end of line)
      sub(/ \{$/, ", { db, tenantId }) => {", line)
      return line
    }

    BEGIN { in_get = 0; depth = 0 }

    /^export async function GET\(/ {
      print rewrite_open($0)
      in_get = 1
      depth = 1
      next
    }

    in_get {
      # Track brace depth (string-naive but adequate for this code shape).
      n_open  = gsub(/\{/, "{");  # count substitutions
      # gsub() above mutated $0; restore via getline-trick: we cant easily
      # un-mutate. Instead recompute by reading the original line via _orig.
      # Simpler: do the count on a copy then print the line.
    }
    in_get { print }   # placeholder — proper version below
  ' "$@" 2>/dev/null
}

# A robust brace tracker for the GET wrap: we use a small awk that tracks
# depth using a parameter (does not destroy the line being printed).
transform_get_wrap() {
  awk '
    BEGIN { in_get = 0; depth = 0 }

    /^export async function GET\(/ && in_get == 0 {
      line = $0
      sub(/^export async function GET\(/,
          "export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(async (",
          line)
      # Add db/tenantId to the params destructuring.
      sub(/ \{$/, ", { db, tenantId }) => {", line)
      print line
      in_get = 1
      depth = 1
      next
    }

    in_get {
      # Count { and } in the line (string-naive).
      tmp = $0
      no  = gsub(/\{/, "{", tmp); n_open = no
      tmp2 = $0
      nc  = gsub(/\}/, "}", tmp2); n_close = nc
      depth += n_open - n_close
      if (depth == 0) {
        # This line contains the matching closing `}`. Replace the LAST `}`
        # with `});`.
        line = $0
        # Use sub() with a tail anchor — but multiple `}` could exist on
        # the same line. We only want the LAST one.
        # Trick: reverse, replace first `}` (now last), reverse back. awk
        # has no reverse; instead, capture position by scanning.
        idx = 0
        for (i = length(line); i > 0; i--) {
          if (substr(line, i, 1) == "}") { idx = i; break }
        }
        if (idx > 0) {
          line = substr(line, 1, idx - 1) "});" substr(line, idx + 1)
        }
        print line
        in_get = 0
        next
      }
      print
      next
    }

    { print }
  '
}

# Final transform pipeline.
do_transform() {
  transform_file "$1" | transform_get_wrap
}

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "skip (missing): $f" >&2
    continue
  fi
  out="$(do_transform "$f")"
  if [ "$MODE" = "dry-run" ]; then
    echo "──── $f (dry-run) ────"
    diff -u "$f" <(echo "$out") || true
    echo ""
  else
    cp "$f" "$f.bak"
    echo "$out" > "$f"
    echo "wrote: $f  (backup: $f.bak)"
  fi
done
