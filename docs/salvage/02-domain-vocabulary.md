# Phase 0 Salvage — Domain Vocabulary

> Source: `prisma/schema.prisma` enums + state-machine catalogs from
> `src/lib/quality/*-store.ts` and `src/app/api/v1/**/[id]/status/route.ts`.
> Auto-generated; re-run `scripts/salvage-schema.sh` after schema changes.

The Phase 0 ERP repo encoded the Egyptian pharma domain in **67 enums**
and several state-machine maps. Most should copy verbatim into Phase 1
unless there is a reason to rename. The state-machine maps are
particularly valuable — they encode workflow rules that took real
domain knowledge to design.

## Enums (67)

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
