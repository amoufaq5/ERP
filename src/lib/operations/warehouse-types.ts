"use client";

/* ────────────────────────────────────────────────────────────
   Warehouse Zone Management  --  Type Definitions
   Egyptian Pharmaceutical GMP ERP
   ──────────────────────────────────────────────────────────── */

// ── Zone Types ────────────────────────────────────────────

export type ZoneType =
  | "receiving"
  | "quarantine"
  | "approved"
  | "rejected"
  | "cold-storage"
  | "controlled-substance"
  | "hazmat"
  | "shipping"
  | "returns";

export type ZoneStatus = "active" | "inactive" | "maintenance";

export interface TemperatureRange {
  min: number;
  max: number;
  unit: "C" | "F";
}

export interface HumidityRange {
  min: number;
  max: number;
}

export interface WarehouseZone {
  id: string;
  name: string;
  code: string;
  type: ZoneType;
  status: ZoneStatus;
  temperatureRange: TemperatureRange;
  humidityRange: HumidityRange;
  capacity: number;
  currentOccupancy: number;
  description: string;
  specialRequirements?: string[];
  gridRow: number;
  gridCol: number;
  gridWidth: number;
  gridHeight: number;
}

// ── Storage Locations ─────────────────────────────────────

export type LocationStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "blocked";

export interface StorageLocation {
  id: string;
  zoneId: string;
  rack: string;
  shelf: string;
  bin: string;
  barcode: string;
  status: LocationStatus;
  maxWeight: number;
  currentItemId?: string;
  currentItemName?: string;
  currentBatchNumber?: string;
  currentQuantity?: number;
  currentUnit?: string;
  lastActivityDate?: string;
}

// ── Storage Conditions ────────────────────────────────────

export type AlertLevel = "normal" | "warning" | "critical";

export interface StorageCondition {
  id: string;
  zoneId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  tempAlertLevel: AlertLevel;
  humidityAlertLevel: AlertLevel;
  tempActionLimitLow: number;
  tempActionLimitHigh: number;
  tempAlertLimitLow: number;
  tempAlertLimitHigh: number;
  humidityActionLimitLow: number;
  humidityActionLimitHigh: number;
  humidityAlertLimitLow: number;
  humidityAlertLimitHigh: number;
  monitoredBy?: string;
  notes?: string;
}

// ── Putaway Rules ─────────────────────────────────────────

export type ProductCategory =
  | "raw-material"
  | "excipient"
  | "packaging-material"
  | "finished-goods"
  | "cold-chain"
  | "controlled-substance"
  | "hazardous"
  | "returned-goods"
  | "sample";

export interface PutawayRule {
  id: string;
  productCategory: ProductCategory;
  preferredZoneId: string;
  fallbackZoneId?: string;
  temperatureRequired?: TemperatureRange;
  humidityRequired?: HumidityRange;
  specialInstructions?: string;
  priority: number;
  active: boolean;
}

// ── Putaway Task ──────────────────────────────────────────

export type PutawayStatus =
  | "pending"
  | "assigned"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface PutawayTask {
  id: string;
  grnNumber: string;
  itemName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  productCategory: ProductCategory;
  suggestedZoneId: string;
  suggestedLocationId?: string;
  assignedTo?: string;
  status: PutawayStatus;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  completedAt?: string;
}

// ── Picking Waves ─────────────────────────────────────────

export type PickingWaveStatus =
  | "draft"
  | "released"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface PickingOrder {
  id: string;
  orderNumber: string;
  itemName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  locationId: string;
  picked: boolean;
}

export interface PickingWave {
  id: string;
  waveNumber: string;
  orders: PickingOrder[];
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  status: PickingWaveStatus;
  createdAt: string;
  releasedAt?: string;
  completedAt?: string;
  totalItems: number;
  pickedItems: number;
}

// ── Cycle Count ───────────────────────────────────────────

export type CycleCountStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface CycleCountItem {
  locationId: string;
  expectedItem?: string;
  expectedQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePct?: number;
  notes?: string;
}

export interface CycleCount {
  id: string;
  countNumber: string;
  zoneId: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo: string;
  status: CycleCountStatus;
  items: CycleCountItem[];
  totalLocations: number;
  countedLocations: number;
  varianceCount: number;
  notes?: string;
}

// ── Warehouse Metrics ─────────────────────────────────────

export interface ZoneUtilization {
  zoneId: string;
  zoneName: string;
  capacity: number;
  occupied: number;
  utilizationPct: number;
}

export interface WarehouseMetrics {
  totalLocations: number;
  occupiedLocations: number;
  availableLocations: number;
  reservedLocations: number;
  blockedLocations: number;
  overallUtilizationPct: number;
  zoneUtilizations: ZoneUtilization[];
  quarantineItemCount: number;
  coldChainAlerts: number;
  pendingPutaways: number;
  avgPutawayTimeMinutes: number;
  pickAccuracyPct: number;
  cycleCountVariancePct: number;
  temperatureCompliance: number;
}

// ── Transfer ──────────────────────────────────────────────

export interface LocationTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  itemName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  reason: string;
  transferredBy: string;
  transferDate: string;
  approvedBy?: string;
}
