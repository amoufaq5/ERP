import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/banking/reconciliation — List reconciliation sessions ─────────

export async function GET() {
  try {
    // Client-side data is handled by bank-client.ts getReconciliations()
    return NextResponse.json({
      success: true,
      data: [],
      message: "Use client-side getReconciliations() from bank-client for localStorage data",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch reconciliation sessions" },
      { status: 500 }
    );
  }
}

// ─── POST /api/banking/reconciliation — Start new reconciliation ────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, periodStart, periodEnd } = body;

    if (!accountId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: "accountId, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    if (new Date(periodEnd) <= new Date(periodStart)) {
      return NextResponse.json(
        { success: false, error: "periodEnd must be after periodStart" },
        { status: 400 }
      );
    }

    const session = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      accountId,
      periodStart,
      periodEnd,
      bankBalance: 0,
      bookBalance: 0,
      difference: 0,
      status: "in_progress" as const,
      matchedCount: 0,
      unmatchedCount: 0,
      adjustments: [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create reconciliation session" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/banking/reconciliation — Complete reconciliation ────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, action } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (action === "complete") {
      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          status: "completed",
          completedAt: new Date().toISOString(),
        },
      });
    }

    if (action === "add_adjustment") {
      const { type, description, amount, side } = body;
      if (!type || !description || amount == null || !side) {
        return NextResponse.json(
          { success: false, error: "type, description, amount, and side are required for adjustments" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          adjustment: {
            id: `adj-${Date.now()}`,
            type,
            description,
            amount,
            side,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'complete' or 'add_adjustment'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update reconciliation" },
      { status: 500 }
    );
  }
}
