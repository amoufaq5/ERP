// Generate and download CSV templates for bulk import.

import { IMPORT_SCHEMAS } from "./import-schemas";

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_ROWS: Record<string, Record<string, string>[]> = {
  doctor: [
    {
      name: "Dr. Ahmed Hassan",
      specialty: "Cardiology",
      classification: "A",
      phone: "+201001234567",
      address: "12 Nile St, Dokki",
      hospital: "Cairo University Hospital",
      city: "Cairo",
      buId: "",
      assignedRepId: "",
    },
    {
      name: "Dr. Fatima El-Sayed",
      specialty: "Internal Medicine",
      classification: "B",
      phone: "+201112345678",
      address: "45 Tahrir Square",
      hospital: "Ain Shams Hospital",
      city: "Cairo",
      buId: "",
      assignedRepId: "",
    },
    {
      name: "Dr. Mohamed Ali",
      specialty: "Pediatrics",
      classification: "C",
      phone: "+201223456789",
      address: "8 Corniche Rd",
      hospital: "Alexandria General",
      city: "Alexandria",
      buId: "",
      assignedRepId: "",
    },
  ],
  territory: [
    {
      name: "Cairo Region",
      code: "REG-CAIRO",
      level: "1",
      parentCode: "",
      imsCode: "REG-CAIRO",
      geoShare: "35",
    },
    {
      name: "Heliopolis District",
      code: "DIST-HELIO",
      level: "2",
      parentCode: "REG-CAIRO",
      imsCode: "HELIOPOLIS I",
      geoShare: "12",
    },
    {
      name: "Nasr City District",
      code: "DIST-NASR",
      level: "2",
      parentCode: "REG-CAIRO",
      imsCode: "NASR CITY",
      geoShare: "10",
    },
  ],
  product: [
    {
      name: "Amoxicillin 500mg",
      sku: "AMX-500",
      category: "Antibiotics",
      price: "25.50",
      unit: "Box (20 tablets)",
      description: "Broad-spectrum antibiotic",
      barcode: "6221001234567",
    },
    {
      name: "Omeprazole 20mg",
      sku: "OMP-020",
      category: "Gastrointestinal",
      price: "18.75",
      unit: "Box (14 capsules)",
      description: "Proton pump inhibitor",
      barcode: "6221009876543",
    },
    {
      name: "Amlodipine 5mg",
      sku: "AML-005",
      category: "Cardiovascular",
      price: "32.00",
      unit: "Box (30 tablets)",
      description: "Calcium channel blocker",
      barcode: "6221005551234",
    },
  ],
  user: [
    {
      name: "Ahmed Mostafa",
      email: "ahmed@pharma.com",
      role: "MEDICAL_REP",
      department: "Sales",
      territory: "Cairo North",
    },
    {
      name: "Yasmin Salem",
      email: "yasmin@pharma.com",
      role: "DISTRICT_MANAGER",
      department: "Sales",
      territory: "Delta Region",
    },
    {
      name: "Hossam Tarek",
      email: "hossam@pharma.com",
      role: "BUM",
      department: "Executive",
      territory: "",
    },
  ],
};

// ─── CSV Generation ─────────────────────────────────────────────────────────

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCSV(headers: string[], rows: Record<string, string>[]): string {
  const headerLine = headers.map(escapeCSVField).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSVField(row[h] ?? "")).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

// ─── Download ───────────────────────────────────────────────────────────────

/**
 * Generate and download a CSV template with sample data for the given entity type.
 */
export function downloadTemplate(entityType: string): void {
  const schema = IMPORT_SCHEMAS[entityType];
  if (!schema) {
    throw new Error(`No import schema found for entity type: ${entityType}`);
  }

  const headers = schema.fields.map((f) => f.label);
  const samples = SAMPLE_ROWS[entityType] ?? [];

  // Map sample data from field keys to label keys
  const sampleRows = samples.map((sample) => {
    const row: Record<string, string> = {};
    for (const field of schema.fields) {
      row[field.label] = sample[field.field] ?? "";
    }
    return row;
  });

  const csv = generateCSV(headers, sampleRows);

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${entityType}-import-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
