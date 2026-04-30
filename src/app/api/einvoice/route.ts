import { NextRequest, NextResponse } from "next/server";

// ─── E-Invoice API ───────────────────────────────────────────
// GET  — List submitted e-invoices with status
// POST — Submit invoice to ETA (simulated)
//
// Note: since localStorage is not available server-side, these
// endpoints return guidance responses and the actual logic
// runs client-side via the eta-client module.
// ─────────────────────────────────────────────────────────────

export async function GET() {
  // In a real deployment this would query the database.
  // The client-side manages e-invoice state via localStorage.
  return NextResponse.json({
    message: "E-invoices are managed client-side via localStorage. Use the eta-client module.",
    endpoints: {
      "GET /api/einvoice": "List all e-invoices",
      "POST /api/einvoice": "Submit a new e-invoice to ETA",
      "GET /api/einvoice/[id]": "Get e-invoice details",
      "DELETE /api/einvoice/[id]": "Cancel an e-invoice",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const { issuerTaxId, receiverName, receiverTaxId, invoiceLines } = body;

    if (!issuerTaxId) {
      return NextResponse.json(
        { error: "Issuer Tax ID is required" },
        { status: 400 }
      );
    }

    if (!receiverName || !receiverTaxId) {
      return NextResponse.json(
        { error: "Receiver name and Tax ID are required" },
        { status: 400 }
      );
    }

    if (!invoiceLines || !Array.isArray(invoiceLines) || invoiceLines.length === 0) {
      return NextResponse.json(
        { error: "At least one invoice line is required" },
        { status: 400 }
      );
    }

    // Validate each line
    for (const line of invoiceLines) {
      if (!line.itemCode) {
        return NextResponse.json(
          { error: `Item code is required for line: ${line.description || "(no description)"}` },
          { status: 400 }
        );
      }
      if (!line.quantity || line.quantity <= 0) {
        return NextResponse.json(
          { error: `Quantity must be positive for line: ${line.description || "(no description)"}` },
          { status: 400 }
        );
      }
    }

    // Simulate ETA submission (server-side)
    const uuid = generateUUID();
    const submissionId = `SUB-${Date.now()}`;
    const longId = `${uuid}${Date.now()}`;
    const accepted = Math.random() > 0.1;

    const result = {
      success: accepted,
      uuid,
      submissionId,
      longId: accepted ? longId : undefined,
      status: accepted ? "accepted" : "rejected",
      rejectionReason: accepted
        ? undefined
        : "Simulated rejection: Item code format does not match ETA registry",
    };

    return NextResponse.json(result, { status: accepted ? 201 : 422 });
  } catch {
    return NextResponse.json(
      { error: "Failed to process e-invoice submission" },
      { status: 500 }
    );
  }
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
