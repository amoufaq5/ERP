// PDF export utility — client-side only.
// Uses jsPDF + jspdf-autotable for formatted reports with tables.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  headers: string[];
  data: (string | number)[][];
  footer?: string;
  logo?: boolean;
  metadata?: {
    author?: string;
    company?: string;
  };
  summaryRows?: { label: string; value: string }[];
}

// Teal color scheme matching the app
const COLORS = {
  primary: [13, 148, 136] as [number, number, number],       // teal-600
  primaryDark: [15, 118, 110] as [number, number, number],    // teal-700
  primaryLight: [204, 251, 241] as [number, number, number],  // teal-100
  headerText: [255, 255, 255] as [number, number, number],
  bodyText: [15, 23, 42] as [number, number, number],         // slate-900
  mutedText: [100, 116, 139] as [number, number, number],     // slate-500
  borderColor: [226, 232, 240] as [number, number, number],   // slate-200
  altRowBg: [248, 250, 252] as [number, number, number],      // slate-50
};

/**
 * Export data to a formatted PDF and trigger a browser download.
 *
 * Features:
 * - A4 page with proper margins
 * - Company header with title and generation date
 * - Optional summary section before the table
 * - Auto-table with styled headers and data
 * - Page numbers in footer
 * - Teal color scheme matching the app
 */
export function exportToPDF(options: PDFExportOptions): void {
  if (typeof window === "undefined") return;

  const {
    filename,
    title,
    subtitle,
    orientation = "portrait",
    headers,
    data,
    footer,
    metadata,
    summaryRows,
  } = options;

  const company = metadata?.company ?? "Pharma Enterprise";
  const author = metadata?.author ?? company;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Set document properties
  doc.setProperties({
    title,
    author,
    creator: company,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let yPos = 16;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title text
  doc.setTextColor(...COLORS.headerText);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, marginLeft, 12);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, marginLeft, 19);
  }

  // Company name and date (right side)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(company, pageWidth - marginRight, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, pageWidth - marginRight, 16, {
    align: "right",
  });

  yPos = 36;

  // ── Summary section ───────────────────────────────────────────────────────
  if (summaryRows && summaryRows.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.bodyText);
    doc.text("Summary", marginLeft, yPos);
    yPos += 6;

    doc.setFontSize(9);
    for (const row of summaryRows) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primaryDark);
      doc.text(`${row.label}:`, marginLeft + 2, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.bodyText);
      doc.text(row.value, marginLeft + 50, yPos);
      yPos += 5;
    }

    yPos += 4;

    // Separator line
    doc.setDrawColor(...COLORS.borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
    yPos += 6;
  }

  // ── Data table ────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: data.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
    margin: { left: marginLeft, right: marginRight },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: COLORS.bodyText,
      lineColor: COLORS.borderColor,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.headerText,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: COLORS.altRowBg,
    },
    tableLineColor: COLORS.borderColor,
    tableLineWidth: 0.2,
    didDrawPage: (pageData) => {
      // ── Page numbers footer ─────────────────────────────────────────────
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageCount = doc.getNumberOfPages();
      const currentPage = pageData.pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(...COLORS.mutedText);
      doc.setFont("helvetica", "normal");

      // Page number
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth - marginRight,
        pageHeight - 8,
        { align: "right" }
      );

      // Footer text or default
      const footerText =
        footer ?? "Confidential — generated by Pharma Enterprise Suite";
      doc.text(footerText, marginLeft, pageHeight - 8);
    },
  });

  // Save / download
  doc.save(ensureExtension(filename, ".pdf"));
}

function ensureExtension(filename: string, ext: string): string {
  return filename.endsWith(ext) ? filename : `${filename}${ext}`;
}
