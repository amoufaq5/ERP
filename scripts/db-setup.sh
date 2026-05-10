#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# PharmaCorp Egypt ERP - Database Setup Script
# ═══════════════════════════════════════════════════════════════════════════════
# This script initializes the database: checks PostgreSQL connectivity,
# runs Prisma migrations, and seeds demo data.
# ═══════════════════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "══════════════════════════════════════════════════"
echo "  PharmaCorp Egypt ERP - Database Setup"
echo "══════════════════════════════════════════════════"
echo ""

# ─── Extract DB connection details from DATABASE_URL ─────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable is not set.${NC}"
  echo "Please set it in your .env file or export it before running this script."
  echo "Example: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_dev"
  exit 1
fi

echo "Database URL: ${DATABASE_URL%%@*}@****"
echo ""

# ─── Check PostgreSQL connectivity with retry ────────────────────────────────
echo "Checking PostgreSQL connectivity..."

MAX_RETRIES=10
RETRY_DELAY=3
RETRY_COUNT=0

# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -z "$DB_HOST" ]; then
  DB_HOST="localhost"
fi
if [ -z "$DB_PORT" ]; then
  DB_PORT="5432"
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma db execute --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}  PostgreSQL is accessible.${NC}"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}  ERROR: Could not connect to PostgreSQL at ${DB_HOST}:${DB_PORT} after ${MAX_RETRIES} attempts.${NC}"
    echo ""
    echo "  Make sure PostgreSQL is running:"
    echo "    - Local: sudo systemctl start postgresql"
    echo "    - Docker: npm run docker:up"
    echo ""
    exit 1
  fi

  echo -e "${YELLOW}  Connection attempt ${RETRY_COUNT}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY}s...${NC}"
  sleep $RETRY_DELAY
done

echo ""

# ─── Generate Prisma Client ─────────────────────────────────────────────────
echo "Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}  Prisma client generated.${NC}"
echo ""

# ─── Run Prisma Migrations ──────────────────────────────────────────────────
echo "Running database migrations..."
if npx prisma migrate dev --name init 2>&1; then
  echo -e "${GREEN}  Migrations applied successfully.${NC}"
else
  echo -e "${YELLOW}  Note: If migrations already exist, this is expected.${NC}"
  echo "  Attempting to deploy existing migrations..."
  npx prisma migrate deploy
  echo -e "${GREEN}  Migrations deployed.${NC}"
fi
echo ""

# ─── Seed Database ──────────────────────────────────────────────────────────
echo "Seeding database with demo data..."
if npx prisma db seed 2>&1; then
  echo -e "${GREEN}  Database seeded successfully.${NC}"
else
  echo -e "${RED}  ERROR: Database seeding failed.${NC}"
  echo "  Check the seed script for errors: prisma/seed.ts"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════════"
echo -e "${GREEN}  Database setup complete!${NC}"
echo "══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Start the dev server:  npm run dev"
echo "  2. Open Prisma Studio:    npm run db:studio"
echo "  3. View the app:          http://localhost:3000"
echo ""
echo "Demo credentials:"
echo "  Admin:     admin@pharmacorp.eg / Admin@2024!"
echo "  Sales Mgr: sara.elmasry@pharmacorp.eg / Sales@2024!"
echo "  WH Mgr:    omar.farouk@pharmacorp.eg / Warehouse@2024!"
echo "  QA Mgr:    nadia.rizk@pharmacorp.eg / Quality@2024!"
echo "  HR Mgr:    khaled.mansour@pharmacorp.eg / HR@2024!"
echo ""
