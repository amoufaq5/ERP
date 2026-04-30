import { NextRequest, NextResponse } from "next/server";

// ─── E-Invoice Detail API ────────────────────────────────────
// GET    — Get e-invoice details with ETA status
// DELETE — Cancel e-invoice submission
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // In production this would query the database.
  // Client-side handles lookups via localStorage.
  return NextResponse.json({
    message: `E-invoice ${id} details are managed client-side via localStorage.`,
    id,
    hint: "Use the eta-client module's getETAStatus(uuid) for status lookups.",
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Invoice ID is required" },
      { status: 400 }
    );
  }

  // Simulate cancellation on server side
  // In production this would call the ETA cancellation endpoint
  return NextResponse.json({
    success: true,
    message: `E-invoice ${id} cancellation request processed.`,
    id,
    status: "cancelled",
  });
}
