"use client";

// React hook for triggering CSV, Excel, and PDF exports with loading state.

import { useState, useCallback } from "react";
import type { ExcelExportOptions } from "./excel-export";
import type { PDFExportOptions } from "./pdf-export";

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  /** Export to CSV (lightweight — no extra dependency). */
  const exportCSV = useCallback(
    (filename: string, headers: string[], data: string[][]) => {
      if (typeof window === "undefined") return;

      setIsExporting(true);
      try {
        const escape = (val: string): string => {
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        const csv = [
          headers.map(escape).join(","),
          ...data.map((row) => row.map(escape).join(",")),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        triggerDownload(blob, ensureExt(filename, ".csv"));
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  /** Export to Excel (.xlsx) — dynamically imports SheetJS. */
  const exportExcel = useCallback(async (options: ExcelExportOptions) => {
    if (typeof window === "undefined") return;

    setIsExporting(true);
    try {
      const { exportToExcel } = await import("./excel-export");
      exportToExcel(options);
    } finally {
      setIsExporting(false);
    }
  }, []);

  /** Export to PDF — dynamically imports jsPDF + autotable. */
  const exportPDF = useCallback(async (options: PDFExportOptions) => {
    if (typeof window === "undefined") return;

    setIsExporting(true);
    try {
      const { exportToPDF } = await import("./pdf-export");
      exportToPDF(options);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportCSV, exportExcel, exportPDF, isExporting };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureExt(filename: string, ext: string): string {
  return filename.endsWith(ext) ? filename : `${filename}${ext}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
