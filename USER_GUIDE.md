# PharmaERP — User Guide

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard & Navigation](#2-dashboard--navigation)
3. [CRM Module](#3-crm-module)
4. [Quality Assurance (QAQC)](#4-quality-assurance-qaqc)
5. [Finance & Accounting](#5-finance--accounting)
6. [Inventory & Supply Chain](#6-inventory--supply-chain)
7. [Manufacturing](#7-manufacturing)
8. [HR & People](#8-hr--people)
9. [Applicant Tracking (ATS)](#9-applicant-tracking-ats)
10. [Operations & Maintenance](#10-operations--maintenance)
11. [Administration](#11-administration)
12. [AI Features](#12-ai-features)
13. [Mobile & Offline Use](#13-mobile--offline-use)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)
15. [Roles & Permissions](#15-roles--permissions)

---

## 1. Getting Started

### Logging In

1. Navigate to `https://your-domain.com/login`
2. Enter your email and password
3. If MFA is enabled, enter the verification code
4. You will be redirected to the dashboard

### First-Time Setup (Admin)

1. Log in with the admin account created during deployment
2. Go to **Admin > Tenants** — configure your organization
3. Go to **Admin > Users** — create user accounts for your team
4. Assign roles to each user (see [Roles & Permissions](#15-roles--permissions))
5. Go to **Settings** — configure system preferences

---

## 2. Dashboard & Navigation

### Main Dashboard

The dashboard shows key metrics at a glance:
- **KPI cards** — revenue, active orders, pending approvals, alerts
- **Charts** — trend lines, pie charts, bar graphs (Recharts)
- **Recent activity** — latest actions across all modules
- **Alerts panel** — expiring items, overdue tasks, compliance warnings

### Navigation Structure

The sidebar organizes modules into hubs:

| Hub | Modules |
|-----|---------|
| **CRM** | Doctors, Visits, Leads, Opportunities, Accounts, Contacts, Campaigns, Tickets, Loyalty |
| **Finance** | Invoices, Bills, Payments, Journal Entries, Budgets, Cost Centers, Treasury, Tax |
| **Quality** | Deviations, CAPA, Audits, Change Control, Complaints, Recalls, SPC, Stability, Training |
| **Supply Chain** | Purchase Orders, Inventory, Warehouses, Shipments, Vendor Scoring |
| **HR** | Employees, Leave, Attendance, Payroll, Performance, Training |
| **Operations** | Equipment, HVAC, Plant Maintenance, Fleet |
| **Manufacturing** | Work Orders, Batch Records, Bill of Materials, MES |
| **ATS** | Jobs, Candidates, Interviews, Onboarding |
| **Admin** | Users, Audit Log, Webhooks, Database, API |

### Global Search

Press `Ctrl+K` (or `Cmd+K` on Mac) to open global search. Search across all entities — customers, invoices, products, deviations, and more. Results show relevance-ranked matches with highlighted terms.

---

## 3. CRM Module

### Doctor Management

**For Medical Representatives:**

1. **View your doctors** — Navigate to CRM > Doctors
2. **Add a doctor** — Click "New Doctor", fill in specialization, classification (A/B/C), hospital, and contact info
3. **Plan visits** — Go to CRM > Weekly Plan, create a plan, add doctors to visit each day
4. **Record visits** — After visiting, log the visit with type (detail, follow-up, group), products discussed, samples delivered, and notes
5. **Track KPIs** — View your visit completion rate, coverage, and frequency

**For Business Unit Managers (BUM):**

1. **Team overview** — CRM > My Team shows all reps and their performance
2. **Approve requests** — Market requests from reps appear in your approval queue
3. **Territory management** — CRM > Territories to assign areas to reps

**For National Sales Managers (NSM):**

1. **National dashboard** — CRM > NSM shows aggregate metrics
2. **District comparison** — Compare performance across districts
3. **Campaign management** — CRM > Campaigns to launch marketing initiatives

### Leads & Opportunities

1. Navigate to CRM > Leads
2. **Create lead** — Enter contact info, source, and initial notes
3. **Qualify lead** — Update status as you engage (New → Contacted → Qualified → Converted)
4. **Convert to opportunity** — When qualified, convert to an Opportunity with estimated value and close date
5. **Pipeline view** — CRM > Opportunities shows your sales pipeline with stages

### Customer 360

CRM > Customer 360 gives a complete view of any customer:
- Contact details and history
- All interactions and visits
- Open orders and invoices
- Support tickets
- Loyalty program status

### Field Service

- **GPS tracking** — Real-time location of field reps
- **Route optimization** — Suggested visit routes
- **Offline sync** — Log visits even without internet, data syncs when back online

---

## 4. Quality Assurance (QAQC)

### Deviation Management

1. Navigate to QAQC > Deviations
2. **Report deviation** — Click "New Deviation", select type (Planned/Unplanned), severity, and describe the issue
3. **Investigate** — Assign investigator, document root cause analysis
4. **Link CAPA** — If corrective action needed, create or link a CAPA
5. **Close** — After investigation and CAPA, close the deviation with conclusion

### CAPA (Corrective & Preventive Action)

1. Navigate to QAQC > CAPA
2. **Initiate** — Create CAPA linked to a deviation, complaint, or audit finding
3. **Define actions** — Add corrective and preventive action items with owners and due dates
4. **Track progress** — Monitor action completion percentages
5. **Effectiveness check** — After implementation, verify the CAPA was effective
6. **Close** — Document final assessment

### Audit Management

1. Navigate to QAQC > Audit Management
2. **Schedule** — Create audit with type (Internal/External/Regulatory), scope, and dates
3. **Assign auditors** — Select lead auditor and team
4. **Record findings** — Log observations, minor findings, major findings, critical findings
5. **Follow up** — Link findings to CAPAs for resolution
6. **Reports** — Generate audit summary reports

### Environmental Monitoring

1. Navigate to QAQC > Environmental Monitoring
2. **Dashboard** — View real-time readings across all monitoring points
3. **Record reading** — Select location, point, and parameter, enter value
4. **Excursion alerts** — System automatically flags out-of-limit readings
5. **Trend analysis** — View 7/14/30/60/90-day trends per monitoring point
6. **Resolve excursions** — Investigate and document corrective actions

### SPC Charts

1. Navigate to QAQC > SPC Charts
2. **Create chart** — Select process parameter, set control limits
3. **Add data points** — Enter measurements over time
4. **Western Electric rules** — System automatically checks for rule violations
5. **Capability analysis** — View Cp, Cpk, Pp, Ppk indices

### Other QAQC Modules

| Module | Purpose |
|--------|---------|
| **Change Control** | Manage changes to processes, equipment, materials |
| **Complaints** | Track customer complaints through investigation to resolution |
| **Recalls** | Manage product recalls with batch tracking and retrieval |
| **OOS Investigation** | Out-of-Specification investigation workflow |
| **Stability Studies** | Long-term and accelerated stability testing |
| **Risk Assessment** | FMEA, HACCP, and risk matrix assessments |
| **Cleaning Validation** | Cleaning protocol management and residue limits |
| **Water System** | Purified/WFI water monitoring |
| **Document Control** | SOP and document lifecycle management |
| **Training Matrix** | Employee training records and competency tracking |
| **Batch Release** | QP release workflow for manufactured batches |

---

## 5. Finance & Accounting

### Invoicing

1. Navigate to Finance > Invoices
2. **Create invoice** — Select customer, add line items with quantities and prices
3. **E-invoicing** — For Egyptian compliance, enable e-invoice generation
4. **Send** — Email invoice directly from the system
5. **Track payment** — Mark as paid when payment received
6. **PDF export** — Download professional PDF invoices

### Bill Management

1. Navigate to Finance > Bills
2. **Enter bill** — Record supplier invoices with line items
3. **Three-way matching** — System matches bill against PO and goods receipt
4. **Approve** — Route through approval workflow
5. **Schedule payment** — Set payment date

### Journal Entries

1. Navigate to Finance > Journal Entries
2. **Create entry** — Select accounts, enter debits and credits
3. **Balanced check** — System ensures debits equal credits
4. **Post** — Post to general ledger

### Chart of Accounts

- Navigate to Finance > Accounting
- View and manage your full chart of accounts
- Standard pharma chart of accounts pre-configured
- Custom accounts can be added under any category

### Budgeting

1. Navigate to Finance > Budgets
2. **Create budget** — Set budget by department, cost center, or project
3. **Line items** — Break down by GL account
4. **Track actuals** — Compare budgeted vs actual spending
5. **Variance analysis** — Identify over/under-budget areas

---

## 6. Inventory & Supply Chain

### Product Management

1. Navigate to Inventory > Products
2. **Add product** — Enter SKU, name, category, unit of measure, pricing
3. **Batch tracking** — Enable lot/batch tracking for regulated products
4. **Expiry management** — Set expiry monitoring parameters

### Warehouse Management

1. Navigate to Inventory > Warehouses
2. **Zones** — Configure zones (ambient, cold chain, quarantine, hazardous)
3. **Stock movements** — Track inbound, outbound, and internal transfers
4. **Bin locations** — Organize inventory by shelf and bin

### Expiry Management (FEFO)

1. Navigate to Inventory > Expiry Management
2. **Dashboard** — View expired, near-expiry, and critical items
3. **FEFO picking** — First Expiry First Out picking suggestions
4. **Auto-quarantine** — Automatically quarantine expired items
5. **Alerts** — Configurable alerts at 90/60/30 day thresholds
6. **Policies** — Set per-product expiry policies

### Procurement

1. Navigate to Procurement > Purchase Orders
2. **Create PO** — Select supplier, add items, set delivery date
3. **Approval** — Route through approval chain based on value
4. **Receive goods** — Record goods receipt with quality inspection
5. **Three-way matching** — Automatic PO ↔ GR ↔ Invoice matching

### Vendor Scoring

1. Navigate to Procurement > Vendor Scoring
2. **Score vendors** — Rate quality, delivery, compliance, and commercial metrics
3. **Qualification status** — Approved, Conditional, Suspended, Blocked
4. **Trend tracking** — Monitor vendor performance over time

---

## 7. Manufacturing

### Work Orders

1. Navigate to Manufacturing > Work Orders
2. **Create work order** — Select product, BOM, planned quantity, and schedule
3. **Material consumption** — Record actual materials used
4. **Production tracking** — Log production quantities and yield
5. **Quality checkpoints** — In-process quality checks

### Batch Records

1. Navigate to Manufacturing > Batch Records
2. **Electronic batch record** — Digital version of production batch record
3. **Step-by-step execution** — Follow manufacturing instructions
4. **Deviations** — Flag any deviations during production
5. **Review and approval** — QA review before batch release

### Bill of Materials

1. Navigate to Manufacturing > BOM
2. **Create BOM** — Define multi-level product structure
3. **Components** — Add raw materials, intermediates, packaging
4. **Versions** — Maintain BOM revision history
5. **Cost rollup** — Calculate product cost from components

---

## 8. HR & People

### Employee Management

- Navigate to HR > Employees
- Full employee profiles with department, position, reporting structure
- Document storage for contracts, certifications

### Leave Management

1. Navigate to HR > Leave
2. **Apply for leave** — Select type (annual, sick, personal), dates
3. **Approval** — Manager receives notification and approves/rejects
4. **Balance tracking** — View remaining leave balance by type

### Attendance

- Navigate to HR > Attendance
- Daily attendance records
- Late arrivals and early departures tracking

### Payroll

- Navigate to HR > Payroll
- Monthly payroll processing
- Deductions, allowances, and net pay calculation
- Payslip generation (PDF)

---

## 9. Applicant Tracking (ATS)

### Job Postings

1. Navigate to ATS > Jobs
2. **Create job** — Title, department, requirements, salary range
3. **Publish** — Post to careers page

### Candidate Management

1. Navigate to ATS > Candidates
2. **Add candidate** — Enter details or parse resume automatically
3. **Pipeline** — Move through stages: Applied → Screening → Interview → Offer → Hired
4. **Resume parser** — AI-powered resume extraction

### Interviews

1. Navigate to ATS > Interviews
2. **Schedule** — Set date, interviewers, and type (phone/video/in-person)
3. **Scorecards** — Structured evaluation forms
4. **Feedback** — Interviewer notes and recommendations

### Onboarding

1. Navigate to ATS > Onboarding
2. **Checklist** — Pre-configured onboarding tasks
3. **Document collection** — Collect required documents
4. **Training assignment** — Auto-assign required training

---

## 10. Operations & Maintenance

### Equipment Management

1. Navigate to Operations > Equipment
2. **Asset register** — All equipment with specifications
3. **Calibration tracking** — Schedule and record calibrations
4. **Maintenance orders** — Preventive and corrective maintenance
5. **Status tracking** — Operational, Under Maintenance, Out of Service

### HVAC Monitoring

- Navigate to Operations > HVAC
- Temperature and humidity monitoring
- Alert thresholds for clean rooms
- Trend charts and compliance reports

---

## 11. Administration

### User Management

1. Navigate to Admin > Users
2. **Create users** — Add email, name, assign role and department
3. **Deactivate** — Disable access without deleting records
4. **Password policy** — Minimum length, complexity, expiry

### Audit Log

- Navigate to Admin > Audit Log
- Complete trail of all system actions
- Filter by user, action type, date range, module
- Tamper-proof — records cannot be modified or deleted

### Webhooks

1. Navigate to Admin > Webhooks
2. **Register** — Set URL, select events to subscribe to
3. **Test** — Send test payload to verify endpoint
4. **Monitor** — View delivery history, success/failure rates

### API Management

- Navigate to Admin > API
- View API tokens
- OpenAPI documentation at `/api/v1/docs`
- GraphQL playground at `/api/v1/graphql`

---

## 12. AI Features

### AI Chat Assistant

1. Navigate to AI
2. Ask questions about your data in natural language
3. Get insights, summaries, and recommendations
4. Supports: inventory analysis, financial summaries, compliance checks

### AI Insights

- Navigate to AI > Insights
- Automated anomaly detection
- Trend predictions
- Suggested actions based on data patterns

---

## 13. Mobile & Offline Use

### Progressive Web App (PWA)

1. Open the app in Chrome/Safari on your mobile device
2. Tap "Add to Home Screen" when prompted
3. The app works like a native mobile app

### Offline Mode

- **Data caching** — Recently viewed data is available offline
- **Offline actions** — Create visits, log readings, submit forms offline
- **Auto-sync** — When back online, queued actions sync automatically
- **Conflict resolution** — Server-side timestamps resolve conflicts

---

## 14. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Global search |
| `Ctrl+N` | New record (context-dependent) |
| `Ctrl+S` | Save current form |
| `Escape` | Close dialog/modal |
| `?` | Show keyboard shortcuts help |

---

## 15. Roles & Permissions

| Role | Access Level |
|------|-------------|
| **ADMIN** | Full access to all modules, user management, system settings |
| **NSM** (National Sales Manager) | CRM oversight, all territories, campaign management |
| **BUM** (Business Unit Manager) | Team management, territory oversight, approvals |
| **DISTRICT_MANAGER** | District-level CRM, team supervision |
| **MARKETEER** | Campaign management, market analysis |
| **MEDICAL_REP** | Doctor visits, weekly plans, market requests |
| **ACCOUNTANT** | Finance module, invoicing, reporting |
| **WAREHOUSE** | Inventory, receiving, shipping |
| **HR** | Employee management, leave, payroll, recruitment |

### Permission Inheritance

- Each role has predefined read/write permissions per module
- Admins can customize permissions via Admin > Users
- Tenant isolation ensures data separation between organizations

---

## Data Export

All list views support:
- **CSV export** — Download filtered data as CSV
- **Excel export** — Formatted XLSX with headers
- **PDF export** — Professional reports with company branding
- **Print** — Browser print-optimized layouts

---

## Getting Help

- **In-app** — Click the help icon or press `?`
- **API docs** — Visit `/api/v1/docs` for OpenAPI specification
- **Admin support** — Contact your system administrator
