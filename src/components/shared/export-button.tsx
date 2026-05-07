"use client";

// Dropdown export button supporting CSV, Excel, and PDF formats.
// Uses existing DropdownMenu and Button components from the UI library.

import React, { useState, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportButtonProps {
  /** Column headers for the export */
  headers: string[];
  /** Row data — each inner array matches headers by index */
  data: (string | number)[][];
  /** Base filename (without extension) */
  filename: string;
  /** Title shown on PDF reports (defaults to filename) */
  title?: string;
  /** Which formats to offer (default: all three) */
  formats?: ExportFormat[];
  /** Additional class names for the trigger button */
  className?: string;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Optional subtitle for PDF */
  subtitle?: string;
  /** Optional summary rows for PDF */
  summaryRows?: { label: string; value: string }[];
  /** Disabled state */
  disabled?: boolean;
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  csv: <Download className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "Download CSV",
  excel: "Download Excel",
  pdf: "Download PDF",
};

export function ExportButton({
  headers,
  data,
  filename,
  title,
  formats = ["csv", "excel", "pdf"],
  className,
  size = "sm",
  variant = "outline",
  subtitle,
  summaryRows,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (isExporting) return;
      setIsExporting(true);

      try {
        switch (format) {
          case "csv": {
            exportCSV(filename, headers, data);
            break;
          }
          case "excel": {
            const { exportToExcel } = await import("@/lib/export/excel-export");
            exportToExcel({
              filename,
              sheets: [
                {
                  name: title ?? filename,
                  headers,
                  data: data.map((row) =>
                    row.map((cell) => (cell == null ? "" : cell))
                  ),
                },
              ],
              metadata: { title: title ?? filename },
            });
            break;
          }
          case "pdf": {
            const { exportToPDF } = await import("@/lib/export/pdf-export");
            exportToPDF({
              filename,
              title: title ?? filename,
              subtitle,
              headers,
              data,
              orientation: headers.length > 6 ? "landscape" : "portrait",
              summaryRows,
            });
            break;
          }
        }
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, filename, headers, data, title, subtitle, summaryRows]
  );

  // If only one format, render a simple button
  if (formats.length === 1) {
    const fmt = formats[0];
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isExporting}
        onClick={() => handleExport(fmt)}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          FORMAT_ICONS[fmt]
        )}
        {FORMAT_LABELS[fmt]}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((fmt) => (
          <DropdownMenuItem
            key={fmt}
            onClick={() => handleExport(fmt)}
            className="cursor-pointer gap-2"
          >
            {FORMAT_ICONS[fmt]}
            {FORMAT_LABELS[fmt]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Inline CSV helper (no external dependency) ──────────────────────────────

function exportCSV(
  filename: string,
  headers: string[],
  data: (string | number)[][]
): void {
  const escape = (val: string | number): string => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [
    headers.map(escape).join(","),
    ...data.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
