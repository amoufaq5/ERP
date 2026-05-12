#!/usr/bin/env bash
# Codemod for [id]/route.ts files that match the STANDARD pattern.
#
# Architecture: three passes (so each pass has one job, and depth
# tracking inside the GET wrap doesn't interfere with the if-prisma
# unwrap).
#
#   Pass 1 (awk): UNWRAP
#     Drops the `if (prisma) { try { ... } catch (error) { ... } }`
#     guards and unindents the inner body. Operates at any indent
#     level so it works inside GET / PATCH / DELETE bodies alike.
#
#   Pass 2 (awk): STRUCTURE
#     - Strips the top-level lazy-prisma block.
#     - Wraps bare `export async function GET(...) { ... }` in
#       `withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
#          async (..., { db, tenantId }) => { ... }
#        );`
#     - Tracks brace depth of the wrapped function body and rewrites
#       the matching closing `}` to `});`.
#
#   Pass 3 (sed -E): TEXT
#     - import source: @/lib/api/with-auth -> @/lib/api/with-tenant
#     - withAuthParams -> withAuthAndTenantParams
#     - withAuth       -> withAuthAndTenant
#     - { role, userId } -> { db, tenantId, role, userId }
#     - prisma.X.findUnique({where:{id}}) -> db.X.findFirst({where:{id}})
#     - prisma.X.findUnique({ -> db.X.findFirst({
#     - prisma.X -> db.X
#
# Why split: mawk (this sandbox's awk) lacks `\b` word boundaries
# and gsub backreferences. GNU sed has both. Splitting keeps both
# halves portable. Splitting unwrap from GET-wrap means depth
# tracking in the GET-wrap doesn't fight the if-prisma unwrap.
#
# Usage:
#   bash scripts/codemod-id-routes.sh --dry-run <file> [<file> ...]
#   bash scripts/codemod-id-routes.sh --apply   <file> [<file> ...]
#   bash scripts/codemod-id-routes.sh --apply --from-triage    # all STANDARD [id] routes
#
# Dry mode prints a unified diff. Apply mode overwrites the file and
# leaves a `.bak` next to it. After apply, run scripts/triage-routes.sh
# and `git diff` to spot-check.
#
# Scope: only handles [id]/route.ts. Does not handle list routes,
# route-factory routes, custom auth wrappers, or already-migrated
# files. Track B5 batch 1 (commit bfc3e0c) hand-migrated 5 such routes
# to validate the target shape; this codemod produces equivalent
# output for the remaining ones.

set -euo pipefail

MODE="dry-run"
FROM_TRIAGE=0
FILES=()

for arg in "$@"; do
  case "$arg" in
    --dry-run)     MODE="dry-run" ;;
    --apply)       MODE="apply"   ;;
    --from-triage) FROM_TRIAGE=1  ;;
    *)             FILES+=("$arg") ;;
  esac
done

if [ "$FROM_TRIAGE" -eq 1 ]; then
  if [ ! -f docs/PHASE0_TRACK_B_TRIAGE.md ]; then
    echo "triage report not found; run scripts/triage-routes.sh first" >&2
    exit 1
  fi
  while IFS= read -r f; do FILES+=("$f"); done < <(
    awk '/^## STANDARD/{flag=1;next} /^## /{flag=0} flag && /^- `/' \
      docs/PHASE0_TRACK_B_TRIAGE.md \
      | sed -E 's|^- `([^`]+)`.*|\1|' \
      | grep '\[id\]/route.ts$'
  )
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "usage: $0 [--dry-run | --apply] [--from-triage] [<file> ...]" >&2
  exit 1
fi

# ─── Common awk helpers (embedded into each pass) ─────────────────────────
COMMON='
function count_chars(s, c,    cnt, i) {
  cnt = 0
  for (i = 1; i <= length(s); i++) if (substr(s, i, 1) == c) cnt++
  return cnt
}

function strip_strings_and_comments(line,    out, in_str, i, ch) {
  out = ""; in_str = ""; i = 1
  while (i <= length(line)) {
    ch = substr(line, i, 1)
    if (in_str != "") {
      if (ch == in_str) in_str = ""
      i++; continue
    }
    if (ch == "\"" || ch == "'\''" || ch == "`") { in_str = ch; i++; continue }
    if (ch == "/" && substr(line, i + 1, 1) == "/") break
    out = out ch; i++
  }
  return out
}
'

# ─── Pass 1: if-prisma unwrap ─────────────────────────────────────────────

pass_unwrap() {
  awk "$COMMON"'
    BEGIN { state = "TOP"; inner_depth = 0 }

    state == "TOP" && /^[[:space:]]*if[[:space:]]*\([[:space:]]*prisma[[:space:]]*\)[[:space:]]*\{[[:space:]]*$/ {
      state = "IF_PRISMA"
      next  # drop the line
    }

    state == "IF_PRISMA" && /^[[:space:]]*try[[:space:]]*\{[[:space:]]*$/ {
      state = "INNER_TRY"
      inner_depth = 1
      next  # drop the line
    }

    state == "IF_PRISMA" {
      # If the `if (prisma) {` is not immediately followed by `try {`,
      # bail out — leave the original line in place. The codemod
      # caller should flag this case for manual review.
      state = "TOP"
      print "if (prisma) {"
      print
      next
    }

    state == "INNER_TRY" {
      eff = strip_strings_and_comments($0)
      opens  = count_chars(eff, "{")
      closes = count_chars(eff, "}")
      new_depth = inner_depth + opens - closes
      # Close-of-inner-try line: `} catch (error) { ... }` brings depth
      # back to 0 (one `}` close, no matching `{` for the catch since
      # `{ ... }` balances on the same line).
      if (new_depth == 0 && $0 ~ /^[[:space:]]*\}[[:space:]]*catch/) {
        inner_depth = 0
        state = "AFTER_INNER"
        next  # drop the line
      }
      inner_depth = new_depth
      # Unindent by 4 spaces (we dropped two enclosing braces).
      if (substr($0, 1, 8) == "        ") {
        sub(/^        /, "    ", $0)
      } else if (substr($0, 1, 4) == "    ") {
        sub(/^    /, "", $0)
      }
      print
      next
    }

    state == "AFTER_INNER" {
      # Closing `}` of the `if (prisma)` block. Drop it.
      if ($0 ~ /^[[:space:]]*\}[[:space:]]*$/) {
        state = "TOP"
        next
      }
      # Anything else: exit unwrap, emit.
      state = "TOP"
      print
      next
    }

    { print }
  '
}

# ─── Pass 1.5: mock-fallback strip ────────────────────────────────────────
#
# After the if-prisma unwrap, every route still carries the original
# mock-fallback code below the `return apiResponse(record);` line. That
# code is now unreachable AND redeclares the `record` const in the same
# block scope — which is a JS syntax error (regardless of TS settings).
#
# This pass strips from `// Mock fallback` (the codebase's consistent
# marker comment) until the next `} catch (` line, preserving the catch
# clause itself. It runs after the unwrap so the dead code is easy to
# locate.

pass_strip_mock() {
  awk "$COMMON"'
    BEGIN { state = "TOP" }

    state == "TOP" && /^[[:space:]]*\/\/[[:space:]]*Mock fallback/ {
      state = "MOCK"
      next
    }

    state == "MOCK" {
      # Closing `} catch (` line ends the mock block; preserve it.
      if ($0 ~ /^[[:space:]]*\}[[:space:]]*catch[[:space:]]*\(/) {
        state = "TOP"
        print
        next
      }
      # Drop everything else (the mock data, the unreachable `return`s).
      next
    }

    { print }
  '
}

# ─── Pass 2: LAZY strip + GET wrap ────────────────────────────────────────

pass_structure() {
  awk "$COMMON"'
    BEGIN { state = "TOP"; depth = 0; drop_next_blank = 0 }

    # LAZY block ────────────────────────────────────────────────────────
    state == "TOP" && /^let prisma:.*=[[:space:]]*null;[[:space:]]*$/ {
      state = "LAZY"
      drop_next_blank = 1
      next
    }
    state == "LAZY" && /^}[[:space:]]*catch[[:space:]]*\(/ {
      state = "TOP"
      next
    }
    state == "LAZY" { next }

    # Bare GET function ─────────────────────────────────────────────────
    state == "TOP" && /^export[[:space:]]+async[[:space:]]+function[[:space:]]+GET[[:space:]]*\(/ {
      print "export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>("
      print "  async ("
      # Single-line signature
      if ($0 ~ /\)[[:space:]]*\{[[:space:]]*$/) {
        params = $0
        sub(/^[^(]*\(/, "", params)
        sub(/\)[[:space:]]*\{[[:space:]]*$/, "", params)
        print "    " params ", { db, tenantId }) => {"
        state = "GET_BODY"
        depth = 1
        next
      }
      state = "GET_SIG"
      next
    }

    state == "GET_SIG" {
      if ($0 ~ /^\)[[:space:]]*\{[[:space:]]*$/) {
        print "    { db, tenantId }) => {"
        state = "GET_BODY"
        depth = 1
        next
      }
      print "  " $0
      next
    }

    state == "GET_BODY" {
      eff = strip_strings_and_comments($0)
      opens  = count_chars(eff, "{")
      closes = count_chars(eff, "}")
      new_depth = depth + opens - closes
      if (new_depth == 0) {
        line = $0
        idx = 0
        for (i = length(line); i > 0; i--) {
          if (substr(line, i, 1) == "}") { idx = i; break }
        }
        if (idx > 0) {
          line = substr(line, 1, idx - 1) "});" substr(line, idx + 1)
        }
        print line
        state = "TOP"
        depth = 0
        next
      }
      depth = new_depth
      print
      next
    }

    {
      if (drop_next_blank && /^[[:space:]]*$/) { drop_next_blank = 0; next }
      drop_next_blank = 0
      print
    }
  '
}

# ─── Pass 3: sed -E substitutions ─────────────────────────────────────────

pass_text() {
  sed -E \
    -e 's|from "@/lib/api/with-auth"|from "@/lib/api/with-tenant"|g' \
    -e 's|\bwithAuthParams\b|withAuthAndTenantParams|g' \
    -e 's|\bwithAuth\b|withAuthAndTenant|g' \
    -e 's|\{ role, userId \}|{ db, tenantId, role, userId }|g' \
    -e 's|prisma\.([a-zA-Z_]+)\.findUnique\(\{ where: \{ id \} \}\)|db.\1.findFirst({ where: { id } })|g' \
    -e 's|prisma\.([a-zA-Z_]+)\.findUnique\(\{|db.\1.findFirst({|g' \
    -e 's|\bprisma\.([a-zA-Z_]+)|db.\1|g'
}

# ─── Driver ───────────────────────────────────────────────────────────────

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "skip (missing): $f" >&2
    continue
  fi

  out="$(pass_unwrap < "$f" | pass_strip_mock | pass_structure | pass_text)"

  if [ "$MODE" = "dry-run" ]; then
    echo "──── $f ────"
    diff -u "$f" <(echo "$out") || true
    echo ""
  else
    cp "$f" "$f.bak"
    echo "$out" > "$f"
    echo "wrote: $f (backup: $f.bak)"
  fi
done
