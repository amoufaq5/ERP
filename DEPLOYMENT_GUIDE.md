# Deployment Guide — PharmaERP

## Prerequisites

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 LTS | Runtime |
| PostgreSQL | 16+ | Primary database |
| Redis | 7+ | Caching, sessions, job queues |
| Docker & Docker Compose | Latest | Containerized deployment |
| Domain + SSL | — | HTTPS termination |

---

## Step 1: Provision Infrastructure

### Option A: Cloud VM (AWS EC2, GCP, Azure)

```bash
# Recommended: Ubuntu 22.04 LTS, 4 vCPU, 16GB RAM, 100GB SSD
# Open ports: 22 (SSH), 80, 443, 5432 (internal only)

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### Option B: Managed Services

| Service | Provider Options |
|---------|-----------------|
| App Hosting | Vercel, AWS ECS, Google Cloud Run |
| Database | AWS RDS PostgreSQL, Supabase, Neon |
| Redis | AWS ElastiCache, Upstash, Redis Cloud |
| File Storage | AWS S3, Cloudflare R2 |

---

## Step 2: Clone & Configure

```bash
git clone <repository-url> /opt/pharma-erp
cd /opt/pharma-erp
```

### Create production environment file

```bash
cp .env.example .env.production
```

### Edit `.env.production` — fill in every value:

```env
# ─── Database ───────────────────────────────────────────────
DATABASE_URL="postgresql://erp_user:<STRONG_PASSWORD>@db:5432/erp_db?schema=public"
MASTER_DATABASE_URL="postgresql://erp_user:<STRONG_PASSWORD>@db:5432/erp_db?schema=public"
DB_POOL_SIZE=20

# ─── Authentication ────────────────────────────────────────
NEXTAUTH_SECRET="<GENERATE: openssl rand -base64 64>"
NEXTAUTH_URL="https://your-domain.com"

# ─── Redis ──────────────────────────────────────────────────
REDIS_URL="redis://redis:6379"

# ─── Encryption (field-level) ──────────────────────────────
ENCRYPTION_MASTER_KEY="<GENERATE: openssl rand -hex 32>"
ENCRYPTION_KEYS='[{"id":"key-1","key":"<openssl rand -hex 32>","algorithm":"aes-256-gcm"}]'
ENCRYPTION_DEFAULT_KEY_ID="key-1"

# ─── Email (SMTP) ──────────────────────────────────────────
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="<SENDGRID_API_KEY>"
SMTP_FROM="erp@your-domain.com"

# ─── AI Integration (optional) ─────────────────────────────
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
OLLAMA_URL=""
OLLAMA_MODEL=""

# ─── File Storage ──────────────────────────────────────────
S3_BUCKET="pharma-erp-files"
S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# ─── Payments (optional) ───────────────────────────────────
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ─── Monitoring ────────────────────────────────────────────
SENTRY_DSN=""

# ─── Security ──────────────────────────────────────────────
ALLOWED_ORIGINS="https://your-domain.com"
NODE_ENV="production"
APP_VERSION="1.0.0"
```

---

## Step 3: Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (first time — creates all 120 tables)
npx prisma db push

# OR run migrations if using migration-based workflow
npx prisma migrate deploy

# Seed initial data (admin user, system settings)
npx prisma db seed
```

### Verify database

```bash
npx prisma studio  # Opens browser UI to inspect tables
```

---

## Step 4: Deploy with Docker Compose

### Production docker-compose

```bash
# Build and start all services
docker compose -f docker-compose.yml up -d --build

# Verify services are running
docker compose ps

# Expected output:
# pharma-erp-app   Running   0.0.0.0:3000->3000/tcp
# pharma-erp-db    Running   5432/tcp
# pharma-erp-redis Running   6379/tcp
```

### Check application health

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Step 5: Reverse Proxy & SSL

### Nginx configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # File upload limit (for document uploads)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE endpoint (no buffering)
    location /api/v1/events {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Step 6: Create Admin User

```bash
# Option 1: Via Prisma seed (configured in package.json)
npx prisma db seed

# Option 2: Manual — open Prisma Studio and create user
npx prisma studio
# Navigate to User model → Add record:
#   email: admin@company.com
#   name: System Admin
#   role: ADMIN
#   password: <bcrypt hash — generate at https://bcrypt-generator.com>

# Option 3: Via API (dev mode only)
curl -X POST http://localhost:3000/api/auth/direct-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"<password>"}'
```

---

## Step 7: Post-Deployment Verification

Run this checklist after deployment:

```bash
# 1. Health check
curl -s https://your-domain.com/api/v1/health | jq .

# 2. Auth flow — get a session
curl -s -c cookies.txt https://your-domain.com/api/auth/csrf
curl -s -b cookies.txt -c cookies.txt \
  -X POST https://your-domain.com/api/auth/callback/credentials \
  -d "email=admin@company.com&password=<pass>&csrfToken=<token>"

# 3. API routes — test QAQC
curl -s -b cookies.txt https://your-domain.com/api/v1/qaqc/deviations | jq .total

# 4. Search
curl -s -b cookies.txt "https://your-domain.com/api/v1/search?q=test" | jq .totalHits

# 5. GraphQL
curl -s -b cookies.txt -X POST https://your-domain.com/api/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ customers { id name } }"}' | jq .

# 6. PWA manifest
curl -s https://your-domain.com/manifest.json | jq .name

# 7. OpenAPI docs
curl -s https://your-domain.com/api/v1/docs | jq .info
```

---

## Step 8: Backups & Monitoring

### Automated database backups

```bash
# Add to crontab: daily backup at 2 AM
0 2 * * * docker exec pharma-erp-db pg_dump -U erp_user erp_db | gzip > /backups/erp_$(date +\%Y\%m\%d).sql.gz

# Retention: keep 30 days
find /backups -name "erp_*.sql.gz" -mtime +30 -delete
```

### Application monitoring

```bash
# Container health
docker compose ps
docker stats --no-stream

# Application logs
docker compose logs -f app --tail 100

# Database connections
docker exec pharma-erp-db psql -U erp_user -d erp_db -c "SELECT count(*) FROM pg_stat_activity;"

# Redis status
docker exec pharma-erp-redis redis-cli INFO server | head -20
```

### Uptime monitoring

Set up monitoring with Uptime Robot, Pingdom, or AWS CloudWatch:
- Health endpoint: `GET /api/v1/health` — expect 200
- Interval: 60 seconds
- Alert channels: email, Slack, PagerDuty

---

## Step 9: Scaling

### Horizontal scaling

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
    # Add load balancer (Nginx upstream or AWS ALB)
```

### Database scaling

```bash
# Connection pooling with PgBouncer
# Read replicas for reporting queries
# Partitioning for audit_log, stock_movements tables
```

### CDN for static assets

```bash
# Vercel Edge Network (automatic with Vercel deployment)
# OR Cloudflare CDN in front of Nginx
```

---

## Step 10: Updates & Rollbacks

### Zero-downtime deployment

```bash
# Pull latest code
git pull origin main

# Build new image
docker compose build app

# Rolling restart (keeps old container until new one is healthy)
docker compose up -d --no-deps app

# Verify health
curl -s https://your-domain.com/api/v1/health
```

### Rollback

```bash
# Tag images before deploying
docker tag pharma-erp-app:latest pharma-erp-app:previous

# Rollback if needed
docker tag pharma-erp-app:previous pharma-erp-app:latest
docker compose up -d --no-deps app
```

### Database migrations

```bash
# Always backup before migrating
docker exec pharma-erp-db pg_dump -U erp_user erp_db > pre_migration_backup.sql

# Run migrations
npx prisma migrate deploy

# Rollback if needed
psql -U erp_user -d erp_db < pre_migration_backup.sql
```

---

## Vercel Deployment (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... (all variables from .env.production)

# Deploy
vercel --prod

# The vercel.json is pre-configured:
# buildCommand: "npx prisma generate && next build"
```

---

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| 500 errors | `docker compose logs app` | Check DATABASE_URL, NEXTAUTH_SECRET |
| Auth failures | Cookie settings, NEXTAUTH_URL | Ensure NEXTAUTH_URL matches domain |
| Slow queries | `pg_stat_statements` | Add indexes, check DB_POOL_SIZE |
| Redis connection refused | `docker compose ps redis` | Check REDIS_URL, restart redis |
| File uploads fail | Nginx client_max_body_size | Increase to 50M+ |
| CORS errors | ALLOWED_ORIGINS env var | Add frontend domain |
| CSRF errors | Cookie domain mismatch | Check NEXTAUTH_URL protocol |
