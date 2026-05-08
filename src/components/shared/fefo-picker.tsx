"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { FEFOPick } from "@/lib/expiry/expiry-types";
import { EXPIRY_THRESHOLDS } from "@/lib/expiry/expiry-types";
import { Package, CheckCircle } from "lucide-react";

interface FEFOPickerProps {
  productId: string;
  onPick?: (pick: FEFOPick) => void;
}

export default function FEFOPicker({ productId, onPick }: FEFOPickerProps) {
  const [requestedQty, setRequestedQty] = useState<number>(0);
  const [pick, setPick] = useState<FEFOPick | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleCalculate = useCallback(() => {
    if (requestedQty <= 0 || !productId) return;
    // Dynamic import to avoid SSR issues
    import("@/lib/expiry/expiry-store").then(({ expiryStore }) => {
      if (!expiryStore) return;
      const result = expiryStore.calculateFEFO(productId, requestedQty);
      setPick(result);
      setConfirmed(false);
    });
  }, [productId, requestedQty]);

  const handleConfirm = useCallback(() => {
    if (pick && onPick) {
      onPick(pick);
    }
    setConfirmed(true);
  }, [pick, onPick]);

  function daysUntil(dateStr: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getRowColor(days: number): string {
    if (days < EXPIRY_THRESHOLDS.critical) return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    if (days < EXPIRY_THRESHOLDS.warning) return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
    return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  }

  const totalPicked = pick?.picks.reduce((s, p) => s + p.quantity, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Requested Quantity
          </label>
          <input
            type="number"
            min={1}
            value={requestedQty || ""}
            onChange={(e) => setRequestedQty(Number(e.target.value))}
            placeholder="Enter quantity..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <button
          onClick={handleCalculate}
          disabled={requestedQty <= 0}
          className={cn(
            "h-10 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2",
            requestedQty > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Package className="h-4 w-4" />
          Calculate FEFO
        </button>
      </div>

      {/* Results */}
      {pick && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Suggested Picks for {pick.productName || "Product"}
            </h4>
            <span className="text-xs text-muted-foreground">
              {totalPicked} / {pick.requestedQty} units allocated
            </span>
          </div>

          {pick.picks.length === 0 ? (
            <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
              No available stock found for this product.
            </div>
          ) : (
            <div className="space-y-2">
              {pick.picks.map((p, idx) => {
                const days = daysUntil(p.expiryDate);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4",
                      getRowColor(days)
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-mono bg-background/60 rounded px-1.5 py-0.5 border border-border">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {p.batchNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground sm:ml-auto">
                      <span>
                        <strong className="text-foreground">{p.quantity}</strong> units
                      </span>
                      <span className="truncate max-w-[180px]" title={p.location}>
                        {p.location}
                      </span>
                      <span>
                        Exp: <strong className="text-foreground">{p.expiryDate}</strong>
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          days < EXPIRY_THRESHOLDS.critical
                            ? "text-red-600"
                            : days < EXPIRY_THRESHOLDS.warning
                            ? "text-yellow-600"
                            : "text-green-600"
                        )}
                      >
                        {days}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPicked < pick.requestedQty && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Warning: Only {totalPicked} of {pick.requestedQty} units available. Short by{" "}
              {pick.requestedQty - totalPicked} units.
            </p>
          )}

          {pick.picks.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={confirmed}
              className={cn(
                "h-10 px-6 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2",
                confirmed
                  ? "bg-green-600 text-white cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              {confirmed ? "Pick Confirmed" : "Confirm Pick"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
