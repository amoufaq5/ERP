"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { MatchRecord, MatchLineItem } from "@/lib/operations/matching-types";

/* ────────────────────────────────────────────────────────────
   3-Column Comparison Component
   PO | GRN | Invoice — side by side with variance highlights
   ──────────────────────────────────────────────────────────── */

interface MatchComparisonProps {
  record: MatchRecord;
  className?: string;
}

function statusIcon(status: MatchLineItem["lineStatus"]) {
  switch (status) {
    case "match":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "within-tolerance":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "mismatch":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function varianceColor(status: MatchLineItem["lineStatus"]) {
  switch (status) {
    case "match":
      return "bg-green-50 dark:bg-green-950/30";
    case "within-tolerance":
      return "bg-yellow-50 dark:bg-yellow-950/30";
    case "mismatch":
      return "bg-red-50 dark:bg-red-950/30";
  }
}

export default function MatchComparison({ record, className }: MatchComparisonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Document header summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* PO Column */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Purchase Order
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{record.poNumber}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(record.poDate).toLocaleDateString("en-EG")}
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
            {formatCurrency(record.totalPOAmount)} {record.currency}
          </p>
        </div>

        {/* GRN Column */}
        <div
          className={cn(
            "rounded-lg border p-3",
            record.grnNumber
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-dashed border-muted-foreground/30 bg-muted/30"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Goods Receipt
          </p>
          {record.grnNumber ? (
            <>
              <p className="mt-1 text-sm font-bold text-foreground">{record.grnNumber}</p>
              <p className="text-xs text-muted-foreground">
                {record.grnDate ? new Date(record.grnDate).toLocaleDateString("en-EG") : "—"}
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(record.totalGRNAmount)} {record.currency}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm italic text-muted-foreground">Not yet received</p>
          )}
        </div>

        {/* Invoice Column */}
        <div
          className={cn(
            "rounded-lg border p-3",
            record.invoiceNumber
              ? "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20"
              : "border-dashed border-muted-foreground/30 bg-muted/30"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Invoice
          </p>
          {record.invoiceNumber ? (
            <>
              <p className="mt-1 text-sm font-bold text-foreground">{record.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">
                {record.invoiceDate ? new Date(record.invoiceDate).toLocaleDateString("en-EG") : "—"}
              </p>
              <p className="mt-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                {formatCurrency(record.totalInvoiceAmount)} {record.currency}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm italic text-muted-foreground">Not yet invoiced</p>
          )}
        </div>
      </div>

      {/* Line-by-line comparison table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-center">
                <span className="text-blue-700 dark:text-blue-400">Qty Ordered</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-emerald-700 dark:text-emerald-400">Qty Received</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-purple-700 dark:text-purple-400">Qty Invoiced</span>
              </TableHead>
              <TableHead className="text-center">Qty Var %</TableHead>
              <TableHead className="text-right">
                <span className="text-blue-700 dark:text-blue-400">PO Price</span>
              </TableHead>
              <TableHead className="text-right">
                <span className="text-purple-700 dark:text-purple-400">Inv Price</span>
              </TableHead>
              <TableHead className="text-center">Price Var %</TableHead>
              <TableHead className="w-10 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.lineItems.map((li) => (
              <TableRow key={li.id} className={varianceColor(li.lineStatus)}>
                <TableCell className="text-xs text-muted-foreground">{li.lineNumber}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{li.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {li.itemCode} | {li.uom}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono text-sm">{li.qtyOrdered}</TableCell>
                <TableCell className="text-center font-mono text-sm">
                  {record.grnNumber ? li.qtyReceived : "—"}
                </TableCell>
                <TableCell className="text-center font-mono text-sm">
                  {record.invoiceNumber ? li.qtyInvoiced : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {li.qtyVariancePct > 0 ? (
                    <Badge
                      variant={li.lineStatus === "mismatch" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {li.qtyVariancePct}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0%</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(li.unitPricePO)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {record.invoiceNumber ? formatCurrency(li.unitPriceInvoice) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {li.priceVariancePct > 0 ? (
                    <Badge
                      variant={li.lineStatus === "mismatch" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {li.priceVariancePct}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0%</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{statusIcon(li.lineStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center justify-between rounded-lg border bg-blue-50/30 dark:bg-blue-950/10 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">PO Total</span>
          <span className="text-sm font-bold">
            {formatCurrency(record.totalPOAmount)} {record.currency}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">GRN Total</span>
          <span className="text-sm font-bold">
            {record.grnNumber
              ? `${formatCurrency(record.totalGRNAmount)} ${record.currency}`
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-purple-50/30 dark:bg-purple-950/10 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Invoice Total</span>
          <span className="text-sm font-bold">
            {record.invoiceNumber
              ? `${formatCurrency(record.totalInvoiceAmount)} ${record.currency}`
              : "—"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" /> Exact match
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-yellow-500" /> Within tolerance
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-500" /> Mismatch
        </span>
      </div>
    </div>
  );
}
