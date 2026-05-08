// Batch/Lot Traceability — Core Type Definitions

export interface BatchMaterial {
  materialId: string;
  materialName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  supplierName?: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  manufacturedDate: string;
  expiryDate: string;
  status: "quarantine" | "released" | "rejected" | "recalled" | "expired";
  qcStatus: "pending" | "in-progress" | "passed" | "failed";
  manufacturingOrderId?: string;
  rawMaterials: BatchMaterial[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchMovement {
  id: string;
  batchId: string;
  type:
    | "received"
    | "issued"
    | "transferred"
    | "returned"
    | "adjusted"
    | "scrapped";
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  reason?: string;
  performedBy: string;
  performedAt: string;
  referenceType?: "PO" | "SO" | "WO" | "Transfer";
  referenceId?: string;
}

export interface TraceabilityNode {
  batchId: string;
  batchNumber: string;
  productName: string;
  direction: "forward" | "backward";
  level: number;
  children: TraceabilityNode[];
  movements: BatchMovement[];
}

export interface BatchEvent {
  id: string;
  batchId: string;
  eventType:
    | "created"
    | "qc-started"
    | "qc-passed"
    | "qc-failed"
    | "released"
    | "quarantined"
    | "shipped"
    | "recalled"
    | "expired";
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const BATCH_STATUS_COLORS: Record<Batch["status"], string> = {
  quarantine: "bg-yellow-100 text-yellow-800 border-yellow-300",
  released: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  recalled: "bg-red-200 text-red-900 border-red-400",
  expired: "bg-gray-100 text-gray-800 border-gray-300",
};

export const QC_STATUS_COLORS: Record<Batch["qcStatus"], string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-300",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-300",
  passed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};
