"use client";

import type {
  WarehouseZone,
  ZoneType,
  ZoneStatus,
  StorageLocation,
  LocationStatus,
  StorageCondition,
  PutawayRule,
  PutawayTask,
  PutawayStatus,
  ProductCategory,
  PickingWave,
  PickingWaveStatus,
  CycleCount,
  CycleCountStatus,
  WarehouseMetrics,
  ZoneUtilization,
  LocationTransfer,
} from "./warehouse-types";

const STORAGE_KEY = "pharma.warehouse";

/* ── helpers ─────────────────────────────────────────────── */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function futureDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

/* ── Seed: Warehouse Zones ──────────────────────────────── */

const SEED_ZONES: WarehouseZone[] = [
  {
    id: "zone-01", name: "Receiving Dock", code: "Z1", type: "receiving",
    status: "active",
    temperatureRange: { min: 15, max: 30, unit: "C" },
    humidityRange: { min: 30, max: 65 },
    capacity: 40, currentOccupancy: 12,
    description: "Incoming materials staging area with GRN processing station",
    specialRequirements: ["Weighbridge access", "Loading bay doors"],
    gridRow: 0, gridCol: 0, gridWidth: 2, gridHeight: 1,
  },
  {
    id: "zone-02", name: "Quarantine Area", code: "Z2", type: "quarantine",
    status: "active",
    temperatureRange: { min: 15, max: 25, unit: "C" },
    humidityRange: { min: 30, max: 60 },
    capacity: 60, currentOccupancy: 28,
    description: "Materials pending QC release - physically segregated with restricted access",
    specialRequirements: ["Restricted access", "Yellow line demarcation", "QC sampling booth"],
    gridRow: 0, gridCol: 2, gridWidth: 2, gridHeight: 1,
  },
  {
    id: "zone-03", name: "Approved Materials", code: "Z3", type: "approved",
    status: "active",
    temperatureRange: { min: 15, max: 25, unit: "C" },
    humidityRange: { min: 30, max: 60 },
    capacity: 120, currentOccupancy: 87,
    description: "QC-released raw materials and excipients for production dispensing",
    specialRequirements: ["Green status labels", "FEFO rotation"],
    gridRow: 1, gridCol: 0, gridWidth: 2, gridHeight: 2,
  },
  {
    id: "zone-04", name: "Cold Storage", code: "Z4", type: "cold-storage",
    status: "active",
    temperatureRange: { min: 2, max: 8, unit: "C" },
    humidityRange: { min: 35, max: 65 },
    capacity: 30, currentOccupancy: 22,
    description: "Refrigerated storage for temperature-sensitive APIs and excipients (2-8°C)",
    specialRequirements: ["Continuous temperature monitoring", "Backup generator", "Strip curtain doors", "Temperature mapping validated"],
    gridRow: 1, gridCol: 2, gridWidth: 1, gridHeight: 1,
  },
  {
    id: "zone-05", name: "Controlled Substances Vault", code: "Z5", type: "controlled-substance",
    status: "active",
    temperatureRange: { min: 15, max: 25, unit: "C" },
    humidityRange: { min: 30, max: 60 },
    capacity: 15, currentOccupancy: 8,
    description: "High-security vault for scheduled narcotics and psychotropic substances",
    specialRequirements: ["Double-lock system", "CCTV 24/7", "Dual-signature access", "EDA compliance", "Narcotics register"],
    gridRow: 1, gridCol: 3, gridWidth: 1, gridHeight: 1,
  },
  {
    id: "zone-06", name: "Finished Goods", code: "Z6", type: "approved",
    status: "active",
    temperatureRange: { min: 15, max: 25, unit: "C" },
    humidityRange: { min: 30, max: 60 },
    capacity: 100, currentOccupancy: 64,
    description: "QC-released finished pharmaceutical products awaiting dispatch",
    specialRequirements: ["Batch segregation", "FEFO dispatch", "Customer order staging"],
    gridRow: 2, gridCol: 2, gridWidth: 2, gridHeight: 1,
  },
  {
    id: "zone-07", name: "Shipping Dock", code: "Z7", type: "shipping",
    status: "active",
    temperatureRange: { min: 15, max: 30, unit: "C" },
    humidityRange: { min: 30, max: 65 },
    capacity: 35, currentOccupancy: 9,
    description: "Outbound logistics staging with dispatch verification station",
    specialRequirements: ["Loading bay doors", "Dispatch verification scanner", "Cold chain packing station"],
    gridRow: 3, gridCol: 0, gridWidth: 2, gridHeight: 1,
  },
  {
    id: "zone-08", name: "Returns / Rejected", code: "Z8", type: "returns",
    status: "active",
    temperatureRange: { min: 15, max: 25, unit: "C" },
    humidityRange: { min: 30, max: 60 },
    capacity: 20, currentOccupancy: 5,
    description: "Segregated area for returned goods and QC-rejected materials pending disposition",
    specialRequirements: ["Red status labels", "Physical segregation", "Destruction log", "Deviation link required"],
    gridRow: 3, gridCol: 2, gridWidth: 2, gridHeight: 1,
  },
];

/* ── Seed: Storage Locations (50 locations) ─────────────── */

function makeLoc(
  id: string, zoneId: string, rack: string, shelf: string, bin: string,
  status: LocationStatus, maxWeight: number,
  itemId?: string, itemName?: string, batchNumber?: string, qty?: number, unit?: string, lastDate?: string,
): StorageLocation {
  const zone = SEED_ZONES.find(z => z.id === zoneId);
  const code = zone?.code ?? "Z0";
  return {
    id, zoneId, rack, shelf, bin,
    barcode: `${code}-${rack}-${shelf}-${bin}`,
    status, maxWeight,
    currentItemId: itemId, currentItemName: itemName,
    currentBatchNumber: batchNumber, currentQuantity: qty, currentUnit: unit,
    lastActivityDate: lastDate,
  };
}

const SEED_LOCATIONS: StorageLocation[] = [
  // Zone 1 - Receiving Dock (8 locations)
  makeLoc("loc-001", "zone-01", "R01", "S01", "B01", "occupied", 500, "itm-001", "Paracetamol API", "BN-2026-0401", 200, "kg", daysAgo(1)),
  makeLoc("loc-002", "zone-01", "R01", "S01", "B02", "occupied", 500, "itm-002", "Microcrystalline Cellulose", "BN-2026-0398", 150, "kg", daysAgo(1)),
  makeLoc("loc-003", "zone-01", "R01", "S02", "B01", "occupied", 500, "itm-003", "Magnesium Stearate", "BN-2026-0405", 50, "kg", daysAgo(0)),
  makeLoc("loc-004", "zone-01", "R01", "S02", "B02", "available", 500),
  makeLoc("loc-005", "zone-01", "R02", "S01", "B01", "occupied", 500, "itm-004", "PVC/PVDC Blister Film", "BN-2026-0410", 30, "rolls", daysAgo(0)),
  makeLoc("loc-006", "zone-01", "R02", "S01", "B02", "available", 500),
  makeLoc("loc-007", "zone-01", "R02", "S02", "B01", "available", 500),
  makeLoc("loc-008", "zone-01", "R02", "S02", "B02", "available", 500),

  // Zone 2 - Quarantine (8 locations)
  makeLoc("loc-009", "zone-02", "R01", "S01", "B01", "occupied", 500, "itm-005", "Ibuprofen API", "BN-2026-0395", 300, "kg", daysAgo(3)),
  makeLoc("loc-010", "zone-02", "R01", "S01", "B02", "occupied", 500, "itm-006", "Lactose Monohydrate", "BN-2026-0396", 250, "kg", daysAgo(3)),
  makeLoc("loc-011", "zone-02", "R01", "S02", "B01", "occupied", 500, "itm-007", "Starch Maize", "BN-2026-0399", 100, "kg", daysAgo(2)),
  makeLoc("loc-012", "zone-02", "R01", "S02", "B02", "occupied", 500, "itm-008", "Colloidal Silicon Dioxide", "BN-2026-0400", 25, "kg", daysAgo(2)),
  makeLoc("loc-013", "zone-02", "R02", "S01", "B01", "occupied", 500, "itm-009", "Croscarmellose Sodium", "BN-2026-0402", 80, "kg", daysAgo(1)),
  makeLoc("loc-014", "zone-02", "R02", "S01", "B02", "occupied", 500, "itm-010", "Povidone K30", "BN-2026-0403", 40, "kg", daysAgo(1)),
  makeLoc("loc-015", "zone-02", "R02", "S02", "B01", "reserved", 500),
  makeLoc("loc-016", "zone-02", "R02", "S02", "B02", "available", 500),

  // Zone 3 - Approved Materials (12 locations)
  makeLoc("loc-017", "zone-03", "R01", "S01", "B01", "occupied", 500, "itm-011", "Paracetamol API (Released)", "BN-2026-0380", 500, "kg", daysAgo(10)),
  makeLoc("loc-018", "zone-03", "R01", "S01", "B02", "occupied", 500, "itm-012", "Ibuprofen API (Released)", "BN-2026-0375", 400, "kg", daysAgo(12)),
  makeLoc("loc-019", "zone-03", "R01", "S02", "B01", "occupied", 500, "itm-013", "MCC PH-102 (Released)", "BN-2026-0370", 300, "kg", daysAgo(15)),
  makeLoc("loc-020", "zone-03", "R01", "S02", "B02", "occupied", 500, "itm-014", "Lactose DCL-11 (Released)", "BN-2026-0372", 250, "kg", daysAgo(14)),
  makeLoc("loc-021", "zone-03", "R02", "S01", "B01", "occupied", 500, "itm-015", "Croscarmellose Na (Released)", "BN-2026-0365", 120, "kg", daysAgo(20)),
  makeLoc("loc-022", "zone-03", "R02", "S01", "B02", "occupied", 500, "itm-016", "Mg Stearate (Released)", "BN-2026-0368", 80, "kg", daysAgo(18)),
  makeLoc("loc-023", "zone-03", "R02", "S02", "B01", "occupied", 500, "itm-017", "Povidone K30 (Released)", "BN-2026-0360", 60, "kg", daysAgo(22)),
  makeLoc("loc-024", "zone-03", "R02", "S02", "B02", "occupied", 500, "itm-018", "HPMC E5 (Released)", "BN-2026-0358", 45, "kg", daysAgo(25)),
  makeLoc("loc-025", "zone-03", "R03", "S01", "B01", "occupied", 500, "itm-019", "Talc Powder (Released)", "BN-2026-0355", 90, "kg", daysAgo(28)),
  makeLoc("loc-026", "zone-03", "R03", "S01", "B02", "available", 500),
  makeLoc("loc-027", "zone-03", "R03", "S02", "B01", "available", 500),
  makeLoc("loc-028", "zone-03", "R03", "S02", "B02", "blocked", 500),

  // Zone 4 - Cold Storage (6 locations)
  makeLoc("loc-029", "zone-04", "R01", "S01", "B01", "occupied", 200, "itm-020", "Insulin API (2-8°C)", "BN-2026-0390", 10, "kg", daysAgo(5)),
  makeLoc("loc-030", "zone-04", "R01", "S01", "B02", "occupied", 200, "itm-021", "Vitamin B12 API (2-8°C)", "BN-2026-0388", 5, "kg", daysAgo(7)),
  makeLoc("loc-031", "zone-04", "R01", "S02", "B01", "occupied", 200, "itm-022", "Erythropoietin Bulk (2-8°C)", "BN-2026-0385", 2, "kg", daysAgo(8)),
  makeLoc("loc-032", "zone-04", "R01", "S02", "B02", "occupied", 200, "itm-023", "Reconstituted Enzyme (2-8°C)", "BN-2026-0382", 3, "kg", daysAgo(10)),
  makeLoc("loc-033", "zone-04", "R02", "S01", "B01", "available", 200),
  makeLoc("loc-034", "zone-04", "R02", "S01", "B02", "available", 200),

  // Zone 5 - Controlled Substances Vault (4 locations)
  makeLoc("loc-035", "zone-05", "R01", "S01", "B01", "occupied", 100, "itm-024", "Tramadol HCl API", "BN-2026-0350", 20, "kg", daysAgo(15)),
  makeLoc("loc-036", "zone-05", "R01", "S01", "B02", "occupied", 100, "itm-025", "Codeine Phosphate API", "BN-2026-0345", 10, "kg", daysAgo(20)),
  makeLoc("loc-037", "zone-05", "R01", "S02", "B01", "occupied", 100, "itm-026", "Phenobarbital Sodium API", "BN-2026-0340", 15, "kg", daysAgo(25)),
  makeLoc("loc-038", "zone-05", "R01", "S02", "B02", "available", 100),

  // Zone 6 - Finished Goods (6 locations)
  makeLoc("loc-039", "zone-06", "R01", "S01", "B01", "occupied", 500, "itm-027", "Paracetamol 500mg Tabs (FG)", "BN-FG-2026-0120", 5000, "packs", daysAgo(3)),
  makeLoc("loc-040", "zone-06", "R01", "S01", "B02", "occupied", 500, "itm-028", "Ibuprofen 400mg Tabs (FG)", "BN-FG-2026-0118", 3000, "packs", daysAgo(5)),
  makeLoc("loc-041", "zone-06", "R01", "S02", "B01", "occupied", 500, "itm-029", "Amoxicillin 500mg Caps (FG)", "BN-FG-2026-0115", 4000, "packs", daysAgo(7)),
  makeLoc("loc-042", "zone-06", "R01", "S02", "B02", "occupied", 500, "itm-030", "Omeprazole 20mg Caps (FG)", "BN-FG-2026-0112", 2500, "packs", daysAgo(10)),
  makeLoc("loc-043", "zone-06", "R02", "S01", "B01", "available", 500),
  makeLoc("loc-044", "zone-06", "R02", "S01", "B02", "available", 500),

  // Zone 7 - Shipping Dock (4 locations)
  makeLoc("loc-045", "zone-07", "R01", "S01", "B01", "occupied", 500, undefined, "Dispatch Order DO-4501", "BN-FG-2026-0110", 1200, "packs", daysAgo(0)),
  makeLoc("loc-046", "zone-07", "R01", "S01", "B02", "occupied", 500, undefined, "Dispatch Order DO-4502", "BN-FG-2026-0108", 800, "packs", daysAgo(0)),
  makeLoc("loc-047", "zone-07", "R01", "S02", "B01", "available", 500),
  makeLoc("loc-048", "zone-07", "R01", "S02", "B02", "available", 500),

  // Zone 8 - Returns / Rejected (2 locations)
  makeLoc("loc-049", "zone-08", "R01", "S01", "B01", "occupied", 500, undefined, "Returned - Paracetamol 500mg", "BN-FG-2026-0095", 200, "packs", daysAgo(5)),
  makeLoc("loc-050", "zone-08", "R01", "S01", "B02", "occupied", 500, undefined, "Rejected - Lactose (OOS)", "BN-2026-0310", 100, "kg", daysAgo(8)),
];

/* ── Seed: Storage Conditions ───────────────────────────── */

const SEED_CONDITIONS: StorageCondition[] = [
  {
    id: "cond-01", zoneId: "zone-01", timestamp: hoursAgo(0),
    temperature: 24.2, humidity: 48,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 31,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 30,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 67,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 65,
  },
  {
    id: "cond-02", zoneId: "zone-02", timestamp: hoursAgo(0),
    temperature: 22.5, humidity: 45,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 26,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 25,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 62,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 60,
  },
  {
    id: "cond-03", zoneId: "zone-03", timestamp: hoursAgo(0),
    temperature: 21.8, humidity: 44,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 26,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 25,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 62,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 60,
  },
  {
    id: "cond-04", zoneId: "zone-04", timestamp: hoursAgo(0),
    temperature: 5.3, humidity: 52,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 1, tempActionLimitHigh: 9,
    tempAlertLimitLow: 2, tempAlertLimitHigh: 8,
    humidityActionLimitLow: 33, humidityActionLimitHigh: 67,
    humidityAlertLimitLow: 35, humidityAlertLimitHigh: 65,
  },
  {
    id: "cond-05", zoneId: "zone-05", timestamp: hoursAgo(0),
    temperature: 22.0, humidity: 42,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 26,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 25,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 62,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 60,
  },
  {
    id: "cond-06", zoneId: "zone-06", timestamp: hoursAgo(0),
    temperature: 23.1, humidity: 46,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 26,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 25,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 62,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 60,
  },
  {
    id: "cond-07", zoneId: "zone-07", timestamp: hoursAgo(0),
    temperature: 25.8, humidity: 55,
    tempAlertLevel: "normal", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 31,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 30,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 67,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 65,
  },
  {
    id: "cond-08", zoneId: "zone-08", timestamp: hoursAgo(0),
    temperature: 22.4, humidity: 43,
    tempAlertLevel: "warning", humidityAlertLevel: "normal",
    tempActionLimitLow: 14, tempActionLimitHigh: 26,
    tempAlertLimitLow: 15, tempAlertLimitHigh: 25,
    humidityActionLimitLow: 28, humidityActionLimitHigh: 62,
    humidityAlertLimitLow: 30, humidityAlertLimitHigh: 60,
    notes: "Temperature sensor recalibration scheduled",
  },
];

/* ── Seed: Putaway Rules ────────────────────────────────── */

const SEED_PUTAWAY_RULES: PutawayRule[] = [
  { id: "pr-01", productCategory: "raw-material", preferredZoneId: "zone-03", fallbackZoneId: "zone-02",
    temperatureRequired: { min: 15, max: 25, unit: "C" }, priority: 1, active: true },
  { id: "pr-02", productCategory: "excipient", preferredZoneId: "zone-03", fallbackZoneId: "zone-02",
    temperatureRequired: { min: 15, max: 25, unit: "C" }, priority: 2, active: true },
  { id: "pr-03", productCategory: "cold-chain", preferredZoneId: "zone-04",
    temperatureRequired: { min: 2, max: 8, unit: "C" },
    specialInstructions: "Must maintain cold chain. Verify temperature logger upon receipt.", priority: 1, active: true },
  { id: "pr-04", productCategory: "controlled-substance", preferredZoneId: "zone-05",
    specialInstructions: "Dual-signature verification required. Update narcotics register.", priority: 1, active: true },
  { id: "pr-05", productCategory: "finished-goods", preferredZoneId: "zone-06", fallbackZoneId: "zone-03",
    priority: 1, active: true },
  { id: "pr-06", productCategory: "packaging-material", preferredZoneId: "zone-03", fallbackZoneId: "zone-01",
    priority: 3, active: true },
  { id: "pr-07", productCategory: "hazardous", preferredZoneId: "zone-02",
    specialInstructions: "Store away from incompatible materials. Ensure MSDS available.", priority: 1, active: true },
  { id: "pr-08", productCategory: "returned-goods", preferredZoneId: "zone-08",
    specialInstructions: "Quarantine immediately. Link to customer complaint / deviation.", priority: 1, active: true },
  { id: "pr-09", productCategory: "sample", preferredZoneId: "zone-02", fallbackZoneId: "zone-01",
    specialInstructions: "Label as sample. Notify QC for scheduling.", priority: 2, active: true },
];

/* ── Seed: Putaway Tasks ────────────────────────────────── */

const SEED_PUTAWAY_TASKS: PutawayTask[] = [
  { id: "pt-01", grnNumber: "GRN-2026-0451", itemName: "Paracetamol API", batchNumber: "BN-2026-0401",
    quantity: 200, unit: "kg", productCategory: "raw-material", suggestedZoneId: "zone-02",
    suggestedLocationId: "loc-015", assignedTo: "Ahmed Warehouse", status: "in-progress",
    priority: "high", createdAt: daysAgo(1) },
  { id: "pt-02", grnNumber: "GRN-2026-0452", itemName: "Microcrystalline Cellulose", batchNumber: "BN-2026-0398",
    quantity: 150, unit: "kg", productCategory: "excipient", suggestedZoneId: "zone-02",
    suggestedLocationId: "loc-016", assignedTo: "Ahmed Warehouse", status: "assigned",
    priority: "medium", createdAt: daysAgo(1) },
  { id: "pt-03", grnNumber: "GRN-2026-0453", itemName: "Magnesium Stearate", batchNumber: "BN-2026-0405",
    quantity: 50, unit: "kg", productCategory: "excipient", suggestedZoneId: "zone-02",
    status: "pending", priority: "medium", createdAt: daysAgo(0) },
  { id: "pt-04", grnNumber: "GRN-2026-0454", itemName: "PVC/PVDC Blister Film", batchNumber: "BN-2026-0410",
    quantity: 30, unit: "rolls", productCategory: "packaging-material", suggestedZoneId: "zone-03",
    status: "pending", priority: "low", createdAt: daysAgo(0) },
  { id: "pt-05", grnNumber: "GRN-2026-0449", itemName: "Insulin API (Cold Chain)", batchNumber: "BN-2026-0390",
    quantity: 10, unit: "kg", productCategory: "cold-chain", suggestedZoneId: "zone-04",
    suggestedLocationId: "loc-029", assignedTo: "Mohamed Cold Store", status: "completed",
    priority: "urgent", createdAt: daysAgo(5), completedAt: daysAgo(5) },
  { id: "pt-06", grnNumber: "GRN-2026-0450", itemName: "Tramadol HCl API", batchNumber: "BN-2026-0350",
    quantity: 20, unit: "kg", productCategory: "controlled-substance", suggestedZoneId: "zone-05",
    suggestedLocationId: "loc-035", assignedTo: "Pharmacist Hany", status: "completed",
    priority: "urgent", createdAt: daysAgo(15), completedAt: daysAgo(15) },
  { id: "pt-07", grnNumber: "GRN-2026-0455", itemName: "Vitamin B12 Bulk (Cold Chain)", batchNumber: "BN-2026-0412",
    quantity: 8, unit: "kg", productCategory: "cold-chain", suggestedZoneId: "zone-04",
    suggestedLocationId: "loc-033", status: "pending", priority: "urgent", createdAt: daysAgo(0) },
  { id: "pt-08", grnNumber: "GRN-2026-0448", itemName: "Ibuprofen API", batchNumber: "BN-2026-0395",
    quantity: 300, unit: "kg", productCategory: "raw-material", suggestedZoneId: "zone-02",
    suggestedLocationId: "loc-009", assignedTo: "Ahmed Warehouse", status: "completed",
    priority: "high", createdAt: daysAgo(3), completedAt: daysAgo(3) },
];

/* ── Seed: Picking Waves ────────────────────────────────── */

const SEED_PICKING_WAVES: PickingWave[] = [
  {
    id: "pw-01", waveNumber: "PW-2026-0081",
    orders: [
      { id: "po-01", orderNumber: "MO-2026-0315", itemName: "Paracetamol API (Released)", batchNumber: "BN-2026-0380", quantity: 100, unit: "kg", locationId: "loc-017", picked: true },
      { id: "po-02", orderNumber: "MO-2026-0315", itemName: "MCC PH-102 (Released)", batchNumber: "BN-2026-0370", quantity: 80, unit: "kg", locationId: "loc-019", picked: true },
      { id: "po-03", orderNumber: "MO-2026-0315", itemName: "Croscarmellose Na (Released)", batchNumber: "BN-2026-0365", quantity: 10, unit: "kg", locationId: "loc-021", picked: false },
    ],
    priority: "high", assignedTo: "Mohamed Picker", status: "in-progress",
    createdAt: daysAgo(0), releasedAt: daysAgo(0), totalItems: 3, pickedItems: 2,
  },
  {
    id: "pw-02", waveNumber: "PW-2026-0080",
    orders: [
      { id: "po-04", orderNumber: "DO-4501", itemName: "Paracetamol 500mg Tabs (FG)", batchNumber: "BN-FG-2026-0120", quantity: 1200, unit: "packs", locationId: "loc-039", picked: true },
      { id: "po-05", orderNumber: "DO-4502", itemName: "Ibuprofen 400mg Tabs (FG)", batchNumber: "BN-FG-2026-0118", quantity: 800, unit: "packs", locationId: "loc-040", picked: true },
    ],
    priority: "high", assignedTo: "Ali Dispatch", status: "completed",
    createdAt: daysAgo(1), releasedAt: daysAgo(1), completedAt: daysAgo(0), totalItems: 2, pickedItems: 2,
  },
  {
    id: "pw-03", waveNumber: "PW-2026-0082",
    orders: [
      { id: "po-06", orderNumber: "MO-2026-0316", itemName: "Ibuprofen API (Released)", batchNumber: "BN-2026-0375", quantity: 150, unit: "kg", locationId: "loc-018", picked: false },
      { id: "po-07", orderNumber: "MO-2026-0316", itemName: "Lactose DCL-11 (Released)", batchNumber: "BN-2026-0372", quantity: 100, unit: "kg", locationId: "loc-020", picked: false },
      { id: "po-08", orderNumber: "MO-2026-0316", itemName: "Mg Stearate (Released)", batchNumber: "BN-2026-0368", quantity: 5, unit: "kg", locationId: "loc-022", picked: false },
      { id: "po-09", orderNumber: "MO-2026-0316", itemName: "HPMC E5 (Released)", batchNumber: "BN-2026-0358", quantity: 15, unit: "kg", locationId: "loc-024", picked: false },
    ],
    priority: "medium", status: "draft",
    createdAt: daysAgo(0), totalItems: 4, pickedItems: 0,
  },
];

/* ── Seed: Cycle Counts ─────────────────────────────────── */

const SEED_CYCLE_COUNTS: CycleCount[] = [
  {
    id: "cc-01", countNumber: "CC-2026-0045", zoneId: "zone-03",
    scheduledDate: daysAgo(7), completedDate: daysAgo(7), assignedTo: "Inventory Auditor - Dina",
    status: "completed",
    items: [
      { locationId: "loc-017", expectedItem: "Paracetamol API (Released)", expectedQuantity: 500, countedQuantity: 498, variance: -2, variancePct: -0.4 },
      { locationId: "loc-018", expectedItem: "Ibuprofen API (Released)", expectedQuantity: 400, countedQuantity: 400, variance: 0, variancePct: 0 },
      { locationId: "loc-019", expectedItem: "MCC PH-102 (Released)", expectedQuantity: 305, countedQuantity: 300, variance: -5, variancePct: -1.6 },
      { locationId: "loc-020", expectedItem: "Lactose DCL-11 (Released)", expectedQuantity: 250, countedQuantity: 250, variance: 0, variancePct: 0 },
    ],
    totalLocations: 4, countedLocations: 4, varianceCount: 2,
    notes: "Minor variance in Paracetamol and MCC - likely dispensing rounding. Investigation raised.",
  },
  {
    id: "cc-02", countNumber: "CC-2026-0046", zoneId: "zone-04",
    scheduledDate: daysAgo(3), completedDate: daysAgo(3), assignedTo: "Inventory Auditor - Dina",
    status: "completed",
    items: [
      { locationId: "loc-029", expectedItem: "Insulin API (2-8°C)", expectedQuantity: 10, countedQuantity: 10, variance: 0, variancePct: 0 },
      { locationId: "loc-030", expectedItem: "Vitamin B12 API (2-8°C)", expectedQuantity: 5, countedQuantity: 5, variance: 0, variancePct: 0 },
      { locationId: "loc-031", expectedItem: "Erythropoietin Bulk (2-8°C)", expectedQuantity: 2, countedQuantity: 2, variance: 0, variancePct: 0 },
      { locationId: "loc-032", expectedItem: "Reconstituted Enzyme (2-8°C)", expectedQuantity: 3, countedQuantity: 3, variance: 0, variancePct: 0 },
    ],
    totalLocations: 4, countedLocations: 4, varianceCount: 0,
    notes: "Cold storage count - no discrepancies found.",
  },
  {
    id: "cc-03", countNumber: "CC-2026-0047", zoneId: "zone-05",
    scheduledDate: futureDays(2), assignedTo: "Pharmacist Hany",
    status: "scheduled",
    items: [
      { locationId: "loc-035", expectedItem: "Tramadol HCl API", expectedQuantity: 20 },
      { locationId: "loc-036", expectedItem: "Codeine Phosphate API", expectedQuantity: 10 },
      { locationId: "loc-037", expectedItem: "Phenobarbital Sodium API", expectedQuantity: 15 },
    ],
    totalLocations: 3, countedLocations: 0, varianceCount: 0,
    notes: "Monthly controlled substances count per EDA regulations.",
  },
  {
    id: "cc-04", countNumber: "CC-2026-0048", zoneId: "zone-06",
    scheduledDate: futureDays(5), assignedTo: "Inventory Auditor - Dina",
    status: "scheduled",
    items: [
      { locationId: "loc-039", expectedItem: "Paracetamol 500mg Tabs (FG)", expectedQuantity: 5000 },
      { locationId: "loc-040", expectedItem: "Ibuprofen 400mg Tabs (FG)", expectedQuantity: 3000 },
      { locationId: "loc-041", expectedItem: "Amoxicillin 500mg Caps (FG)", expectedQuantity: 4000 },
      { locationId: "loc-042", expectedItem: "Omeprazole 20mg Caps (FG)", expectedQuantity: 2500 },
    ],
    totalLocations: 4, countedLocations: 0, varianceCount: 0,
  },
  {
    id: "cc-05", countNumber: "CC-2026-0049", zoneId: "zone-02",
    scheduledDate: futureDays(8), assignedTo: "Inventory Auditor - Dina",
    status: "scheduled",
    items: [
      { locationId: "loc-009", expectedItem: "Ibuprofen API", expectedQuantity: 300 },
      { locationId: "loc-010", expectedItem: "Lactose Monohydrate", expectedQuantity: 250 },
      { locationId: "loc-011", expectedItem: "Starch Maize", expectedQuantity: 100 },
    ],
    totalLocations: 3, countedLocations: 0, varianceCount: 0,
  },
];

/* ── Seed: Transfers ────────────────────────────────────── */

const SEED_TRANSFERS: LocationTransfer[] = [
  {
    id: "tr-01", fromLocationId: "loc-009", toLocationId: "loc-018",
    itemName: "Ibuprofen API", batchNumber: "BN-2026-0375", quantity: 400, unit: "kg",
    reason: "QC Release - Moved from Quarantine to Approved", transferredBy: "Ahmed Warehouse",
    transferDate: daysAgo(12), approvedBy: "QC Manager - Dr. Fatma",
  },
  {
    id: "tr-02", fromLocationId: "loc-010", toLocationId: "loc-020",
    itemName: "Lactose DCL-11", batchNumber: "BN-2026-0372", quantity: 250, unit: "kg",
    reason: "QC Release - Moved from Quarantine to Approved", transferredBy: "Ahmed Warehouse",
    transferDate: daysAgo(14), approvedBy: "QC Manager - Dr. Fatma",
  },
  {
    id: "tr-03", fromLocationId: "loc-039", toLocationId: "loc-045",
    itemName: "Paracetamol 500mg Tabs (FG)", batchNumber: "BN-FG-2026-0110", quantity: 1200, unit: "packs",
    reason: "Dispatch staging for customer order CO-8801", transferredBy: "Ali Dispatch",
    transferDate: daysAgo(0),
  },
];

/* ── Store shape ──────────────────────────────────────────── */

interface StoreData {
  zones: WarehouseZone[];
  locations: StorageLocation[];
  conditions: StorageCondition[];
  putawayRules: PutawayRule[];
  putawayTasks: PutawayTask[];
  pickingWaves: PickingWave[];
  cycleCounts: CycleCount[];
  transfers: LocationTransfer[];
}

/* ── Singleton Store ──────────────────────────────────────── */

class WarehouseStore {
  private static instance: WarehouseStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): WarehouseStore {
    if (!WarehouseStore.instance) {
      WarehouseStore.instance = new WarehouseStore();
    }
    return WarehouseStore.instance;
  }

  /* ── persistence ────────────────────────────────────────── */

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: StoreData = {
        zones: SEED_ZONES,
        locations: SEED_LOCATIONS,
        conditions: SEED_CONDITIONS,
        putawayRules: SEED_PUTAWAY_RULES,
        putawayTasks: SEED_PUTAWAY_TASKS,
        pickingWaves: SEED_PICKING_WAVES,
        cycleCounts: SEED_CYCLE_COUNTS,
        transfers: SEED_TRANSFERS,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): StoreData {
    if (typeof window === "undefined") {
      return {
        zones: [], locations: [], conditions: [], putawayRules: [],
        putawayTasks: [], pickingWaves: [], cycleCounts: [], transfers: [],
      };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        zones: [], locations: [], conditions: [], putawayRules: [],
        putawayTasks: [], pickingWaves: [], cycleCounts: [], transfers: [],
      };
    }
    return JSON.parse(raw) as StoreData;
  }

  private save(data: StoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ── Zone CRUD ──────────────────────────────────────────── */

  getAllZones(): WarehouseZone[] {
    return this.load().zones;
  }

  getZoneById(id: string): WarehouseZone | undefined {
    return this.load().zones.find((z) => z.id === id);
  }

  getZonesByType(type: ZoneType): WarehouseZone[] {
    return this.load().zones.filter((z) => z.type === type);
  }

  getZonesByStatus(status: ZoneStatus): WarehouseZone[] {
    return this.load().zones.filter((z) => z.status === status);
  }

  updateZone(id: string, updates: Partial<WarehouseZone>): WarehouseZone | undefined {
    const data = this.load();
    const idx = data.zones.findIndex((z) => z.id === id);
    if (idx === -1) return undefined;
    data.zones[idx] = { ...data.zones[idx], ...updates };
    this.save(data);
    return data.zones[idx];
  }

  /* ── Location CRUD ──────────────────────────────────────── */

  getAllLocations(): StorageLocation[] {
    return this.load().locations;
  }

  getLocationById(id: string): StorageLocation | undefined {
    return this.load().locations.find((l) => l.id === id);
  }

  getLocationsByZone(zoneId: string): StorageLocation[] {
    return this.load().locations.filter((l) => l.zoneId === zoneId);
  }

  getLocationsByStatus(status: LocationStatus): StorageLocation[] {
    return this.load().locations.filter((l) => l.status === status);
  }

  getAvailableLocations(zoneId?: string): StorageLocation[] {
    const locs = this.load().locations.filter((l) => l.status === "available");
    if (zoneId) return locs.filter((l) => l.zoneId === zoneId);
    return locs;
  }

  updateLocation(id: string, updates: Partial<StorageLocation>): StorageLocation | undefined {
    const data = this.load();
    const idx = data.locations.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    data.locations[idx] = { ...data.locations[idx], ...updates };
    this.save(data);
    return data.locations[idx];
  }

  blockLocation(id: string, reason?: string): StorageLocation | undefined {
    return this.updateLocation(id, { status: "blocked" });
  }

  unblockLocation(id: string): StorageLocation | undefined {
    return this.updateLocation(id, { status: "available" });
  }

  transferItem(
    fromLocationId: string, toLocationId: string,
    transferredBy: string, reason: string, approvedBy?: string,
  ): LocationTransfer | undefined {
    const data = this.load();
    const fromIdx = data.locations.findIndex((l) => l.id === fromLocationId);
    const toIdx = data.locations.findIndex((l) => l.id === toLocationId);
    if (fromIdx === -1 || toIdx === -1) return undefined;
    const from = data.locations[fromIdx];
    if (from.status !== "occupied" || !from.currentItemName) return undefined;

    const transfer: LocationTransfer = {
      id: `tr-${Date.now()}`,
      fromLocationId,
      toLocationId,
      itemName: from.currentItemName,
      batchNumber: from.currentBatchNumber ?? "",
      quantity: from.currentQuantity ?? 0,
      unit: from.currentUnit ?? "",
      reason,
      transferredBy,
      transferDate: new Date().toISOString().slice(0, 10),
      approvedBy,
    };

    // Move item
    data.locations[toIdx] = {
      ...data.locations[toIdx],
      status: "occupied",
      currentItemId: from.currentItemId,
      currentItemName: from.currentItemName,
      currentBatchNumber: from.currentBatchNumber,
      currentQuantity: from.currentQuantity,
      currentUnit: from.currentUnit,
      lastActivityDate: transfer.transferDate,
    };
    data.locations[fromIdx] = {
      ...data.locations[fromIdx],
      status: "available",
      currentItemId: undefined,
      currentItemName: undefined,
      currentBatchNumber: undefined,
      currentQuantity: undefined,
      currentUnit: undefined,
      lastActivityDate: transfer.transferDate,
    };

    data.transfers.push(transfer);
    this.save(data);
    return transfer;
  }

  /* ── Conditions ─────────────────────────────────────────── */

  getAllConditions(): StorageCondition[] {
    return this.load().conditions;
  }

  getConditionByZone(zoneId: string): StorageCondition | undefined {
    return this.load().conditions.find((c) => c.zoneId === zoneId);
  }

  getConditionAlerts(): StorageCondition[] {
    return this.load().conditions.filter(
      (c) => c.tempAlertLevel !== "normal" || c.humidityAlertLevel !== "normal"
    );
  }

  /* ── Putaway Rules ──────────────────────────────────────── */

  getAllPutawayRules(): PutawayRule[] {
    return this.load().putawayRules;
  }

  suggestPutaway(productCategory: ProductCategory): {
    zone: WarehouseZone | undefined;
    location: StorageLocation | undefined;
    rule: PutawayRule | undefined;
  } {
    const data = this.load();
    const rule = data.putawayRules
      .filter((r) => r.productCategory === productCategory && r.active)
      .sort((a, b) => a.priority - b.priority)[0];

    if (!rule) return { zone: undefined, location: undefined, rule: undefined };

    const zone = data.zones.find((z) => z.id === rule.preferredZoneId);
    let location = data.locations.find(
      (l) => l.zoneId === rule.preferredZoneId && l.status === "available"
    );

    // Fallback zone
    if (!location && rule.fallbackZoneId) {
      location = data.locations.find(
        (l) => l.zoneId === rule.fallbackZoneId && l.status === "available"
      );
    }

    return { zone, location, rule };
  }

  /* ── Putaway Tasks ──────────────────────────────────────── */

  getAllPutawayTasks(): PutawayTask[] {
    return this.load().putawayTasks;
  }

  getPendingPutawayTasks(): PutawayTask[] {
    return this.load().putawayTasks.filter(
      (t) => t.status === "pending" || t.status === "assigned" || t.status === "in-progress"
    );
  }

  createPutawayTask(task: Omit<PutawayTask, "id" | "createdAt">): PutawayTask {
    const data = this.load();
    const newTask: PutawayTask = {
      ...task,
      id: `pt-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    data.putawayTasks.push(newTask);
    this.save(data);
    return newTask;
  }

  updatePutawayTask(id: string, updates: Partial<PutawayTask>): PutawayTask | undefined {
    const data = this.load();
    const idx = data.putawayTasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    data.putawayTasks[idx] = { ...data.putawayTasks[idx], ...updates };
    this.save(data);
    return data.putawayTasks[idx];
  }

  completePutawayTask(id: string): PutawayTask | undefined {
    return this.updatePutawayTask(id, {
      status: "completed",
      completedAt: new Date().toISOString().slice(0, 10),
    });
  }

  /* ── Picking Waves ──────────────────────────────────────── */

  getAllPickingWaves(): PickingWave[] {
    return this.load().pickingWaves;
  }

  getActivePickingWaves(): PickingWave[] {
    return this.load().pickingWaves.filter(
      (w) => w.status === "draft" || w.status === "released" || w.status === "in-progress"
    );
  }

  updatePickingWave(id: string, updates: Partial<PickingWave>): PickingWave | undefined {
    const data = this.load();
    const idx = data.pickingWaves.findIndex((w) => w.id === id);
    if (idx === -1) return undefined;
    data.pickingWaves[idx] = { ...data.pickingWaves[idx], ...updates };
    this.save(data);
    return data.pickingWaves[idx];
  }

  releasePickingWave(id: string, assignedTo: string): PickingWave | undefined {
    return this.updatePickingWave(id, {
      status: "released",
      assignedTo,
      releasedAt: new Date().toISOString().slice(0, 10),
    });
  }

  /* ── Cycle Counts ───────────────────────────────────────── */

  getAllCycleCounts(): CycleCount[] {
    return this.load().cycleCounts;
  }

  getScheduledCycleCounts(): CycleCount[] {
    return this.load().cycleCounts.filter((c) => c.status === "scheduled");
  }

  getCycleCountsByZone(zoneId: string): CycleCount[] {
    return this.load().cycleCounts.filter((c) => c.zoneId === zoneId);
  }

  createCycleCount(count: Omit<CycleCount, "id" | "countNumber">): CycleCount {
    const data = this.load();
    const num = data.cycleCounts.length + 50;
    const newCount: CycleCount = {
      ...count,
      id: `cc-${Date.now()}`,
      countNumber: `CC-2026-${String(num).padStart(4, "0")}`,
    };
    data.cycleCounts.push(newCount);
    this.save(data);
    return newCount;
  }

  updateCycleCount(id: string, updates: Partial<CycleCount>): CycleCount | undefined {
    const data = this.load();
    const idx = data.cycleCounts.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    data.cycleCounts[idx] = { ...data.cycleCounts[idx], ...updates };
    this.save(data);
    return data.cycleCounts[idx];
  }

  /* ── Transfers ──────────────────────────────────────────── */

  getAllTransfers(): LocationTransfer[] {
    return this.load().transfers;
  }

  /* ── Utilization ────────────────────────────────────────── */

  getUtilization(): ZoneUtilization[] {
    const data = this.load();
    return data.zones.map((z) => {
      const zoneLocs = data.locations.filter((l) => l.zoneId === z.id);
      const occupied = zoneLocs.filter((l) => l.status === "occupied").length;
      return {
        zoneId: z.id,
        zoneName: z.name,
        capacity: zoneLocs.length,
        occupied,
        utilizationPct: zoneLocs.length > 0 ? Math.round((occupied / zoneLocs.length) * 100) : 0,
      };
    });
  }

  /* ── Metrics ────────────────────────────────────────────── */

  getMetrics(): WarehouseMetrics {
    const data = this.load();
    const locs = data.locations;
    const occupied = locs.filter((l) => l.status === "occupied").length;
    const available = locs.filter((l) => l.status === "available").length;
    const reserved = locs.filter((l) => l.status === "reserved").length;
    const blocked = locs.filter((l) => l.status === "blocked").length;

    // Quarantine items
    const quarantineLocs = locs.filter(
      (l) => l.zoneId === "zone-02" && l.status === "occupied"
    );

    // Cold chain alerts
    const coldAlerts = data.conditions.filter(
      (c) => c.zoneId === "zone-04" && (c.tempAlertLevel !== "normal" || c.humidityAlertLevel !== "normal")
    ).length;

    // Pending putaways
    const pendingPutaways = data.putawayTasks.filter(
      (t) => t.status === "pending" || t.status === "assigned" || t.status === "in-progress"
    ).length;

    // Avg putaway time (from completed tasks, mock ~35 min)
    const completedPutaways = data.putawayTasks.filter((t) => t.status === "completed");
    const avgPutawayTime = completedPutaways.length > 0 ? 35 : 0;

    // Pick accuracy (from completed waves)
    const completedWaves = data.pickingWaves.filter((w) => w.status === "completed");
    const totalPicked = completedWaves.reduce((sum, w) => sum + w.totalItems, 0);
    const pickAccuracy = totalPicked > 0 ? 98.5 : 100;

    // Cycle count variance
    const completedCounts = data.cycleCounts.filter((c) => c.status === "completed");
    const totalCountItems = completedCounts.reduce((sum, c) => sum + c.items.length, 0);
    const varianceItems = completedCounts.reduce((sum, c) => sum + c.varianceCount, 0);
    const cycleCountVariance = totalCountItems > 0
      ? Math.round((varianceItems / totalCountItems) * 100 * 10) / 10
      : 0;

    // Temperature compliance
    const totalConditions = data.conditions.length;
    const normalConditions = data.conditions.filter(
      (c) => c.tempAlertLevel === "normal" && c.humidityAlertLevel === "normal"
    ).length;
    const tempCompliance = totalConditions > 0
      ? Math.round((normalConditions / totalConditions) * 100 * 10) / 10
      : 100;

    const zoneUtilizations = this.getUtilization();

    return {
      totalLocations: locs.length,
      occupiedLocations: occupied,
      availableLocations: available,
      reservedLocations: reserved,
      blockedLocations: blocked,
      overallUtilizationPct: locs.length > 0 ? Math.round((occupied / locs.length) * 100) : 0,
      zoneUtilizations,
      quarantineItemCount: quarantineLocs.length,
      coldChainAlerts: coldAlerts,
      pendingPutaways,
      avgPutawayTimeMinutes: avgPutawayTime,
      pickAccuracyPct: pickAccuracy,
      cycleCountVariancePct: cycleCountVariance,
      temperatureCompliance: tempCompliance,
    };
  }

  /* ── Search ─────────────────────────────────────────────── */

  searchLocations(query: string): StorageLocation[] {
    const q = query.toLowerCase();
    return this.load().locations.filter(
      (l) =>
        l.barcode.toLowerCase().includes(q) ||
        (l.currentItemName ?? "").toLowerCase().includes(q) ||
        (l.currentBatchNumber ?? "").toLowerCase().includes(q)
    );
  }

  getLowStock(threshold: number = 10): StorageLocation[] {
    return this.load().locations.filter(
      (l) => l.status === "occupied" && (l.currentQuantity ?? 0) <= threshold
    );
  }
}

export const warehouseStore = WarehouseStore.getInstance();
