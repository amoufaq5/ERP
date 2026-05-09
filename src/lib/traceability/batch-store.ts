// Batch/Lot Traceability — localStorage-based data store

import type { Batch, BatchMovement, BatchEvent, BatchMaterial } from "./batch-types";

const STORAGE_KEYS = {
  batches: "pharma.batches",
  movements: "pharma.batch-movements",
  events: "pharma.batch-events",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function isoDate(d: Date): string {
  return d.toISOString();
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface ProductDef {
  id: string;
  name: string;
  code: string;
}

const PRODUCTS: ProductDef[] = [
  { id: "prod-amox", name: "Amoxicillin 500mg", code: "AMOX-500" },
  { id: "prod-omep", name: "Omeprazole 20mg", code: "OMEP-020" },
  { id: "prod-metf", name: "Metformin 850mg", code: "METF-850" },
  { id: "prod-ator", name: "Atorvastatin 10mg", code: "ATOR-010" },
  { id: "prod-losa", name: "Losartan 50mg", code: "LOSA-050" },
];

const SUPPLIERS = [
  { id: "sup-01", name: "Al-Nile Chemicals" },
  { id: "sup-02", name: "Cairo Pharma Raw" },
  { id: "sup-03", name: "Delta Lab Supplies" },
  { id: "sup-04", name: "Suez API Trading" },
];

const RAW_MATERIALS_POOL: Omit<BatchMaterial, "batchNumber">[] = [
  { materialId: "rm-01", materialName: "Amoxicillin Trihydrate API", quantity: 50, unit: "kg", supplierId: "sup-01", supplierName: "Al-Nile Chemicals" },
  { materialId: "rm-02", materialName: "Microcrystalline Cellulose", quantity: 30, unit: "kg", supplierId: "sup-02", supplierName: "Cairo Pharma Raw" },
  { materialId: "rm-03", materialName: "Magnesium Stearate", quantity: 5, unit: "kg", supplierId: "sup-03", supplierName: "Delta Lab Supplies" },
  { materialId: "rm-04", materialName: "Omeprazole Pellets", quantity: 40, unit: "kg", supplierId: "sup-01", supplierName: "Al-Nile Chemicals" },
  { materialId: "rm-05", materialName: "Gelatin Capsule Shells", quantity: 20000, unit: "pcs", supplierId: "sup-04", supplierName: "Suez API Trading" },
  { materialId: "rm-06", materialName: "Metformin HCl API", quantity: 80, unit: "kg", supplierId: "sup-02", supplierName: "Cairo Pharma Raw" },
  { materialId: "rm-07", materialName: "Povidone K30", quantity: 10, unit: "kg", supplierId: "sup-03", supplierName: "Delta Lab Supplies" },
  { materialId: "rm-08", materialName: "Atorvastatin Calcium API", quantity: 25, unit: "kg", supplierId: "sup-01", supplierName: "Al-Nile Chemicals" },
  { materialId: "rm-09", materialName: "Lactose Monohydrate", quantity: 40, unit: "kg", supplierId: "sup-04", supplierName: "Suez API Trading" },
  { materialId: "rm-10", materialName: "Losartan Potassium API", quantity: 35, unit: "kg", supplierId: "sup-02", supplierName: "Cairo Pharma Raw" },
  { materialId: "rm-11", materialName: "Croscarmellose Sodium", quantity: 8, unit: "kg", supplierId: "sup-03", supplierName: "Delta Lab Supplies" },
  { materialId: "rm-12", materialName: "HPMC Film Coating", quantity: 6, unit: "kg", supplierId: "sup-04", supplierName: "Suez API Trading" },
];

const MATERIAL_MAP: Record<string, number[]> = {
  "prod-amox": [0, 1, 2],
  "prod-omep": [3, 4, 6],
  "prod-metf": [5, 1, 7],
  "prod-losa": [9, 10, 11],
  "prod-ator": [7, 8, 2],
};

const OPERATORS = ["Ahmed Hassan", "Fatma Ali", "Mohamed Saeed", "Nour Ibrahim", "Sara Mahmoud"];
const LOCATIONS = ["Warehouse A", "Warehouse B", "Production Floor", "QC Lab", "Quarantine Zone", "Shipping Dock"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSeedData(): {
  batches: Batch[];
  movements: BatchMovement[];
  events: BatchEvent[];
} {
  const now = new Date(2026, 4, 8); // May 8, 2026
  const batches: Batch[] = [];
  const movements: BatchMovement[] = [];
  const events: BatchEvent[] = [];

  const statusConfigs: {
    status: Batch["status"];
    qcStatus: Batch["qcStatus"];
  }[] = [
    { status: "released", qcStatus: "passed" },
    { status: "released", qcStatus: "passed" },
    { status: "released", qcStatus: "passed" },
    { status: "quarantine", qcStatus: "pending" },
    { status: "quarantine", qcStatus: "in-progress" },
    { status: "quarantine", qcStatus: "pending" },
    { status: "rejected", qcStatus: "failed" },
    { status: "released", qcStatus: "passed" },
    { status: "released", qcStatus: "passed" },
    { status: "recalled", qcStatus: "passed" },
    { status: "expired", qcStatus: "passed" },
    { status: "released", qcStatus: "passed" },
    { status: "quarantine", qcStatus: "in-progress" },
    { status: "released", qcStatus: "passed" },
    { status: "released", qcStatus: "passed" },
  ];

  for (let i = 0; i < 15; i++) {
    const product = PRODUCTS[i % PRODUCTS.length];
    const cfg = statusConfigs[i];
    const mfgDate = addDays(now, -(180 - i * 12));
    let expiryDate = addDays(mfgDate, 730); // 2 years shelf life

    // Batch 10 is expired
    if (i === 10) {
      expiryDate = addDays(now, -10);
    }
    // Batch 4 and 12 expire soon (within 30 days)
    if (i === 4 || i === 12) {
      expiryDate = addDays(now, 15 + i);
    }

    const materialIndices = MATERIAL_MAP[product.id] || [0, 1, 2];
    const rawMaterials: BatchMaterial[] = materialIndices.map((idx) => {
      const rm = RAW_MATERIALS_POOL[idx];
      return {
        ...rm,
        batchNumber: `RM-${(2026000 + idx * 100 + i).toString()}`,
      };
    });

    const batchId = `batch-${(i + 1).toString().padStart(3, "0")}`;
    const batchNumber = `BN-${product.code}-${(2026000 + i + 1).toString()}`;

    batches.push({
      id: batchId,
      batchNumber,
      productId: product.id,
      productName: product.name,
      quantity: 5000 + i * 1000,
      manufacturedDate: isoDate(mfgDate),
      expiryDate: isoDate(expiryDate),
      status: cfg.status,
      qcStatus: cfg.qcStatus,
      manufacturingOrderId: `MO-${(2026000 + i).toString()}`,
      rawMaterials,
      notes: `Manufacturing batch ${i + 1} for ${product.name}`,
      createdAt: isoDate(mfgDate),
      updatedAt: isoDate(addDays(mfgDate, 2)),
    });

    // --- Events for this batch ---
    events.push({
      id: uid(),
      batchId,
      eventType: "created",
      description: `Batch ${batchNumber} created for ${product.name}`,
      performedBy: pickRandom(OPERATORS),
      timestamp: isoDate(mfgDate),
    });

    events.push({
      id: uid(),
      batchId,
      eventType: "quarantined",
      description: `Batch placed in quarantine pending QC`,
      performedBy: pickRandom(OPERATORS),
      timestamp: isoDate(addDays(mfgDate, 1)),
    });

    if (cfg.qcStatus !== "pending") {
      events.push({
        id: uid(),
        batchId,
        eventType: "qc-started",
        description: `QC testing initiated — sampling and analysis`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 2)),
      });
    }

    if (cfg.qcStatus === "passed") {
      events.push({
        id: uid(),
        batchId,
        eventType: "qc-passed",
        description: `QC testing passed — all parameters within spec`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 5)),
      });
    }

    if (cfg.qcStatus === "failed") {
      events.push({
        id: uid(),
        batchId,
        eventType: "qc-failed",
        description: `QC testing failed — dissolution rate below limit`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 5)),
      });
    }

    if (cfg.status === "released") {
      events.push({
        id: uid(),
        batchId,
        eventType: "released",
        description: `Batch released for distribution`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 6)),
      });
    }

    if (cfg.status === "recalled") {
      events.push({
        id: uid(),
        batchId,
        eventType: "released",
        description: `Batch initially released for distribution`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 6)),
      });
      events.push({
        id: uid(),
        batchId,
        eventType: "recalled",
        description: `Batch recalled — stability test failure at 3 months`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 90)),
      });
    }

    if (cfg.status === "expired") {
      events.push({
        id: uid(),
        batchId,
        eventType: "expired",
        description: `Batch expired — past shelf life`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(expiryDate),
      });
    }

    // Shipped events for some released batches
    if (cfg.status === "released" && i % 3 === 0) {
      events.push({
        id: uid(),
        batchId,
        eventType: "shipped",
        description: `Partial shipment — 2000 units to Cairo Distribution Center`,
        performedBy: pickRandom(OPERATORS),
        timestamp: isoDate(addDays(mfgDate, 10)),
      });
    }

    // --- Movements for this batch ---
    // Received into quarantine
    movements.push({
      id: uid(),
      batchId,
      type: "received",
      toLocation: "Quarantine Zone",
      quantity: 5000 + i * 1000,
      performedBy: pickRandom(OPERATORS),
      performedAt: isoDate(mfgDate),
      referenceType: "WO",
      referenceId: `MO-${(2026000 + i).toString()}`,
    });

    // Transferred to QC Lab
    if (cfg.qcStatus !== "pending") {
      movements.push({
        id: uid(),
        batchId,
        type: "transferred",
        fromLocation: "Quarantine Zone",
        toLocation: "QC Lab",
        quantity: 100,
        reason: "QC sampling",
        performedBy: pickRandom(OPERATORS),
        performedAt: isoDate(addDays(mfgDate, 2)),
        referenceType: "WO",
        referenceId: `MO-${(2026000 + i).toString()}`,
      });
    }

    // Released batches moved to warehouse
    if (cfg.status === "released" || cfg.status === "recalled") {
      movements.push({
        id: uid(),
        batchId,
        type: "transferred",
        fromLocation: "Quarantine Zone",
        toLocation: "Warehouse A",
        quantity: 4900 + i * 1000,
        reason: "Released after QC approval",
        performedBy: pickRandom(OPERATORS),
        performedAt: isoDate(addDays(mfgDate, 6)),
        referenceType: "WO",
        referenceId: `MO-${(2026000 + i).toString()}`,
      });
    }

    // Issued for some released batches
    if (cfg.status === "released" && i % 3 === 0) {
      movements.push({
        id: uid(),
        batchId,
        type: "issued",
        fromLocation: "Warehouse A",
        toLocation: "Shipping Dock",
        quantity: 2000,
        reason: "Customer order fulfillment",
        performedBy: pickRandom(OPERATORS),
        performedAt: isoDate(addDays(mfgDate, 10)),
        referenceType: "SO",
        referenceId: `SO-${(30000 + i).toString()}`,
      });
    }

    // Rejected batch → scrapped
    if (cfg.status === "rejected") {
      movements.push({
        id: uid(),
        batchId,
        type: "scrapped",
        fromLocation: "Quarantine Zone",
        quantity: 5000 + i * 1000,
        reason: "Failed QC — dissolution test",
        performedBy: pickRandom(OPERATORS),
        performedAt: isoDate(addDays(mfgDate, 7)),
      });
    }

    // Recalled batch → returned
    if (cfg.status === "recalled") {
      movements.push({
        id: uid(),
        batchId,
        type: "returned",
        fromLocation: "Customer",
        toLocation: "Quarantine Zone",
        quantity: 1500,
        reason: "Product recall — stability failure",
        performedBy: pickRandom(OPERATORS),
        performedAt: isoDate(addDays(mfgDate, 95)),
      });
    }
  }

  return { batches, movements, events };
}

// ---------------------------------------------------------------------------
// BatchStore class
// ---------------------------------------------------------------------------

class BatchStore {
  private _batches: Batch[] = [];
  private _movements: BatchMovement[] = [];
  private _events: BatchEvent[] = [];
  private _initialized = false;

  private load(): void {
    if (this._initialized) return;
    this._initialized = true;

    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(STORAGE_KEYS.batches);
    if (raw) {
      try {
        this._batches = JSON.parse(raw);
        this._movements = JSON.parse(localStorage.getItem(STORAGE_KEYS.movements) || "[]");
        this._events = JSON.parse(localStorage.getItem(STORAGE_KEYS.events) || "[]");
        return;
      } catch {
        // corrupted — re-seed
      }
    }

    const seed = buildSeedData();
    this._batches = seed.batches;
    this._movements = seed.movements;
    this._events = seed.events;
    this.persist();
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.batches, JSON.stringify(this._batches));
    localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(this._movements));
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(this._events));
  }

  // ---- Batches CRUD ----

  getBatches(): Batch[] {
    this.load();
    return [...this._batches];
  }

  getBatchById(id: string): Batch | undefined {
    this.load();
    return this._batches.find((b) => b.id === id);
  }

  createBatch(data: Omit<Batch, "id" | "createdAt" | "updatedAt">): Batch {
    if (!data.batchNumber?.trim()) throw new Error("Batch number is required");
    if (!data.productName?.trim()) throw new Error("Batch product name is required");
    this.load();
    const now = new Date().toISOString();
    const batch: Batch = {
      ...data,
      id: `batch-${uid()}`,
      createdAt: now,
      updatedAt: now,
    };
    this._batches.push(batch);
    this.addEvent({
      batchId: batch.id,
      eventType: "created",
      description: `Batch ${batch.batchNumber} created for ${batch.productName}`,
      performedBy: "System",
      timestamp: now,
    });
    this.persist();
    return batch;
  }

  updateBatch(id: string, updates: Partial<Omit<Batch, "id" | "createdAt">>): Batch | undefined {
    this.load();
    const idx = this._batches.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    this._batches[idx] = {
      ...this._batches[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this._batches[idx];
  }

  // ---- Movements ----

  getMovements(batchId: string): BatchMovement[] {
    this.load();
    return this._movements.filter((m) => m.batchId === batchId);
  }

  addMovement(data: Omit<BatchMovement, "id">): BatchMovement {
    this.load();
    const movement: BatchMovement = { ...data, id: uid() };
    this._movements.push(movement);
    this.persist();
    return movement;
  }

  // ---- Events ----

  getEvents(batchId: string): BatchEvent[] {
    this.load();
    return this._events.filter((e) => e.batchId === batchId);
  }

  addEvent(data: Omit<BatchEvent, "id">): BatchEvent {
    this.load();
    const event: BatchEvent = { ...data, id: uid() };
    this._events.push(event);
    this.persist();
    return event;
  }

  // ---- Queries ----

  getBatchesByProduct(productId: string): Batch[] {
    this.load();
    return this._batches.filter((b) => b.productId === productId);
  }

  getBatchesByStatus(status: Batch["status"]): Batch[] {
    this.load();
    return this._batches.filter((b) => b.status === status);
  }

  getExpiringBatches(daysAhead: number): Batch[] {
    this.load();
    const now = new Date();
    const limit = new Date(now.getTime() + daysAhead * 86400000);
    return this._batches.filter((b) => {
      if (b.status === "expired" || b.status === "rejected" || b.status === "recalled") return false;
      const exp = new Date(b.expiryDate);
      return exp > now && exp <= limit;
    });
  }

  searchBatches(query: string): Batch[] {
    this.load();
    const q = query.toLowerCase();
    return this._batches.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q)
    );
  }

  getAllMovements(): BatchMovement[] {
    this.load();
    return [...this._movements];
  }

  getAllEvents(): BatchEvent[] {
    this.load();
    return [...this._events];
  }
}

export const batchStore = new BatchStore();
