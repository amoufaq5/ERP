"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Package, Truck, Factory, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { TraceabilityNode } from "@/lib/traceability/batch-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BatchTraceTreeProps {
  rootNode: TraceabilityNode;
  direction: "forward" | "backward";
  onNodeClick?: (batchId: string) => void;
}

// ---------------------------------------------------------------------------
// Node status detection — infer from product name / batch patterns
// ---------------------------------------------------------------------------

function inferStatus(node: TraceabilityNode): "released" | "quarantine" | "rejected" | "recalled" | "info" {
  const name = node.productName.toLowerCase();
  if (name.includes("supplier")) return "info";
  if (name.includes("shipment") || name.includes("customer")) return "released";
  // Default to released for actual batches
  return "released";
}

function statusColor(s: ReturnType<typeof inferStatus>): string {
  switch (s) {
    case "released":
      return "border-l-green-500";
    case "quarantine":
      return "border-l-yellow-500";
    case "rejected":
    case "recalled":
      return "border-l-red-500";
    case "info":
      return "border-l-blue-500";
  }
}

function statusBadgeVariant(s: ReturnType<typeof inferStatus>): "success" | "warning" | "destructive" | "default" {
  switch (s) {
    case "released":
      return "success";
    case "quarantine":
      return "warning";
    case "rejected":
    case "recalled":
      return "destructive";
    case "info":
      return "default";
  }
}

function nodeIcon(node: TraceabilityNode, direction: "forward" | "backward") {
  const name = node.productName.toLowerCase();
  if (name.includes("supplier")) return <Users className="h-4 w-4" />;
  if (name.includes("shipment") || name.includes("customer")) return <Truck className="h-4 w-4" />;
  if (direction === "backward" && node.level > 0) return <Package className="h-4 w-4" />;
  return <Factory className="h-4 w-4" />;
}

// ---------------------------------------------------------------------------
// Single tree node
// ---------------------------------------------------------------------------

function TreeNode({
  node,
  direction,
  onNodeClick,
}: {
  node: TraceabilityNode;
  direction: "forward" | "backward";
  onNodeClick?: (batchId: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.level < 2);
  const hasChildren = node.children.length > 0;
  const status = inferStatus(node);

  return (
    <div className="relative">
      {/* Connector line */}
      {node.level > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border -ml-4" />
      )}

      <div
        className={cn(
          "relative flex items-start gap-2 p-2 rounded-md border-l-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer mb-1",
          statusColor(status)
        )}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onNodeClick?.(node.batchId);
        }}
      >
        {/* Horizontal connector */}
        {node.level > 0 && (
          <div className="absolute -left-4 top-4 w-4 h-px bg-border" />
        )}

        {/* Expand/collapse */}
        <div className="flex-shrink-0 mt-0.5">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
          {nodeIcon(node, direction)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium truncate">
              {node.batchNumber}
            </span>
            <Badge variant={statusBadgeVariant(status)} className="text-[10px] px-1.5 py-0">
              {status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {node.productName}
          </p>
          {node.movements.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {node.movements.length} movement{node.movements.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-8 relative">
          {node.children.map((child, idx) => (
            <TreeNode
              key={`${child.batchId}-${idx}`}
              node={child}
              direction={direction}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BatchTraceTree({
  rootNode,
  direction,
  onNodeClick,
}: BatchTraceTreeProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="text-xs">
          {direction === "forward" ? "Forward Trace" : "Backward Trace"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {direction === "forward"
            ? "Raw materials -> Products -> Shipments"
            : "Product -> Raw materials -> Suppliers"}
        </span>
      </div>
      <TreeNode node={rootNode} direction={direction} onNodeClick={onNodeClick} />
    </div>
  );
}
