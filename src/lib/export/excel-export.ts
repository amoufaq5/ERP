// Excel (XLSX) export utility — client-side only.
// Uses SheetJS (xlsx) to build multi-sheet workbooks with styled headers.

import * as XLSX from "xlsx";

export interface ExcelSheetDef {
  name: string;
  headers: string[];
  data: (string | number | Date | null | undefined)[][];
  columnWidths?: number[];
}

export interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheetDef[];
  metadata?: {
    title?: string;
    author?: string;
    company?: string;
    createdDate?: Date;
  };
}

/**
 * Auto-calculate column widths based on header lengths and data content.
 * Returns an array of `{ wch }` objects for XLSX.
 */
function autoColumnWidths(
  headers: string[],
  data: (string | number | Date | null | undefined)[][]
): XLSX.ColInfo[] {
  return headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of data) {
      const cell = row[colIdx];
      if (cell != null) {
        const len = String(cell).length;
        if (len > maxLen) maxLen = len;
      }
    }
    // Cap column width at 60 characters
    return { wch: Math.min(maxLen + 2, 60) };
  });
}

/**
 * Format a cell value for Excel: convert Dates to ISO strings, nulls to empty.
 */
function formatCell(value: string | number | Date | null | undefined): string | number {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

/**
 * Export data to an Excel (.xlsx) file and trigger a browser download.
 *
 * Supports multiple sheets, auto-sized columns, bold header rows with a
 * teal background, and proper date/number formatting.
 */
export function exportToExcel(options: ExcelExportOptions): void {
  if (typeof window === "undefined") return;

  const { filename, sheets, metadata } = options;

  const workbook = XLSX.utils.book_new();

  // Set workbook properties if metadata provided
  if (metadata) {
    workbook.Props = {
      Title: metadata.title ?? filename,
      Author: metadata.author ?? metadata.company ?? "Pharma Enterprise",
      Company: metadata.company ?? "Pharma Enterprise",
      CreatedDate: metadata.createdDate ?? new Date(),
    };
  }

  for (const sheet of sheets) {
    const { name, headers, data, columnWidths } = sheet;

    // Build AOA (array of arrays) — headers + data
    const aoa: (string | number)[][] = [
      headers,
      ...data.map((row) => row.map(formatCell)),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    worksheet["!cols"] = columnWidths
      ? columnWidths.map((w) => ({ wch: w }))
      : autoColumnWidths(headers, data);

    // Style the header row (bold + teal background).
    // SheetJS community edition supports cell styling via the `s` property
    // when writing with bookType "xlsx".
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellRef];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0D9488" } }, // teal-600
          alignment: { horizontal: "center" },
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31)); // sheet name max 31 chars
  }

  // Write workbook to binary array and trigger download
  const wbout = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  triggerDownload(blob, ensureExtension(filename, ".xlsx"));
}

function ensureExtension(filename: string, ext: string): string {
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
