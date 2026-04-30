import { NextRequest, NextResponse } from "next/server";

interface OcrRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
}

interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
}

interface OcrResult {
  id: string;
  fileName: string;
  category: string;
  extractedText: string;
  fields: ExtractedField[];
  confidence: number;
  processedAt: string;
  pageCount: number;
  language: string;
}

// Simulated OCR extraction templates per document category
const extractionTemplates: Record<
  string,
  () => { text: string; fields: ExtractedField[]; confidence: number; pageCount: number }
> = {
  Invoice: () => {
    const invNum = `INV-${2024}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const amount = (Math.random() * 50000 + 500).toFixed(2);
    const tax = (parseFloat(amount) * 0.15).toFixed(2);
    const total = (parseFloat(amount) + parseFloat(tax)).toFixed(2);
    return {
      text: [
        "INVOICE",
        `Invoice Number: ${invNum}`,
        `Date: 2024-03-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
        `Due Date: 2024-04-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
        "",
        "From: PharmaCorp International Ltd.",
        "123 Business Park, Suite 400",
        "New York, NY 10001",
        "",
        "Bill To: MedSupply Co.",
        "456 Healthcare Blvd",
        "Boston, MA 02101",
        "",
        "Description                    Qty    Unit Price    Amount",
        "-------------------------------------------------------",
        `Amoxicillin 500mg (Box)         50     $12.50     $625.00`,
        `Ibuprofen 200mg (Bottle)       100      $8.75     $875.00`,
        `Surgical Gloves (Box of 100)    25     $15.00     $375.00`,
        "",
        `Subtotal: $${amount}`,
        `Tax (15%): $${tax}`,
        `Total Due: $${total}`,
        "",
        "Payment Terms: Net 30",
        "Bank: First National Bank",
        "Account: 1234567890",
        "Routing: 021000021",
      ].join("\n"),
      fields: [
        { label: "Invoice Number", value: invNum, confidence: 0.98 },
        { label: "Vendor Name", value: "PharmaCorp International Ltd.", confidence: 0.95 },
        { label: "Customer Name", value: "MedSupply Co.", confidence: 0.94 },
        { label: "Subtotal", value: `$${amount}`, confidence: 0.97 },
        { label: "Tax Amount", value: `$${tax}`, confidence: 0.96 },
        { label: "Total Amount", value: `$${total}`, confidence: 0.99 },
        { label: "Due Date", value: "2024-04-15", confidence: 0.93 },
        { label: "Payment Terms", value: "Net 30", confidence: 0.91 },
      ],
      confidence: 0.96,
      pageCount: 1,
    };
  },

  Receipt: () => {
    const rcpNum = `RCP-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const total = (Math.random() * 500 + 10).toFixed(2);
    return {
      text: [
        "RECEIPT",
        "================================",
        "MedPharm Retail Store",
        "789 Main Street",
        "Chicago, IL 60601",
        `Receipt #: ${rcpNum}`,
        `Date: 2024-03-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")} 14:32`,
        "",
        "Items Purchased:",
        "  Vitamin D3 1000IU x2       $15.98",
        "  Bandages (Pack)             $7.49",
        "  Hand Sanitizer 500ml        $5.99",
        "  Face Masks (50-pack)       $12.99",
        "--------------------------------",
        `Subtotal:                    $42.45`,
        `Tax (8.5%):                   $3.61`,
        `Total:                       $${total}`,
        "",
        "Payment Method: Visa **** 4532",
        "Auth Code: 847291",
        "",
        "Thank you for your purchase!",
      ].join("\n"),
      fields: [
        { label: "Receipt Number", value: rcpNum, confidence: 0.97 },
        { label: "Store Name", value: "MedPharm Retail Store", confidence: 0.96 },
        { label: "Total Amount", value: `$${total}`, confidence: 0.98 },
        { label: "Payment Method", value: "Visa **** 4532", confidence: 0.94 },
        { label: "Date", value: "2024-03-15 14:32", confidence: 0.95 },
        { label: "Tax", value: "$3.61", confidence: 0.93 },
      ],
      confidence: 0.94,
      pageCount: 1,
    };
  },

  Contract: () => {
    const contractNum = `CTR-${2024}-${String(Math.floor(Math.random() * 900) + 100)}`;
    return {
      text: [
        "SUPPLY AGREEMENT",
        "",
        `Contract Number: ${contractNum}`,
        "Effective Date: January 1, 2024",
        "Expiration Date: December 31, 2024",
        "",
        "PARTIES:",
        "  Party A (Buyer): HealthCare Systems Inc.",
        "  Party B (Supplier): PharmaCorp International Ltd.",
        "",
        "1. SCOPE OF AGREEMENT",
        "This agreement governs the supply of pharmaceutical products",
        "and medical equipment as outlined in Exhibit A.",
        "",
        "2. PRICING AND PAYMENT",
        "2.1 Pricing shall be as per the attached price list (Exhibit B).",
        "2.2 Payment terms: Net 45 days from invoice date.",
        "2.3 Volume discounts apply for orders exceeding $100,000.",
        "",
        "3. DELIVERY",
        "3.1 Standard delivery within 5 business days.",
        "3.2 Expedited delivery available at additional cost.",
        "",
        "4. QUALITY ASSURANCE",
        "All products must meet FDA and WHO quality standards.",
        "",
        "5. TERM AND TERMINATION",
        "Either party may terminate with 90 days written notice.",
        "",
        "Signed:",
        "  John Smith, CEO - HealthCare Systems Inc.",
        "  Sarah Johnson, VP Sales - PharmaCorp International Ltd.",
      ].join("\n"),
      fields: [
        { label: "Contract Number", value: contractNum, confidence: 0.97 },
        { label: "Party A", value: "HealthCare Systems Inc.", confidence: 0.94 },
        { label: "Party B", value: "PharmaCorp International Ltd.", confidence: 0.95 },
        { label: "Effective Date", value: "January 1, 2024", confidence: 0.96 },
        { label: "Expiration Date", value: "December 31, 2024", confidence: 0.96 },
        { label: "Payment Terms", value: "Net 45 days", confidence: 0.92 },
        { label: "Notice Period", value: "90 days", confidence: 0.91 },
      ],
      confidence: 0.93,
      pageCount: 4,
    };
  },

  "ID Document": () => {
    const idNum = `ID-${String(Math.floor(Math.random() * 9000000) + 1000000)}`;
    return {
      text: [
        "NATIONAL IDENTIFICATION CARD",
        "",
        `ID Number: ${idNum}`,
        "Full Name: Ahmed Hassan Al-Rashid",
        "Date of Birth: 1985-07-14",
        "Gender: Male",
        "Nationality: Saudi Arabian",
        "Place of Birth: Riyadh",
        "",
        "Address: 45 King Fahd Road",
        "         Riyadh 11564",
        "         Kingdom of Saudi Arabia",
        "",
        "Issue Date: 2022-01-15",
        "Expiry Date: 2027-01-14",
        "Issuing Authority: National ID Authority",
      ].join("\n"),
      fields: [
        { label: "ID Number", value: idNum, confidence: 0.99 },
        { label: "Full Name", value: "Ahmed Hassan Al-Rashid", confidence: 0.97 },
        { label: "Date of Birth", value: "1985-07-14", confidence: 0.98 },
        { label: "Nationality", value: "Saudi Arabian", confidence: 0.96 },
        { label: "Expiry Date", value: "2027-01-14", confidence: 0.97 },
        { label: "Gender", value: "Male", confidence: 0.99 },
      ],
      confidence: 0.97,
      pageCount: 1,
    };
  },

  Prescription: () => {
    const rxNum = `RX-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    return {
      text: [
        "PRESCRIPTION",
        "================================",
        "City General Hospital",
        "Department of Internal Medicine",
        "",
        `Rx Number: ${rxNum}`,
        `Date: 2024-03-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
        "",
        "Patient: Maria Garcia",
        "DOB: 1990-05-22",
        "MRN: MRN-2024-5567",
        "",
        "Prescribing Physician: Dr. James Wilson, MD",
        "License #: MD-45892",
        "",
        "MEDICATIONS:",
        "",
        "1. Amoxicillin 500mg",
        "   Sig: Take 1 capsule by mouth three times daily",
        "   Disp: #30 capsules",
        "   Refills: 0",
        "",
        "2. Omeprazole 20mg",
        "   Sig: Take 1 capsule by mouth once daily before breakfast",
        "   Disp: #30 capsules",
        "   Refills: 2",
        "",
        "3. Loratadine 10mg",
        "   Sig: Take 1 tablet by mouth once daily",
        "   Disp: #30 tablets",
        "   Refills: 3",
        "",
        "Notes: Patient to follow up in 2 weeks.",
        "Allergies: Penicillin (mild rash)",
      ].join("\n"),
      fields: [
        { label: "Rx Number", value: rxNum, confidence: 0.98 },
        { label: "Patient Name", value: "Maria Garcia", confidence: 0.96 },
        { label: "Patient DOB", value: "1990-05-22", confidence: 0.97 },
        { label: "Physician", value: "Dr. James Wilson, MD", confidence: 0.95 },
        { label: "Medication 1", value: "Amoxicillin 500mg - TID", confidence: 0.94 },
        { label: "Medication 2", value: "Omeprazole 20mg - QD", confidence: 0.93 },
        { label: "Medication 3", value: "Loratadine 10mg - QD", confidence: 0.94 },
        { label: "Allergies", value: "Penicillin (mild rash)", confidence: 0.91 },
      ],
      confidence: 0.95,
      pageCount: 1,
    };
  },

  "Lab Report": () => {
    const labId = `LAB-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    return {
      text: [
        "LABORATORY REPORT",
        "================================",
        "Central Diagnostics Laboratory",
        "Accreditation #: CAP-78432",
        "",
        `Report ID: ${labId}`,
        `Collection Date: 2024-03-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
        `Report Date: 2024-03-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
        "",
        "Patient: Robert Chen",
        "DOB: 1978-11-03",
        "MRN: MRN-2024-8832",
        "Ordering Physician: Dr. Lisa Park, MD",
        "",
        "TEST RESULTS:",
        "",
        "Complete Blood Count (CBC):",
        "  WBC:           7.2 x10^3/uL    [4.5-11.0]    Normal",
        "  RBC:           4.8 x10^6/uL    [4.5-5.5]     Normal",
        "  Hemoglobin:   14.2 g/dL        [13.5-17.5]   Normal",
        "  Hematocrit:   42.1 %           [38.0-50.0]   Normal",
        "  Platelets:   245 x10^3/uL      [150-400]     Normal",
        "",
        "Basic Metabolic Panel (BMP):",
        "  Glucose:     102 mg/dL         [70-100]      High",
        "  BUN:          18 mg/dL         [7-20]        Normal",
        "  Creatinine:  1.1 mg/dL        [0.7-1.3]     Normal",
        "  Sodium:     140 mEq/L          [136-145]     Normal",
        "  Potassium:   4.2 mEq/L         [3.5-5.0]     Normal",
        "",
        "Lipid Panel:",
        "  Total Cholesterol: 215 mg/dL   [<200]        High",
        "  LDL:              138 mg/dL    [<100]        High",
        "  HDL:               52 mg/dL    [>40]         Normal",
        "  Triglycerides:    148 mg/dL    [<150]        Normal",
        "",
        "Reviewed by: Dr. Amanda Foster, Pathologist",
      ].join("\n"),
      fields: [
        { label: "Report ID", value: labId, confidence: 0.98 },
        { label: "Patient Name", value: "Robert Chen", confidence: 0.97 },
        { label: "Patient DOB", value: "1978-11-03", confidence: 0.97 },
        { label: "Ordering Physician", value: "Dr. Lisa Park, MD", confidence: 0.95 },
        { label: "WBC", value: "7.2 x10^3/uL (Normal)", confidence: 0.96 },
        { label: "Hemoglobin", value: "14.2 g/dL (Normal)", confidence: 0.96 },
        { label: "Glucose", value: "102 mg/dL (High)", confidence: 0.97 },
        { label: "Total Cholesterol", value: "215 mg/dL (High)", confidence: 0.96 },
        { label: "LDL", value: "138 mg/dL (High)", confidence: 0.95 },
        { label: "Pathologist", value: "Dr. Amanda Foster", confidence: 0.93 },
      ],
      confidence: 0.96,
      pageCount: 2,
    };
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: OcrRequest = await req.json();
    const { fileName, fileType, fileSize, category } = body;

    if (!fileName || !category) {
      return NextResponse.json(
        { error: "fileName and category are required" },
        { status: 400 }
      );
    }

    const validCategories = [
      "Invoice",
      "Receipt",
      "Contract",
      "ID Document",
      "Prescription",
      "Lab Report",
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Simulate processing delay based on file size
    const templateFn = extractionTemplates[category];
    const extraction = templateFn();

    const result: OcrResult = {
      id: `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      fileName,
      category,
      extractedText: extraction.text,
      fields: extraction.fields,
      confidence: extraction.confidence,
      processedAt: new Date().toISOString(),
      pageCount: extraction.pageCount,
      language: category === "ID Document" ? "en/ar" : "en",
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
