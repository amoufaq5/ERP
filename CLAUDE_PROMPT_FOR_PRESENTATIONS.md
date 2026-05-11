# Master Prompt for Claude — PharmaERP Presentations, Pitch Decks & Technical Papers

Copy and paste this entire prompt into a new Claude conversation. Then ask it to generate your specific deliverable (pitch deck, investor memo, technical paper, sales one-pager, etc.)

---

## PROMPT START

You are a senior business analyst and enterprise software strategist. You have deep knowledge of the following product. Use this comprehensive brief to create investor presentations, pitch decks, technical papers, sales collateral, and client proposals as requested.

---

## Product Overview

**Product Name:** PharmaERP
**Category:** Cloud-native, multi-tenant Enterprise Resource Planning platform
**Target Market:** Pharmaceutical companies, life sciences, GxP-regulated industries, manufacturing, distribution, and field-force operations
**Deployment Model:** SaaS (multi-tenant) or on-premise (Docker)
**Platform Type:** Progressive Web App (PWA) — works on desktop, tablet, and mobile with offline capability

---

## Problem Statement

Pharmaceutical and life sciences companies operate under heavy regulatory burden (FDA 21 CFR Part 11, EU GMP Annex 11, WHO guidelines) while managing complex operations spanning manufacturing, quality assurance, field sales, finance, and supply chain. Today they face:

1. **Fragmented systems** — Separate tools for CRM, QMS, ERP, HR, and compliance create data silos, manual reconciliation, and audit gaps
2. **Compliance cost** — Paper-based quality systems and disconnected digital tools make regulatory audits expensive and risky
3. **Field force blindness** — Medical reps use consumer apps (WhatsApp, Excel) with no visibility, no data capture, no KPI tracking
4. **Slow time-to-value** — Traditional ERP implementations take 12-24 months; pharma-specific modules are expensive add-ons
5. **No AI integration** — Legacy systems cannot leverage AI for forecasting, anomaly detection, or decision support

---

## Solution

PharmaERP is a single, integrated platform that unifies 10+ enterprise modules purpose-built for pharma and regulated industries. One login, one database, one audit trail.

### Value Proposition (One-liner)
> "The only ERP that unifies pharma CRM, GxP-quality management, manufacturing execution, and full financial accounting in a single cloud platform — deployed in days, not months."

---

## Platform Architecture

### Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16, React 19, TypeScript 6, TailwindCSS | Server-side rendering, type safety, rapid UI development |
| **Backend** | Next.js API Routes, GraphQL | Full-stack in one framework, API-first architecture |
| **Database** | PostgreSQL 16 | Enterprise-grade, ACID-compliant, JSON support |
| **ORM** | Prisma 5 | Type-safe queries, automatic migrations, 120 data models |
| **Cache** | Redis 7 | Sub-millisecond response, session management, job queues |
| **Auth** | NextAuth with JWT | Secure sessions, MFA, role-based access |
| **Validation** | Zod 4 | Runtime type validation on all API inputs |
| **State** | Zustand + TanStack Query | Optimistic updates, offline cache, real-time sync |
| **Charts** | Recharts | Interactive dashboards and analytics |
| **PDF/Export** | jsPDF, XLSX | Regulatory reports, invoices, batch records |
| **AI** | Claude API, OpenAI, Ollama | Pluggable AI for insights, chat, forecasting |
| **DevOps** | Docker, GitHub Actions, Vercel | CI/CD, containerized deployment, edge delivery |

### Architecture Highlights

- **Multi-tenant by design** — Tenant isolation at the data layer via `tenantId` on every record; single codebase serves unlimited organizations
- **API-first** — 220+ REST API endpoints + GraphQL; every UI action has a corresponding API call
- **120 Prisma models** — Comprehensive data schema covering finance, quality, manufacturing, HR, CRM, and supply chain
- **61 business enums** — Codified pharma workflows (deviation types, CAPA statuses, batch release states, etc.)
- **154 dashboard pages** — Complete UI for every business function
- **Offline-first PWA** — Service worker + IndexedDB for field force offline use
- **Event-driven** — Webhooks, SSE streaming, notification bus for real-time updates
- **Field-level encryption** — AES-256-GCM for sensitive data (patient info, financial data)

---

## Modules & Features

### Module 1: CRM & Field Force (58 pages)

**For:** Medical representatives, business unit managers, national sales managers, district managers

**Features:**
- Doctor management with A/B/C classification and buying ladder stages
- Weekly visit planning with GPS tracking and route optimization
- Visit logging with product detailing, sample tracking, and outcome recording
- Territory management with hierarchical assignment (national → district → area)
- Lead and opportunity pipeline with conversion tracking
- Customer 360 view — complete interaction history across all touchpoints
- Campaign management for product launches and marketing initiatives
- Loyalty program management with points, tiers, and redemption
- Market request workflow (rep → BUM → NSM approval chain)
- KPI dashboards — visit frequency, coverage, conversion, revenue per rep
- Field service dispatch and tracking
- Expense management with approval workflow
- Call analysis and reporting
- Ticket/support management with SLA tracking

**Competitive Advantage:** Purpose-built for pharma field force, not a generic CRM adapted for pharma. Offline-first design means reps in rural areas never lose data.

---

### Module 2: Quality Assurance & Compliance — GxP (18 pages, 35 data models)

**For:** Quality assurance managers, QC analysts, regulatory affairs, production supervisors

**Sub-modules (18):**

| Sub-module | Key Features |
|------------|-------------|
| **Deviation Management** | Planned/unplanned deviations, severity classification, root cause analysis, CAPA linkage |
| **CAPA** | Corrective & preventive actions, action tracking, effectiveness verification, auto-closure |
| **Audit Management** | Internal/external/regulatory audits, finding classification, corrective action tracking |
| **Change Control** | Change request workflow, impact assessment, implementation tracking |
| **Complaint Management** | Customer complaint intake, investigation, trending, regulatory reporting |
| **Document Control** | SOP lifecycle (draft → review → approved → effective → retired), version control |
| **Environmental Monitoring** | Clean room monitoring (viable/non-viable), excursion management, trend analysis |
| **SPC Charts** | Statistical process control with Western Electric rules, Cp/Cpk indices |
| **Stability Studies** | ICH-compliant stability protocols, timepoint tracking, shelf-life determination |
| **OOS Investigation** | Out-of-specification investigation workflow per FDA guidance |
| **Batch Release** | QP release workflow, certificate of analysis, release checklist |
| **Risk Assessment** | FMEA, HACCP, risk matrix methodologies with scoring |
| **Cleaning Validation** | Cleaning protocol management, residue limits, validation status |
| **Recalls** | Product recall management with batch tracking and retrieval |
| **Supplier Quality** | Supplier qualification, audit schedules, quality agreements |
| **Vendor Scoring** | Multi-criteria vendor evaluation (quality, delivery, compliance, commercial) |
| **Water System Monitoring** | Purified water/WFI monitoring with limit tracking |
| **Training Matrix** | Employee training records, competency tracking, expiry alerts |

**Compliance Standards Addressed:**
- FDA 21 CFR Part 11 (electronic records and signatures)
- EU GMP Annex 11 (computerized systems)
- ICH Q10 (pharmaceutical quality system)
- ISO 13485 (medical devices)
- WHO GMP guidelines

**Competitive Advantage:** Full QMS integrated into the ERP — no separate Veeva QualityOne, MasterControl, or Trackwise license needed.

---

### Module 3: Finance & Accounting (59 pages, 15 data models)

**For:** CFOs, controllers, accountants, AP/AR clerks

**Features:**
- Full double-entry general ledger with chart of accounts
- Accounts receivable — invoicing, aging, collections
- Accounts payable — bill management, three-way matching (PO ↔ GR ↔ Invoice)
- Journal entries with balanced validation
- Bank reconciliation and banking integration
- Budgeting with variance analysis by department and cost center
- Cost center accounting and allocations
- Payroll processing with payslip generation
- E-invoicing (Egyptian Tax Authority compliance)
- Revenue recognition
- Treasury and cash management
- Tax management and configuration
- Fiscal period management
- Cheque management (print, track, void)
- Consolidation for multi-entity organizations
- PDF invoice generation with branding

**Competitive Advantage:** Pharma-specific chart of accounts pre-configured; three-way matching automates AP validation; integrated with procurement and inventory.

---

### Module 4: Inventory & Supply Chain (15+ pages, 9 data models)

**For:** Warehouse managers, procurement officers, logistics coordinators

**Features:**
- Multi-warehouse management with zone configuration (ambient, cold chain, quarantine, hazardous)
- Product management with batch/lot tracking
- Stock movements (inbound, outbound, internal transfer)
- FEFO (First Expiry First Out) picking and dispatch
- Expiry management with configurable alert thresholds (90/60/30 days)
- Auto-quarantine for expired products
- Purchase order management with approval workflow
- RFQ (Request for Quotation) process
- Goods receipt with quality inspection
- Shipment tracking with carrier management
- Delivery note generation
- Three-way matching (PO ↔ GR ↔ Invoice)
- Batch traceability — full forward and backward trace

**Competitive Advantage:** Pharma-grade batch traceability and FEFO — critical for regulated products with expiry dates; cold chain zone management built-in.

---

### Module 5: Manufacturing & MES (5+ pages, 5 data models)

**For:** Production managers, batch record reviewers, QA release

**Features:**
- Bill of Materials (BOM) with multi-level structure
- Work order management with scheduling
- Electronic Batch Records (eBR) — step-by-step execution
- Manufacturing batch tracking with yield calculation
- Batch traceability — forward and backward from raw material to finished product
- In-process quality checkpoints
- Equipment integration and utilization tracking

**Competitive Advantage:** Integrated eBR eliminates paper batch records; direct linkage to quality deviations and CAPA.

---

### Module 6: HR & People Management (12 data models)

**For:** HR managers, department heads, employees

**Features:**
- Employee lifecycle management (hire to retire)
- Department and position management with org chart
- Leave management with balance tracking and approval workflow
- Attendance tracking
- Payroll processing and payslip generation
- Performance management
- Training management and course enrollment
- Onboarding checklists with task assignment
- Asset assignment tracking
- Benefits administration

---

### Module 7: Applicant Tracking System (8 pages)

**For:** Recruiters, hiring managers

**Features:**
- Job posting management with careers page
- Candidate pipeline (Applied → Screening → Interview → Offer → Hired)
- AI-powered resume parsing
- Interview scheduling with scorecards
- Automated onboarding workflow on hire
- Quiz/assessment management

---

### Module 8: Operations & Maintenance (8 data models)

**For:** Facilities managers, maintenance engineers, calibration technicians

**Features:**
- Equipment asset register with full lifecycle tracking
- Preventive and corrective maintenance scheduling
- Calibration management with due date tracking
- HVAC monitoring (temperature, humidity, differential pressure)
- Fleet management
- Plant maintenance
- Maintenance order workflow (create → assign → execute → complete)

---

### Module 9: AI & Intelligence

**For:** All users

**Features:**
- AI chat assistant — ask questions about your data in natural language
- Pluggable AI providers (Claude, OpenAI, Ollama for on-premise)
- AI-driven insights and anomaly detection
- Demand forecasting
- Resume parsing (ATS)
- Call analysis (CRM)

---

### Module 10: Platform Services

**Cross-cutting capabilities that serve all modules:**

| Service | Description |
|---------|-------------|
| **Multi-tenancy** | Data isolation per organization; single deployment serves multiple clients |
| **Role-based access** | 9 pre-configured roles with granular permissions per module |
| **Audit trail** | Tamper-proof log of every create, update, delete action |
| **Approval workflows** | Configurable multi-level approval chains |
| **Notifications** | In-app, email, and SSE real-time notifications |
| **Webhooks** | Outbound event delivery to external systems |
| **Global search** | Full-text search across all entities |
| **GraphQL API** | Flexible querying for custom integrations and reporting |
| **REST API** | 220+ endpoints with OpenAPI documentation |
| **Data import/export** | CSV, Excel, PDF export on every list view |
| **Custom fields** | User-defined fields (text, number, date, select, boolean) per module |
| **Internationalization** | Multi-language support |
| **PWA + Offline** | Install as mobile app, works without internet |
| **E-invoicing** | Egyptian Tax Authority compliance |
| **Document management** | File uploads with S3 storage |
| **Scheduled reports** | Automated email delivery of reports |
| **Integration connectors** | Stripe (payments), SMTP (email), S3 (storage), extensible registry |

---

## Key Metrics & Numbers

| Metric | Value |
|--------|-------|
| Database models | 120 |
| API endpoints | 220+ |
| Dashboard pages | 154 |
| Business enums | 61 |
| QA/QC sub-modules | 18 |
| User roles | 9 |
| Test cases | 700+ (automated) |
| TypeScript errors | 0 |
| Offline capable | Yes (PWA) |
| Multi-tenant | Yes |
| AI providers supported | 3 (Claude, OpenAI, Ollama) |
| Export formats | PDF, Excel, CSV |

---

## Target Customer Segments

### Primary Market
1. **Mid-size pharma companies (100-5000 employees)** — Currently using fragmented systems (SAP + Veeva + paper QMS)
2. **Pharma distributors** — Need inventory (FEFO), CRM, and finance in one system
3. **Contract manufacturers (CMOs)** — Need batch records, quality, and client billing
4. **Generic pharma companies** — Price-sensitive, need full ERP without SAP cost

### Secondary Market
5. **Biotech startups** — Growing companies that need scalable systems from day one
6. **Medical device companies** — ISO 13485 compliance with similar quality needs
7. **Nutraceutical companies** — GMP-adjacent quality requirements
8. **Chemical manufacturing** — Batch traceability and quality management

### Geographic Focus
- **MENA region** — Arabic language support, Egyptian e-invoicing compliance
- **Southeast Asia** — Emerging pharma markets with growing GMP requirements
- **Sub-Saharan Africa** — WHO prequalification requirements driving digital adoption

---

## User Personas & Journeys

### Persona 1: Medical Representative (Ahmad)
**Goal:** Complete daily doctor visits efficiently and hit monthly KPIs
**Journey:**
1. Opens PWA on phone → views today's visit plan
2. Navigates to first doctor → GPS logs arrival
3. Opens doctor profile → reviews last interaction and product focus
4. Conducts visit → logs products discussed, samples given, next steps
5. Submits market request for product samples → routes to BUM for approval
6. At day end → views KPI dashboard (visits completed, coverage %)
7. On train home (no internet) → adds notes to visits → auto-syncs later

### Persona 2: QA Manager (Dr. Sarah)
**Goal:** Maintain GMP compliance and pass regulatory audits with zero critical findings
**Journey:**
1. Logs in → dashboard shows 3 open deviations, 2 pending CAPAs, upcoming audit
2. Opens deviation #DEV-2024-089 → reviews investigation, assigns root cause
3. Creates CAPA linked to deviation → defines 4 corrective actions with owners
4. Checks environmental monitoring → sees temperature excursion in Clean Room B
5. Opens excursion → reviews trend chart → initiates impact assessment
6. Prepares for FDA audit → generates deviation trending report (PDF)
7. Reviews batch release queue → approves 2 batches after QC review

### Persona 3: CFO (Khalid)
**Goal:** Close monthly books on time and maintain cash flow visibility
**Journey:**
1. Logs in → finance dashboard shows AR aging, AP due, cash position
2. Reviews 15 invoices pending approval → approves 12, returns 3 with comments
3. Opens three-way matching queue → 8 POs matched automatically, 2 need review
4. Runs budget vs. actual report → exports to Excel for board presentation
5. Reviews payroll for 200 employees → approves processing
6. Checks treasury dashboard → monitors bank balances across 3 accounts

### Persona 4: Warehouse Manager (Omar)
**Goal:** Zero stock-outs, zero expired products shipped
**Journey:**
1. Logs in → expiry dashboard shows 5 items expiring in 30 days
2. Moves near-expiry items to quarantine zone
3. Receives goods against PO-2024-156 → logs quality inspection results
4. Processes 3 sales orders → system suggests FEFO picking sequence
5. Prints delivery notes → assigns to courier
6. End of day → reviews stock movement summary

### Persona 5: HR Director (Fatima)
**Goal:** Streamline hiring and ensure training compliance
**Journey:**
1. Reviews ATS dashboard → 5 open positions, 23 candidates in pipeline
2. AI parses 8 new resumes → pre-screens qualifications
3. Schedules 3 interviews → sends calendar invites
4. Opens onboarding for 2 new hires → assigns 15-step checklist
5. Checks training matrix → 12 employees need GMP refresher
6. Runs leave balance report → identifies carryover issues

### Persona 6: Production Manager (Tariq)
**Goal:** Meet production schedule with zero batch failures
**Journey:**
1. Reviews work order queue → 3 batches scheduled today
2. Opens Batch Record #BR-2024-445 → starts step-by-step execution
3. Records in-process measurements at checkpoint 3
4. Detects deviation at Step 7 → creates deviation record linked to batch
5. Completes remaining steps → submits batch for QA release
6. Checks BOM for tomorrow's production → verifies material availability

---

## Competitive Landscape

| Competitor | Price/yr | Pharma CRM | QMS | Finance | MES | HR | Offline |
|-----------|----------|-----------|-----|---------|-----|-----|---------|
| SAP S/4HANA | $500K-5M | Add-on | Add-on | Yes | Add-on | Yes | No |
| Oracle Fusion | $300K-2M | Add-on | No | Yes | Add-on | Yes | No |
| Veeva CRM + QualityOne | $200K-1M | Yes | Yes | No | No | No | Partial |
| MasterControl | $100K-500K | No | Yes | No | No | No | No |
| Odoo Enterprise | $50K-200K | Generic | No | Yes | Basic | Yes | No |
| **PharmaERP** | **$X-XX/user/mo** | **Yes** | **Yes (18 modules)** | **Yes** | **Yes** | **Yes** | **Yes** |

### Key Differentiators
1. **All-in-one** — Replaces 3-5 separate systems (CRM + QMS + ERP + MES + HR)
2. **Pharma-native** — Not a generic ERP adapted for pharma; built for GxP from day one
3. **Rapid deployment** — Days/weeks, not months/years (SaaS model, pre-configured)
4. **Offline-first mobile** — PWA with offline sync, critical for field force
5. **AI-native** — Built-in AI chat, insights, and forecasting
6. **Modern UX** — Consumer-grade UI vs. legacy ERP interfaces
7. **Open architecture** — REST + GraphQL APIs, webhooks, integration connectors
8. **Cost** — 70-90% lower than SAP/Oracle; no per-module licensing

---

## Business Model

### SaaS Pricing (Suggested Tiers)

| Tier | Users | Modules | Price |
|------|-------|---------|-------|
| **Starter** | Up to 25 | CRM + Finance + Inventory | $X/user/month |
| **Professional** | Up to 100 | All modules | $X/user/month |
| **Enterprise** | Unlimited | All modules + custom dev + SLA | Custom pricing |

### Revenue Streams
1. **Subscription** (recurring) — Per-user monthly/annual SaaS fees
2. **Implementation** (one-time) — Setup, data migration, training
3. **Customization** (project) — Custom modules, integrations, reports
4. **Support** (recurring) — Premium SLA with dedicated support
5. **Marketplace** (future) — Third-party module marketplace

---

## Security & Compliance

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT sessions with MFA support |
| Authorization | Role-based access control (9 roles, per-module permissions) |
| Data encryption | AES-256-GCM field-level encryption for sensitive data |
| Transport | TLS 1.3 enforced |
| CSRF protection | Token-based CSRF validation on all state-changing requests |
| Security headers | CSP, X-Frame-Options, X-XSS-Protection, HSTS |
| Audit trail | Immutable log of every data change (who, what, when) |
| Tenant isolation | Row-level security via tenantId on every record |
| Password policy | Configurable complexity, expiry, history |
| Input validation | Zod runtime validation on all 220+ API endpoints |
| Rate limiting | Per-endpoint rate limiting headers |
| Secrets management | Environment-based, no hardcoded credentials |

---

## Scalability & Infrastructure

- **Horizontal scaling** — Stateless application tier, scale with Docker replicas or serverless (Vercel)
- **Database** — PostgreSQL with connection pooling (PgBouncer), read replicas for reporting
- **Caching** — Redis for sessions, query cache, job queues
- **CDN** — Static assets served via edge network (Vercel/Cloudflare)
- **CI/CD** — GitHub Actions pipeline: lint → type-check → test (700 tests) → build → deploy
- **Monitoring** — Sentry for error tracking, health endpoint for uptime monitoring

---

## Traction & Validation (Adapt to your actual metrics)

- **[X] organizations** onboarded in pilot
- **[X] daily active users** across field force
- **[X] quality records** managed (deviations, CAPAs, audits)
- **[X]% reduction** in audit preparation time vs. paper-based systems
- **[X] hours saved** per month per rep through automated visit planning
- **Zero** critical audit findings since platform deployment

---

## Roadmap (Suggested)

| Quarter | Milestone |
|---------|-----------|
| **Q3 2026** | AI-powered deviation prediction, automated CAPA recommendations |
| **Q4 2026** | Electronic signatures (21 CFR Part 11 full compliance), validation package |
| **Q1 2027** | Regulatory submission module (eCTD), clinical trial supply management |
| **Q2 2027** | IoT integration (lab instruments, environmental sensors), digital twin |
| **Q3 2027** | Marketplace for third-party modules and integrations |
| **Q4 2027** | Multi-region deployment (EU data residency, MENA, APAC) |

---

## Team Requirements (Suggested for Pitch Deck)

| Role | Purpose |
|------|---------|
| CEO/Founder | Domain expertise in pharma + tech |
| CTO | Full-stack architecture, has built the platform |
| VP Sales | Pharma industry relationships |
| Head of Quality | GxP consulting and validation services |
| Customer Success | Implementation and onboarding |

---

## USAGE INSTRUCTIONS

Now that you have the complete product brief, you can ask me to create any of the following:

1. **Investor pitch deck** (12-15 slides) — Problem, solution, market, product, traction, team, financials, ask
2. **Technical paper** — Architecture deep-dive for CTO/CIO audience
3. **Sales one-pager** — Single-page product overview for trade shows
4. **Client proposal** — Customized proposal for a specific prospect
5. **Competitive analysis** — Detailed comparison with specific competitors
6. **ROI calculator narrative** — Cost-benefit analysis for buyers
7. **Product demo script** — Guided walkthrough for live demos
8. **Press release** — Launch announcement
9. **Case study template** — Framework for customer success stories
10. **RFP response** — Template for responding to procurement requests

Tell me which deliverable you need, the target audience, and any specific context (e.g., "pitch deck for Series A targeting $3M raise" or "technical paper for a hospital group CIO"). I'll create it immediately.

## PROMPT END
