# Phase 0 Salvage — Domain Vocabulary

> Source: `prisma/schema.prisma` enums + state-machine catalogs from
> `src/lib/quality/*-store.ts` and `src/app/api/v1/**/[id]/status/route.ts`.
> Auto-generated; re-run `scripts/salvage-schema.sh` after schema changes.

The Phase 0 ERP repo encoded the Egyptian pharma domain in **67 enums**
and several state-machine maps.

> **Doctrine v2 (2026-05-12).** State-machine maps below were
> marked corrupted by the operator and should be re-derived in
> Phase 1. The enums below describe the **pharma vertical only**;
> Phase 1 (multi-industry) needs a broader baseline vocabulary,
> captured in the cross-industry section that follows. Use this
> doc's pharma section as input to the pharma vertical pack only.

## Cross-industry vocabulary expansion (v2)

The Phase 1 vision is a multi-industry ERP with pharma as one
verticalization. This section adds the vocabulary needed for that
broader scope. Use it when scaffolding non-pharma modules.

### Process language (the seven processes ERP automates)

- **O2C — Order-to-Cash.** Quote → Sales Order → Pick → Pack → Ship
  → Invoice → Payment → Dunning → Cash Application.
- **P2P — Procure-to-Pay.** Requisition → RFQ → PO → Goods Receipt
  → Three-Way Match → Bill → Payment.
- **R2R — Record-to-Report.** Journal entry → GL posting →
  Subledger close → Period close → Trial balance → Financial
  statement → Disclosure.
- **H2R — Hire-to-Retire.** Requisition → Job posting → Application
  → Interview → Offer → Hire → Onboarding → Payroll → Performance
  → Leave → Offboarding.
- **L2C — Lead-to-Cash.** Lead → MQL → SQL → Opportunity → Quote
  → Contract → Order (joins O2C from here).
- **P2I — Plan-to-Inventory.** Demand forecast → MPS → MRP →
  Work order → Production → Lot / serial → Stock.
- **I2R — Issue-to-Resolution.** Ticket → Triage → SLA → Resolution
  → Root cause → Knowledge base.

Modules align to these processes; events across the seven processes
are the spine of a tenant's audit log.

### Cross-cutting platform vocabulary

| Term | Meaning |
|---|---|
| Tenant | Top-level isolation boundary (typically one company / customer) |
| Workspace | Optional sub-tenant for sandboxing (preview env, training) |
| Business Unit / Cost Center | Internal financial / org subdivisions of a tenant |
| Location / Site | Physical place (HQ, branch, warehouse, plant) |
| Multi-currency / FX | Multiple currencies per tenant with daily FX rates |
| Tax jurisdiction / Tax code | Where + how a transaction is taxed |
| Approval chain | Sequenced approvers for an action (configurable per tenant) |
| Workflow | Stateful business process with transitions + side effects |
| SLA | Service Level Agreement; deadline-bound work tracking |
| KPI | Key Performance Indicator with target + actual |
| Dimension | Slice axis on a metric (period, region, product, team) |
| Audit log | Immutable append-only record of every meaningful action |
| Retention policy | How long records of each type are kept |
| E-signature | 21 CFR Part 11-compliant signature (pharma req'd, others nice-to-have) |
| Field-level encryption | Encryption at rest of selected columns (PII, PHI) |
| Soft delete | `deletedAt` column instead of row removal |
| Row-level security (RLS) | Postgres policies enforcing per-tenant + per-user data access |
| ABAC | Attribute-Based Access Control: rules over (user, resource, action, context) |
| Idempotency key | Client-supplied key making repeated writes safe |
| Outbox pattern | Atomic event-publish from a transactional DB |
| Webhook | Outbound HTTP callback to a customer URL on a tenant event |
| Connector | Adapter between the platform and an external system |

### MENA + Egyptian business vocabulary

The Phase 1 platform's first market is Egypt; Arabic and Egyptian
business conventions are first-class:

| Term | Meaning |
|---|---|
| ETA | Egyptian Tax Authority; runs the national e-invoicing portal |
| ETA e-invoice | Mandatory electronic invoice format for B2B in Egypt |
| EGP | Egyptian Pound; primary currency |
| VAT | Value-Added Tax; 14% standard, 5% reduced, 0% exempt categories |
| WHT | Withholding tax (on services, professional fees, etc.) |
| Stamp duty | Fixed-fee tax on specific documents |
| Tax Card | Government-issued tax ID for businesses |
| CR / Commercial Register | National business registration number |
| Governorate | Top-level administrative division (Cairo, Giza, Alexandria, ...) |
| Free zone | Industrial / commercial zone with tax incentives |
| 10th of Ramadan / 6th of October | Major industrial cities outside Cairo |
| Smart Village | Tech / office park west of Cairo |
| Mohandessin / Maadi / Heliopolis / Zamalek | Cairo business districts |
| Customs declaration | Required for cross-border movement |
| Sharia compliance | Optional finance configuration (no interest, halal supply chain) |
| Arabic / RTL | Right-to-left text layout for Arabic UI |
| Hijri calendar | Optional secondary calendar (Saudi / Gulf customers) |
| Ramadan adjustment | Working-hour + workflow adjustments during Ramadan month |

Future MENA expansion: Saudi (Zakat + VAT 15%, ZATCA e-invoicing),
UAE (VAT 5% + free zones, FTA e-invoicing roadmap), Jordan,
Lebanon, Gulf states.

### Vertical vocabulary placeholders

Phase 1 modules per vertical add their own vocabularies. Stubs:

- **Pharma vertical** — see existing enum dump below + the
  Egyptian pharma reference in doc 06. Adds: ABC doctor
  classification, buying ladder, market requests, samples,
  batch traceability, GMP, CAPA, deviations, recall classes.
- **Distribution vertical** — route plan, delivery sequence,
  cash van, COD (cash on delivery), cold chain, dock-door
  scheduling, proof of delivery, return-merchandise.
- **Manufacturing vertical** — work order, BOM (bill of
  materials), routing, takt time, WIP (work-in-progress),
  OEE (overall equipment effectiveness), scrap %, yield.
- **Retail vertical** — SKU, POS, register, footfall,
  conversion, basket size, shrinkage, planogram.
- **Healthcare vertical** — patient, encounter, claim,
  diagnosis (ICD-10), procedure code, referral, payer,
  formulary.
- **Professional services vertical** — utilization, billable
  hours, realization rate, project margin, T&M
  (time-and-materials), fixed-price-vs-T&M.
- **Field service vertical** — work order, technician
  dispatch, route optimization, first-time-fix-rate,
  service contract.
- **B2B SaaS sales-ops vertical** — ARR, MRR, NRR, churn,
  expansion, ICP (ideal customer profile), territory.

When a Phase 1 vertical is built, append its vocabulary section
under "Vertical vocabulary placeholders" above.

## Pharma-vertical enums (67)

### `AuditStatus`

- PLANNED
- IN_PROGRESS
- COMPLETED
- CLOSED

### `AuditType`

- INTERNAL
- EXTERNAL
- SUPPLIER

### `BatchReleaseStatus`

- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED

### `BuyingLadderStage`

- UNAWARE
- AWARE
- TRIAL
- REGULAR
- CHAMPION

### `CAPAActionStatus`

- PENDING
- IN_PROGRESS
- COMPLETED
- OVERDUE

### `CAPAPriority`

- LOW
- MEDIUM
- HIGH
- CRITICAL

### `CAPAStatus`

- OPEN
- INVESTIGATION
- ACTION_PLAN
- IMPLEMENTATION
- VERIFICATION
- CLOSED

### `CAPAType`

- CORRECTIVE
- PREVENTIVE

### `ChangeControlStatus`

- INITIATED
- UNDER_REVIEW
- APPROVED
- IMPLEMENTED
- CLOSED
- REJECTED

### `ChangeControlType`

- DOCUMENT
- PROCESS
- EQUIPMENT
- SYSTEM

### `ChequeStatus`

- PENDING
- CLEARED
- BOUNCED
- CANCELLED
- VOIDED

### `ChequeType`

- ISSUED
- RECEIVED

### `CleaningValidationStatus`

- PENDING
- IN_PROGRESS
- PASSED
- FAILED

### `ComplaintSource`

- CUSTOMER
- INTERNAL
- REGULATORY

### `ComplaintStatus`

- RECEIVED
- UNDER_INVESTIGATION
- ROOT_CAUSE_IDENTIFIED
- CAPA_INITIATED
- CLOSED

### `DeliveryNoteStatus`

- DRAFT
- DISPATCHED
- IN_TRANSIT
- DELIVERED
- RETURNED

### `DeviationSeverity`

- CRITICAL
- MAJOR
- MINOR

### `DeviationStatus`

- OPEN
- UNDER_INVESTIGATION
- CAPA_REQUIRED
- CLOSED

### `DeviationType`

- PLANNED
- UNPLANNED

### `DoctorClassification`

- A
- B
- C
- D

### `EnvironmentalParameter`

- TEMPERATURE
- HUMIDITY
- PARTICLE_COUNT
- MICROBIAL
- DIFFERENTIAL_PRESSURE

### `EquipmentStatus`

- OPERATIONAL
- MAINTENANCE
- CALIBRATION
- RETIRED

### `ExpenseStatus`

- DRAFT
- SUBMITTED
- APPROVED
- REJECTED
- PAID

### `FindingSeverity`

- CRITICAL
- MAJOR
- MINOR
- OBSERVATION

### `FindingStatus`

- OPEN
- IN_PROGRESS
- CLOSED

### `FiscalPeriodStatus`

- OPEN
- CLOSED
- LOCKED

### `GoodsReceiptStatus`

- PENDING
- PARTIAL
- COMPLETED
- REJECTED

### `HVACStatus`

- NORMAL
- WARNING
- CRITICAL

### `ManufacturingBatchStatus`

- IN_PROGRESS
- COMPLETED
- UNDER_REVIEW
- RELEASED
- REJECTED

### `MonitoringStatus`

- WITHIN_SPEC
- OUT_OF_SPEC
- ALERT

### `OOSStatus`

- INITIATED
- CONCLUDED
- CLOSED

### `PlanStatus`

- DRAFT
- SUBMITTED
- APPROVED
- REJECTED

### `QDocumentStatus`

- DRAFT
- UNDER_REVIEW
- APPROVED
- EFFECTIVE
- OBSOLETE

### `QDocumentType`

- SOP
- PROTOCOL
- FORM
- REPORT
- SPECIFICATION

### `RFQStatus`

- DRAFT
- SENT
- RECEIVED
- EVALUATED
- AWARDED
- CANCELLED

### `RecallStatus`

- INITIATED
- IN_PROGRESS
- COMPLETED
- CLOSED

### `RecallType`

- CLASS_I
- CLASS_II
- CLASS_III

### `RequestStatus`

- PENDING
- APPROVED
- REJECTED
- FULFILLED

### `RequestType`

- SAMPLE
- LITERATURE
- EVENT
- DISCOUNT
- DOCTOR_EDIT
- OTHER

### `RiskAssessmentStatus`

- DRAFT
- IN_PROGRESS
- COMPLETED
- APPROVED

### `RiskAssessmentType`

- PROCESS
- PRODUCT
- EQUIPMENT
- FACILITY

### `RiskLevel`

- LOW
- MEDIUM
- HIGH
- CRITICAL

### `RiskMethodology`

- FMEA
- HACCP
- FTA
- PHA

### `SPCChartType`

- XBAR_R
- XBAR_S
- P_CHART
- C_CHART
- U_CHART
- INDIVIDUAL_MR

### `SPCStatus`

- ACTIVE
- IN_CONTROL
- OUT_OF_CONTROL

### `ShipmentMode`

- OCEAN
- AIR
- GROUND
- RAIL

### `ShipmentStatus`

- PLANNED
- IN_TRANSIT
- DELIVERED
- DELAYED
- CANCELLED

### `ShipmentType`

- INBOUND
- OUTBOUND

### `StabilityStatus`

- PLANNED
- ONGOING
- COMPLETED
- CANCELLED

### `SupplierQualityStatus`

- APPROVED
- CONDITIONAL
- PROBATION
- DISQUALIFIED

### `TaskPriority`

- LOW
- MEDIUM
- HIGH
- URGENT

### `TaskStatus`

- TODO
- IN_PROGRESS
- DONE
- BLOCKED

### `TaxType`

- VAT
- SALES_TAX
- INCOME_TAX
- WITHHOLDING

### `TerritoryLevel`

- REGION
- GOVERNORATE
- DISTRICT
- BRICK

### `ThreeWayMatchStatus`

- PENDING
- MATCHED
- DISCREPANCY
- RESOLVED

### `TimepointStatus`

- PENDING
- COMPLETED
- MISSED

### `TraceabilityDirection`

- FORWARD
- BACKWARD

### `TrainingRecordStatus`

- ASSIGNED
- IN_PROGRESS
- COMPLETED
- OVERDUE
- EXPIRED

### `UserRole`

- ADMIN
- NSM
- BUM
- MARKETEER
- DISTRICT_MANAGER
- MEDICAL_REP
- ACCOUNTANT
- WAREHOUSE
- HR

### `VisitSession`

- AM
- PM

### `VisitStatus`

- LOGGED
- APPROVED
- REJECTED

### `VisitType`

- SINGLE
- DOUBLE

### `WarehouseZoneStatus`

- ACTIVE
- INACTIVE
- MAINTENANCE

### `WarehouseZoneType`

- RECEIVING
- STORAGE
- PICKING
- PACKING
- SHIPPING
- QUARANTINE
- COLD_CHAIN

### `WaterParameter`

- TOC
- CONDUCTIVITY
- PH
- ENDOTOXIN
- MICROBIAL

### `WaterReadingStatus`

- PASS
- FAIL
- ALERT

### `WaterSystem`

- PURIFIED_WATER
- WFI
- CLEAN_STEAM

## State machines from API routes

These are the transition maps copied from the migrated status routes
(Track B7 part 2). Phase 1 should preserve the same allowed-transition
shape unless the workflow changes.

### Invoice status (`src/app/api/v1/finance/invoices/[id]/status/route.ts`)

```
DRAFT     -> SENT, CANCELLED
SENT      -> PAID, CANCELLED, OVERDUE
OVERDUE   -> PAID, CANCELLED
PAID      -> (terminal)
CANCELLED -> (terminal)
```

### Bill status (`.../finance/bills/[id]/status/route.ts`)

```
DRAFT            -> PENDING_APPROVAL, CANCELLED
PENDING_APPROVAL -> APPROVED, REJECTED
APPROVED         -> PAID, CANCELLED
REJECTED         -> DRAFT
PAID, CANCELLED  -> (terminal)
```

Side effects: when transitioning to APPROVED with `approvedBy`,
`approvedAt = now()` is set. When transitioning to REJECTED with
`rejectionReason`, the reason is persisted.

### Leave request status (`.../hr/leave-requests/[id]/status/route.ts`)

```
PENDING   -> APPROVED, REJECTED, WITHDRAWN
APPROVED  -> CANCELLED
REJECTED, CANCELLED, WITHDRAWN -> (terminal)
```

Side effects: APPROVED with `approverId` sets `approvedAt`; REJECTED
with `rejectionReason` persists it.

### Deal pipeline stage (`.../crm/deals/[id]/status/route.ts`)

Note: uses `stage` not `status` as the column name.

```
LEAD        -> QUALIFIED, CLOSED_LOST
QUALIFIED   -> PROPOSAL, LEAD, CLOSED_LOST
PROPOSAL    -> NEGOTIATION, QUALIFIED, CLOSED_LOST
NEGOTIATION -> CLOSED_WON, CLOSED_LOST, PROPOSAL
CLOSED_WON  -> (terminal)
CLOSED_LOST -> LEAD            (re-engagement allowed)
```

Side effects: CLOSED_LOST sets `lostReason`; either close terminal
sets `actualCloseDate`; any transition with `notes` appends to
`stageNotes`.

### CAPA status (`.../qaqc/capa/[id]/status/route.ts`)

```
OPEN           -> INVESTIGATION
INVESTIGATION  -> ACTION_PLAN, CLOSED
ACTION_PLAN    -> IMPLEMENTATION
IMPLEMENTATION -> VERIFICATION
VERIFICATION   -> CLOSED, IMPLEMENTATION
CLOSED         -> (terminal)
```

Note: this is a stricter linear flow than the others — investigation
must precede action plan, etc. The transitions encode the regulatory
expectation for corrective-and-preventive action workflows.

## Egyptian pharma reference data (from `prisma/seed.ts`)

The seed file contains hard-coded references that capture the local
market. These should carry forward as the seed for the Phase 1
demo tenant.

### Customer accounts (10)

Hospitals + retail pharmacy chains + distributors:

- **Hospitals:** Kasr El-Aini Hospital, Ain Shams University Hospital,
  Alexandria University Hospital, Mansoura University Hospital,
  Assiut University Hospital
- **Retail pharmacy chains:** El-Ezaby Pharmacy Chain, Seif Pharmacies,
  Roshdy Pharmacy Group
- **Distributors:** IBNSINA Pharma Distribution, Pharma Overseas

### Roles (UserRole enum)

- ADMIN
- NSM       (National Sales Manager)
- BUM       (Business Unit Manager)
- MARKETEER
- DISTRICT_MANAGER
- MEDICAL_REP
- ACCOUNTANT
- WAREHOUSE
- HR

### Territories

Egypt-North, Egypt-Central, Egypt-National, plus per-rep regions like
Giza, Cairo North, etc.

### Doctor classification (`DoctorClassification`)

A, B, C — the standard ABC pharma-rep customer-classification system.

### Buying-ladder stages (`BuyingLadderStage`)

UNAWARE -> AWARE -> TRIAL -> REGULAR -> CHAMPION

This is the marketing funnel-to-prescriber stage model. Worth keeping.
