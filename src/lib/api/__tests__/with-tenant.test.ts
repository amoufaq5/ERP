// Tests target the pure helpers in `tenant-augment.ts` directly so they
// run without booting Prisma / NextAuth. The runtime wrappers in
// `with-tenant.ts` re-export these symbols; we import from the source.
import { describe, it, expect } from "vitest";
import {
  augmentArgsForTenant,
  SHARED_LOOKUP_MODELS,
  TENANT_SCHEMA_DEBT,
} from "../tenant-augment";

const TENANT = "tnt_abc123";
const OTHER_TENANT = "tnt_xyz999";

describe("augmentArgsForTenant — read operations inject where.tenantId", () => {
  for (const op of [
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
  ] as const) {
    it(`${op}: empty args → where.tenantId set`, () => {
      const result = augmentArgsForTenant("SalesOrder", op, undefined, TENANT) as {
        where: { tenantId: string };
      };
      expect(result.where.tenantId).toBe(TENANT);
    });

    it(`${op}: existing where preserved + tenantId added`, () => {
      const result = augmentArgsForTenant(
        "SalesOrder",
        op,
        { where: { status: "OPEN" } },
        TENANT,
      ) as { where: { tenantId: string; status: string } };
      expect(result.where.tenantId).toBe(TENANT);
      expect(result.where.status).toBe("OPEN");
    });

    it(`${op}: caller-supplied tenantId is overridden (cannot escape tenant)`, () => {
      const result = augmentArgsForTenant(
        "SalesOrder",
        op,
        { where: { tenantId: OTHER_TENANT, status: "OPEN" } },
        TENANT,
      ) as { where: { tenantId: string; status: string } };
      expect(result.where.tenantId).toBe(TENANT);
      expect(result.where.status).toBe("OPEN");
    });
  }
});

describe("augmentArgsForTenant — write predicates inject where.tenantId", () => {
  for (const op of ["update", "updateMany", "delete", "deleteMany"] as const) {
    it(`${op}: empty args → where.tenantId set`, () => {
      const result = augmentArgsForTenant("Invoice", op, undefined, TENANT) as {
        where: { tenantId: string };
      };
      expect(result.where.tenantId).toBe(TENANT);
    });

    it(`${op}: caller cannot override tenantId`, () => {
      const result = augmentArgsForTenant(
        "Invoice",
        op,
        { where: { id: "inv_1", tenantId: OTHER_TENANT } },
        TENANT,
      ) as { where: { id: string; tenantId: string } };
      expect(result.where.tenantId).toBe(TENANT);
      expect(result.where.id).toBe("inv_1");
    });
  }
});

describe("augmentArgsForTenant — create injects data.tenantId", () => {
  it("create: data.tenantId is injected", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "create",
      { data: { number: "INV-1", total: 100 } },
      TENANT,
    ) as { data: { tenantId: string; number: string; total: number } };
    expect(result.data.tenantId).toBe(TENANT);
    expect(result.data.number).toBe("INV-1");
    expect(result.data.total).toBe(100);
  });

  it("create: caller-supplied tenantId in data is overridden", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "create",
      { data: { number: "INV-1", tenantId: OTHER_TENANT } },
      TENANT,
    ) as { data: { tenantId: string } };
    expect(result.data.tenantId).toBe(TENANT);
  });
});

describe("augmentArgsForTenant — createMany handles both shapes", () => {
  it("createMany: array of rows — each row gets tenantId", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "createMany",
      { data: [{ number: "INV-1" }, { number: "INV-2" }] },
      TENANT,
    ) as { data: Array<{ tenantId: string; number: string }> };
    expect(result.data).toHaveLength(2);
    expect(result.data[0].tenantId).toBe(TENANT);
    expect(result.data[1].tenantId).toBe(TENANT);
    expect(result.data[0].number).toBe("INV-1");
    expect(result.data[1].number).toBe("INV-2");
  });

  it("createMany: single-object data — tenantId is injected", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "createMany",
      { data: { number: "INV-1" } },
      TENANT,
    ) as { data: { tenantId: string; number: string } };
    expect(result.data.tenantId).toBe(TENANT);
  });

  it("createMany: array — caller-supplied tenantId per row is overridden", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "createMany",
      {
        data: [
          { number: "INV-1", tenantId: OTHER_TENANT },
          { number: "INV-2" },
        ],
      },
      TENANT,
    ) as { data: Array<{ tenantId: string }> };
    expect(result.data[0].tenantId).toBe(TENANT);
    expect(result.data[1].tenantId).toBe(TENANT);
  });
});

describe("augmentArgsForTenant — upsert scopes both where and create", () => {
  it("upsert: where + create both get tenantId", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "upsert",
      {
        where: { id: "inv_1" },
        create: { number: "INV-1" },
        update: { total: 200 },
      },
      TENANT,
    ) as {
      where: { tenantId: string; id: string };
      create: { tenantId: string; number: string };
      update: { total: number };
    };
    expect(result.where.tenantId).toBe(TENANT);
    expect(result.create.tenantId).toBe(TENANT);
    expect(result.update.total).toBe(200);
  });

  it("upsert: caller-supplied tenantId in create is overridden", () => {
    const result = augmentArgsForTenant(
      "Invoice",
      "upsert",
      {
        where: { id: "inv_1" },
        create: { number: "INV-1", tenantId: OTHER_TENANT },
        update: { total: 200 },
      },
      TENANT,
    ) as { create: { tenantId: string } };
    expect(result.create.tenantId).toBe(TENANT);
  });
});

describe("augmentArgsForTenant — passes through for shared lookups", () => {
  // SHARED_LOOKUP_MODELS is empty in the current ERP schema (see audit doc).
  // Verify the mechanism still works for hypothetical future entries.
  it("(meta) SHARED_LOOKUP_MODELS is currently empty in this schema", () => {
    expect(SHARED_LOOKUP_MODELS.size).toBe(0);
  });

  it("hypothetical shared model passes args through unchanged", () => {
    // Bypass type system to test the mechanism; this is what would happen
    // if a real shared lookup were ever added to the set.
    const sharedSet = SHARED_LOOKUP_MODELS as Set<string>;
    sharedSet.add("__TestSharedLookup__");
    try {
      const args = { where: { code: "ICD-10-A00" } };
      const result = augmentArgsForTenant(
        "__TestSharedLookup__",
        "findMany",
        args,
        TENANT,
      );
      expect(result).toBe(args); // identity — no augmentation
    } finally {
      sharedSet.delete("__TestSharedLookup__");
    }
  });
});

describe("augmentArgsForTenant — passes through for schema-debt models", () => {
  it("User (current known debt) is not auto-scoped", () => {
    // User is in TENANT_SCHEMA_DEBT because the Prisma model has no
    // tenantId column. Track B2 closes this by adding the column.
    expect(TENANT_SCHEMA_DEBT.has("User")).toBe(true);

    const args = { where: { email: "a@b.com" } };
    const result = augmentArgsForTenant("User", "findFirst", args, TENANT);
    expect(result).toBe(args); // identity — no augmentation
  });
});

describe("augmentArgsForTenant — unknown operations pass through", () => {
  // Operations not in the recognized list (e.g., the various internal
  // Prisma calls that don't take where/data) must not be munged. The
  // augmented copy is still a fresh object but contains no tenantId.
  it("unknown operation: no tenantId injected", () => {
    const result = augmentArgsForTenant(
      "SalesOrder",
      "$executeRaw",
      { query: "SELECT 1" },
      TENANT,
    ) as Record<string, unknown>;
    expect(result.tenantId).toBeUndefined();
    expect((result as { where?: unknown }).where).toBeUndefined();
    expect((result as { data?: unknown }).data).toBeUndefined();
  });
});

describe("augmentArgsForTenant — does not mutate input", () => {
  it("read: input args object is not modified", () => {
    const input = { where: { status: "OPEN" } };
    const before = JSON.stringify(input);
    augmentArgsForTenant("SalesOrder", "findMany", input, TENANT);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("create: input args object is not modified", () => {
    const input = { data: { number: "INV-1" } };
    const before = JSON.stringify(input);
    augmentArgsForTenant("Invoice", "create", input, TENANT);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("createMany array: input array and each row are not modified", () => {
    const row1 = { number: "INV-1" };
    const row2 = { number: "INV-2" };
    const input = { data: [row1, row2] };
    const beforeWhole = JSON.stringify(input);
    const beforeRow1 = JSON.stringify(row1);
    augmentArgsForTenant("Invoice", "createMany", input, TENANT);
    expect(JSON.stringify(input)).toBe(beforeWhole);
    expect(JSON.stringify(row1)).toBe(beforeRow1);
  });
});
