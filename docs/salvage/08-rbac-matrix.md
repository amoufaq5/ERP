# Phase 0 Salvage — RBAC Matrix

> Source: `src/lib/api/rbac.ts` (`ROLE_PERMISSIONS` constant)
>
> The role-based access control table the ERP repo enforced at the
> API entity level. Phase 1 should preserve this matrix as the
> seed of the new permission system, even if the kernel adopts
> ABAC (per ADR-0008) on top.

## Roles defined

8 roles in the `UserRole` type (note: `NSM` exists in the schema enum
but is not in this RBAC type — schema is broader than what was
enforced):

| Role | Meaning |
|---|---|
| `ADMIN` | Tenant administrator |
| `BUM` | Business Unit Manager |
| `MARKETEER` | Marketing role |
| `DISTRICT_MANAGER` | District sales manager |
| `MEDICAL_REP` | Medical sales rep (field force) |
| `ACCOUNTANT` | Finance role |
| `WAREHOUSE` | Warehouse / logistics |
| `HR` | Human resources |

## Permission table

Each entity declares which roles can `read` and which can `write`.
Entities not listed default to "allow" (legacy behavior — Phase 1
should default to deny).

### Finance

| Entity | Read | Write |
|---|---|---|
| `gl-accounts` | ADMIN, ACCOUNTANT, BUM | ADMIN, ACCOUNTANT |
| `journal-entries` | ADMIN, ACCOUNTANT, BUM | ADMIN, ACCOUNTANT |
| `invoices` | ADMIN, ACCOUNTANT, BUM, WAREHOUSE | ADMIN, ACCOUNTANT |
| `payments` | ADMIN, ACCOUNTANT, BUM | ADMIN, ACCOUNTANT |

### Procurement

| Entity | Read | Write |
|---|---|---|
| `suppliers` | ADMIN, ACCOUNTANT, WAREHOUSE, BUM | ADMIN, WAREHOUSE |
| `purchase-orders` | ADMIN, ACCOUNTANT, WAREHOUSE, BUM | ADMIN, WAREHOUSE, ACCOUNTANT |

### Inventory

| Entity | Read | Write |
|---|---|---|
| `products` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP, WAREHOUSE, ACCOUNTANT | ADMIN, WAREHOUSE |
| `warehouses` | ADMIN, WAREHOUSE, BUM | ADMIN, WAREHOUSE |
| `stock-movements` | ADMIN, WAREHOUSE, BUM, ACCOUNTANT | ADMIN, WAREHOUSE |

### Sales

| Entity | Read | Write |
|---|---|---|
| `customers` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP, ACCOUNTANT | ADMIN, BUM, MARKETEER |
| `sales-orders` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, ACCOUNTANT, WAREHOUSE | ADMIN, BUM, MARKETEER |

### CRM (Sales team)

| Entity | Read | Write |
|---|---|---|
| `accounts` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER |
| `contacts` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP |
| `leads` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP |
| `opportunities` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER |
| `campaigns` | ADMIN, BUM, MARKETEER | ADMIN, BUM, MARKETEER |
| `tickets` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP |
| `territories` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM |
| `business-units` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, BUM |

### HR

| Entity | Read | Write |
|---|---|---|
| `employees` | ADMIN, HR, BUM | ADMIN, HR |
| `departments` | ADMIN, HR, BUM | ADMIN, HR |

### ATS (Applicant Tracking)

| Entity | Read | Write |
|---|---|---|
| `jobs` | ADMIN, HR, BUM | ADMIN, HR |
| `candidates` | ADMIN, HR, BUM | ADMIN, HR |
| `applications` | ADMIN, HR, BUM | ADMIN, HR |
| `training` | ADMIN, HR, BUM, MARKETEER, DISTRICT_MANAGER, MEDICAL_REP | ADMIN, HR |

### Approval logs

| Entity | Read | Write |
|---|---|---|
| `approval-logs` | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER | ADMIN, BUM, MARKETEER, DISTRICT_MANAGER |

## Observations for Phase 1

- **Defaults too permissive.** `requirePermission` allows access to
  entities not in the table. Phase 1 should default to deny.
- **No tenancy-aware access.** Permissions are role-level only. ABAC
  predicates (ADR-0008) add row-level controls on top, e.g., medical
  reps only see their own visits.
- **Missing entities.** Several entities (assets, contracts,
  projects, kpis, market-requests, visits, weekly-plans, expenses,
  the entire QA/QC surface, etc.) have no entry — they default to
  allow. Phase 1's permission seed should be **exhaustive**.
- **Two-layer auth pattern.** `requirePermission` first tries the
  session role (preferred path) then falls back to `x-user-role` /
  `x-user-id` headers (legacy). The header path was an explicit
  attack vector found in Track B audit; Phase 1 should remove it.
- **NSM mismatch.** The schema enum includes `NSM` (National Sales
  Manager) but `UserRole` in rbac.ts does not. Phase 1 should pick
  the union of both and decide consciously which to drop.
