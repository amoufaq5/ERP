"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Check, X, Download, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ImportSchema,
  ParsedData,
  ValidationResult,
} from "@/lib/import/import-service";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ImportPreviewProps {
  data: ParsedData;
  schema: ImportSchema;
  validation: ValidationResult;
  mapping: Record<string, string>;
  onImport: (rows: Record<string, unknown>[]) => void;
  importing?: boolean;
}

type FilterMode = "all" | "valid" | "invalid";

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImportPreview({
  data,
  schema,
  validation,
  mapping,
  onImport,
  importing = false,
}: ImportPreviewProps) {
  const [filter, setFilter] = useState<FilterMode>("all");

  // Build reverse mapping: target field -> source column
  const reverseMap = useMemo(() => {
    const rm: Record<string, string> = {};
    for (const [src, tgt] of Object.entries(mapping)) {
      if (tgt) rm[tgt] = src;
    }
    return rm;
  }, [mapping]);

  // Mapped field names that are active
  const activeFields = useMemo(
    () => schema.fields.filter((f) => Object.values(mapping).includes(f.field)),
    [schema.fields, mapping],
  );

  // Build an error lookup: row number (1-based) -> errors
  const errorsByRow = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const inv of validation.invalid) {
      map.set(inv.row, inv.errors);
    }
    return map;
  }, [validation.invalid]);

  // Valid row indices (0-based)
  const validRowIndices = useMemo(
    () => new Set(validation.valid.map((v) => v.rowIndex)),
    [validation.valid],
  );

  // Filtered rows to display
  const displayRows = useMemo(() => {
    const rows = data.rows.map((row, idx) => ({
      index: idx,
      row,
      isValid: validRowIndices.has(idx),
      errors: errorsByRow.get(idx + 1) ?? [],
    }));

    switch (filter) {
      case "valid":
        return rows.filter((r) => r.isValid);
      case "invalid":
        return rows.filter((r) => !r.isValid);
      default:
        return rows;
    }
  }, [data.rows, validRowIndices, errorsByRow, filter]);

  // Handle import of valid rows
  const handleImport = useCallback(() => {
    const rows = validation.valid.map((v) => v.data as Record<string, unknown>);
    onImport(rows);
  }, [validation.valid, onImport]);

  // Download error report as CSV
  const handleDownloadErrors = useCallback(() => {
    if (validation.invalid.length === 0) return;

    const headers = ["Row", "Errors", ...activeFields.map((f) => f.label)];
    const lines = [headers.join(",")];

    for (const inv of validation.invalid) {
      const row = data.rows[inv.row - 1];
      const errorStr = `"${inv.errors.join("; ").replace(/"/g, '""')}"`;
      const values = activeFields.map((f) => {
        const sourceCol = reverseMap[f.field];
        const val = sourceCol ? (row?.[sourceCol] ?? "") : "";
        // Escape for CSV
        if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      lines.push([String(inv.row), errorStr, ...values].join(","));
    }

    const csv = lines.join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${schema.entityType}-import-errors.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [validation.invalid, data.rows, activeFields, reverseMap, schema.entityType]);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              {validation.totalValid} valid
            </Badge>
          </div>
          {validation.totalInvalid > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <X className="h-3 w-3" />
                {validation.totalInvalid} invalid
              </Badge>
            </div>
          )}
          <span className="text-sm text-muted-foreground">
            {validation.totalValid} of {validation.totalValid + validation.totalInvalid} rows valid
            {validation.totalInvalid > 0 && `, ${validation.totalInvalid} errors`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggles */}
          <div className="flex items-center rounded-md border border-border bg-background">
            {(["all", "valid", "invalid"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  mode === "all" && "rounded-l-md",
                  mode === "invalid" && "rounded-r-md",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-12 bg-background">#</TableHead>
              <TableHead className="sticky top-0 z-10 w-16 bg-background">Status</TableHead>
              {activeFields.map((field) => (
                <TableHead key={field.field} className="sticky top-0 z-10 bg-background">
                  {field.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeFields.length + 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  <Filter className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No rows match the current filter
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map(({ index, row, isValid, errors }) => (
                <TableRow
                  key={index}
                  className={cn(!isValid && "bg-red-50/50 dark:bg-red-950/10")}
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    {isValid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <ul className="list-disc space-y-1 pl-4 text-xs">
                              {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  {activeFields.map((field) => {
                    const sourceCol = reverseMap[field.field];
                    const value = sourceCol ? (row[sourceCol] ?? "") : "";
                    return (
                      <TableCell key={field.field}>
                        {value || (
                          <span className="text-muted-foreground italic">--</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {validation.totalInvalid > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
            <Download className="mr-2 h-4 w-4" />
            Download Error Report
          </Button>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleImport}
            disabled={validation.totalValid === 0 || importing}
            size="sm"
          >
            {importing ? "Importing..." : `Import ${validation.totalValid} Valid Rows`}
          </Button>
        </div>
      </div>
    </div>
  );
}
