// Batch/Lot Traceability — Trace Engine
// Builds forward/backward traceability trees and genealogy reports.

import type {
  Batch,
  BatchMovement,
  BatchEvent,
  TraceabilityNode,
} from "./batch-types";
import { batchStore } from "./batch-store";

// ---------------------------------------------------------------------------
// Forward trace: raw-material batch -> finished products -> shipments
// ---------------------------------------------------------------------------

export function traceForward(batchId: string): TraceabilityNode | null {
  const batch = batchStore.getBatchById(batchId);
  if (!batch) return null;

  const movements = batchStore.getMovements(batchId);

  const root: TraceabilityNode = {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    productName: batch.productName,
    direction: "forward",
    level: 0,
    children: [],
    movements,
  };

  // Find batches whose rawMaterials reference our batch's raw material batch numbers
  const allBatches = batchStore.getBatches();
  const visited = new Set<string>([batchId]);

  // Find finished product batches that consumed raw materials from this batch
  const childBatches = allBatches.filter((b) => {
    if (b.id === batchId) return false;
    return b.rawMaterials.some((rm) =>
      batch.rawMaterials.some((ourRm) => ourRm.batchNumber === rm.batchNumber)
    );
  });

  for (const child of childBatches) {
    if (visited.has(child.id)) continue;
    visited.add(child.id);

    const childMovements = batchStore.getMovements(child.id);
    const shipmentMovements = childMovements.filter(
      (m) => m.type === "issued" && m.referenceType === "SO"
    );

    const childNode: TraceabilityNode = {
      batchId: child.id,
      batchNumber: child.batchNumber,
      productName: child.productName,
      direction: "forward",
      level: 1,
      children: [],
      movements: childMovements,
    };

    // Add shipment nodes as level-2 children
    for (const shipment of shipmentMovements) {
      childNode.children.push({
        batchId: child.id,
        batchNumber: `${child.batchNumber} (Shipment)`,
        productName: `${shipment.toLocation || "Customer"} — ${shipment.quantity} units`,
        direction: "forward",
        level: 2,
        children: [],
        movements: [shipment],
      });
    }

    root.children.push(childNode);
  }

  // Also add shipments from the root batch itself
  const rootShipments = movements.filter(
    (m) => m.type === "issued" && m.referenceType === "SO"
  );
  for (const shipment of rootShipments) {
    root.children.push({
      batchId: batch.id,
      batchNumber: `${batch.batchNumber} (Shipment)`,
      productName: `${shipment.toLocation || "Customer"} — ${shipment.quantity} units`,
      direction: "forward",
      level: 1,
      children: [],
      movements: [shipment],
    });
  }

  return root;
}

// ---------------------------------------------------------------------------
// Backward trace: finished product -> raw materials -> suppliers
// ---------------------------------------------------------------------------

export function traceBackward(batchId: string): TraceabilityNode | null {
  const batch = batchStore.getBatchById(batchId);
  if (!batch) return null;

  const movements = batchStore.getMovements(batchId);

  const root: TraceabilityNode = {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    productName: batch.productName,
    direction: "backward",
    level: 0,
    children: [],
    movements,
  };

  // Raw materials are the direct children in backward trace
  for (const rm of batch.rawMaterials) {
    const materialNode: TraceabilityNode = {
      batchId: rm.materialId,
      batchNumber: rm.batchNumber,
      productName: rm.materialName,
      direction: "backward",
      level: 1,
      children: [],
      movements: [],
    };

    // Supplier as level 2
    if (rm.supplierId && rm.supplierName) {
      materialNode.children.push({
        batchId: rm.supplierId,
        batchNumber: rm.supplierId,
        productName: `Supplier: ${rm.supplierName}`,
        direction: "backward",
        level: 2,
        children: [],
        movements: [],
      });
    }

    root.children.push(materialNode);
  }

  return root;
}

// ---------------------------------------------------------------------------
// Affected batches (for recalls) — all batches sharing raw materials
// ---------------------------------------------------------------------------

export function getAffectedBatches(batchId: string): Batch[] {
  const batch = batchStore.getBatchById(batchId);
  if (!batch) return [];

  const allBatches = batchStore.getBatches();
  const rmBatchNumbers = new Set(batch.rawMaterials.map((rm) => rm.batchNumber));

  return allBatches.filter((b) => {
    if (b.id === batchId) return false;
    return b.rawMaterials.some((rm) => rmBatchNumbers.has(rm.batchNumber));
  });
}

// ---------------------------------------------------------------------------
// Full genealogy report
// ---------------------------------------------------------------------------

export interface GenealogyReport {
  batch: Batch;
  rawMaterials: Batch["rawMaterials"];
  movements: BatchMovement[];
  events: BatchEvent[];
  forwardTrace: TraceabilityNode | null;
  backwardTrace: TraceabilityNode | null;
}

export function generateGenealogyReport(batchId: string): GenealogyReport | null {
  const batch = batchStore.getBatchById(batchId);
  if (!batch) return null;

  return {
    batch,
    rawMaterials: batch.rawMaterials,
    movements: batchStore.getMovements(batchId),
    events: batchStore.getEvents(batchId),
    forwardTrace: traceForward(batchId),
    backwardTrace: traceBackward(batchId),
  };
}
