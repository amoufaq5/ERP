# Phase 0 Salvage — Seed Data

> Source: `prisma/seed.ts` (694 LoC)

> **MOCK — Doctrine v2 (2026-05-12).** The operator marked the
> seed data as mock. Do **not** import names, emails, phones,
> addresses, or product specifics. This doc remains useful only
> as a reference for the **shape** that an Egyptian-pharma demo
> fixture should take (segments, geography spread, role mix,
> realism level). Phase 1's demo data must be designed fresh from
> public sources; the framing below ("months of domain research")
> was overstated and the specifics aren't market-validated.

## Tenant identity

```ts
const TENANT_ID = "tenant_pharmacorp_eg"
```

## Users (5)

Plausible Arabic + Egyptian names with role assignments matching the
`UserRole` enum:

| Name | Email | Role | Department | Territory |
|---|---|---|---|---|
| Ahmed Hassan | admin@pharmacorp.eg | ADMIN | Management | Egypt-National |
| Sara El-Masry | sara.elmasry@pharmacorp.eg | MANAGER | Sales | Egypt-North |
| Omar Farouk | omar.farouk@pharmacorp.eg | MANAGER | Warehouse | Egypt-Central |
| Nadia Rizk | nadia.rizk@pharmacorp.eg | MANAGER | Quality | Egypt-National |
| Khaled Mansour | khaled.mansour@pharmacorp.eg | MANAGER | Human Resources | Egypt-National |

Passwords are seeded with `bcryptjs.hashSync(password, 10)` so the
demo tenant can be logged into out of the box.

## Customer accounts (10)

Real Egyptian hospitals, pharmacy chains, and distributors. Worth
preserving verbatim — anyone designing for the Egyptian pharma
market recognizes these names immediately:

### Hospitals (Healthcare segment)

- **Kasr El-Aini Hospital** — Cairo's flagship teaching hospital
- **Ain Shams University Hospital** — Cairo
- **Alexandria University Hospital**
- **Mansoura University Hospital** — Delta region
- **Assiut University Hospital** — Upper Egypt

### Retail pharmacy chains

- **El-Ezaby Pharmacy Chain** — large Cairo chain
- **Seif Pharmacies** — Mohandessin
- **Roshdy Pharmacy Group** — Alexandria-based

### Distributors

- **IBNSINA Pharma Distribution** — 10th of Ramadan industrial zone
- **Pharma Overseas** — Smart Village, October City

Each carries a plausible Egyptian phone number (`+20-2-...` for Cairo,
`+20-3-...` for Alexandria, `+20-50-...` for Mansoura, etc.) and an
address that maps to real geography.

## Suppliers

Real Egyptian pharma manufacturers. The seed names match actual
companies in the market — useful realism for demo + AI training:

(Specific list lives in `prisma/seed.ts:170-220`; recommend a direct
copy at salvage time.)

## Products

Plausible pharmaceutical products with realistic:
- Egyptian-pound (EGP) pricing
- SKU patterns
- Categories matching the local market
- "Egyptian pharmaceutical product manufactured under GMP standards"
  descriptions

## Warehouses

Three warehouses across Cairo / Alexandria / Mansoura.

## Doctors (pharma CRM)

Doctors at the seeded hospitals with realistic Egyptian names like
"Dr. Mohamed Abdel-Rahman", classifications (A/B/C per
`DoctorClassification`), and buying-ladder stages.

## Expenses (sample)

Includes territory-realistic items:
- "Uber rides for doctor visits across Greater Cairo (Ain Shams,
  Kasr Al-Ainy, NCI)"
- "Lunch meeting with Dr. Mohamed Abdel-Rahman at Abu El Reesh
  Hospital cafeteria"
- "Registration fee for Egyptian Oncology Society annual meeting
  at Cairo International Convention Center"
- "Printing of product detail aids and leave-behind materials at
  Copy Center Maadi"

These are gold for AI training prompts — they capture how a real
medical rep's expense report reads.

## QA/QC

The seed creates:
- 2 Deviations
- 2 CAPAs with action items
- 1 Batch Release

Domain accuracy: matches WHO + Egyptian Drug Authority GMP
expectations. Worth carrying as-is.

## How to use for Phase 1

1. **Demo tenant:** Phase 1 should reproduce this seed as the
   "PharmaCorp Egypt" demo / dev tenant.
2. **AI training:** these strings are realistic enough to serve as
   few-shot examples when generating screens, validation messages,
   email copy, etc.
3. **Localization seed:** Arabic transliterations (Sara El-Masry,
   Khaled Mansour) and Egyptian place names (Mohandessin, Maadi,
   Smart Village, 10th of Ramadan) should populate the i18n
   reference set.
4. **Compliance demo:** the GMP + ETA references give compliance
   reviewers something concrete to evaluate.

## What to refresh

- Phone numbers, emails: keep the formats but consider scrambling
  if these match real organizations (privacy hygiene)
- Pricing: 2025-era EGP rates; update to current
- Add more variety: the seed is one tenant's data; Phase 1 demo
  might want 2-3 contrasting tenants
