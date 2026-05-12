# Phase 0 Salvage — Validation Catalog

> Source: `src/lib/api/validations.ts` (52 zod schemas across 26 entities)

Every CRUD-shape entity has a `create<X>Schema` and a derived
`update<X>Schema = create<X>Schema.partial()`. The validation rules
encode field-level constraints (required vs. optional, min/max,
enum, etc.) that survived real-world use.

**For Phase 1:** these are worth copying verbatim into the new
kernel's per-module validation files. The patterns are correct;
only the model targets need updating if the Phase 1 schema renames
fields.

## Entities with create + update schemas

- **Account**
- **Application**
- **ApprovalLog**
- **BusinessUnit**
- **Campaign**
- **Candidate**
- **Contact**
- **Customer**
- **Department**
- **Employee**
- **GlAccount**
- **Invoice**
- **Job**
- **JournalEntry**
- **Lead**
- **Opportunity**
- **Payment**
- **Product**
- **PurchaseOrder**
- **SalesOrder**
- **StockMovement**
- **Supplier**
- **Territory**
- **Ticket**
- **Training**
- **Warehouse**

## Sample schema (sales order)

To illustrate the shape, here's the full validation for sales orders
(complete schemas live in `src/lib/api/validations.ts`):

```ts
export const createSalesOrderSchema = z.object({
  orderNumber: z.string().min(1).max(50),
  customerId:  z.string().min(1),
  date:        z.string(),              // ISO date
  status:      z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  total:       z.number().nonnegative(),
  shippingAddress: z.string().optional(),
  notes:       z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity:  z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    total:     z.number().nonnegative(),
  })).optional(),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial();
```

## Carry-forward notes

- Status enums in the validators **don't always match** the Prisma
  enums. Phase 1 should consolidate them. Example: `SalesOrder.status`
  is a free string in the schema but constrained in the validator —
  the validator wins as the contract.
- Several create schemas have `.refine()` cross-field rules (e.g.,
  `createJournalEntrySchema` validates debits == credits). Preserve
  these — they encode business invariants that no UI alone catches.
- Decimal money fields are validated as `z.number().nonnegative()`.
  Phase 1 should keep this (or switch to `string` + Decimal.js for
  precision, depending on the kernel's money handling decision).
