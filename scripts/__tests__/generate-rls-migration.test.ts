import { describe, it, expect } from "vitest";
import { findTenantScopedModels } from "../generate-rls-migration";

describe("findTenantScopedModels — parses model+tenantId+@@map", () => {
  it("model with tenantId and @@map: returns mapped table name", () => {
    const schema = `
model SalesOrder {
  id String @id @default(cuid())
  tenantId String
  @@index([tenantId])
  @@map("sales_orders")
}
`;
    expect(findTenantScopedModels(schema)).toEqual([
      { model: "SalesOrder", table: "sales_orders" },
    ]);
  });

  it("model with tenantId but no @@map: falls back to model name", () => {
    const schema = `
model Workflow {
  id String @id @default(cuid())
  tenantId String
}
`;
    expect(findTenantScopedModels(schema)).toEqual([
      { model: "Workflow", table: "Workflow" },
    ]);
  });

  it("model without tenantId: excluded", () => {
    const schema = `
model GlobalThing {
  id String @id @default(cuid())
  name String
  @@map("global_things")
}
`;
    expect(findTenantScopedModels(schema)).toEqual([]);
  });

  it("multiple models: all tenant-scoped ones returned, others skipped", () => {
    const schema = `
model A {
  id String @id
  tenantId String
  @@map("a_table")
}

model B {
  id String @id
  name String
  @@map("b_table")
}

model C {
  id String @id
  tenantId String
  @@map("c_table")
}
`;
    expect(findTenantScopedModels(schema)).toEqual([
      { model: "A", table: "a_table" },
      { model: "C", table: "c_table" },
    ]);
  });

  it("nested braces in relations / defaults: parser still finds end of model", () => {
    // Prisma syntax doesn't actually nest braces inside a model body, but
    // verify the simple `^}` end-of-model match holds for typical cases.
    const schema = `
model Complex {
  id String @id @default(cuid())
  tenantId String
  status String @default("PENDING")
  @@index([tenantId])
  @@unique([tenantId, status])
  @@map("complex_things")
}
`;
    expect(findTenantScopedModels(schema)).toEqual([
      { model: "Complex", table: "complex_things" },
    ]);
  });

  it("tenantId field inside a relation block name (e.g. comment) does not trigger", () => {
    // A line that mentions tenantId but isn't actually the field declaration
    // must not flip has_tenant. Parser uses /^tenantId\s/ (anchored).
    const schema = `
model NotScoped {
  id String @id
  // tenantId would go here but doesn't
  name String
  @@map("not_scoped")
}
`;
    expect(findTenantScopedModels(schema)).toEqual([]);
  });
});
