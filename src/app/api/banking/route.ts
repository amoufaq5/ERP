import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/banking — List connected bank accounts ────────────────────────

export async function GET() {
  try {
    // In a real app this would query a database; here we return a static shape
    // The actual data lives in localStorage on the client side
    return NextResponse.json({
      success: true,
      data: [],
      message: "Use client-side getAccounts() from bank-client for localStorage data",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

// ─── POST /api/banking — Add new bank account ──────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankName, accountNumber, iban, swift, currency, balance, isActive } = body;

    if (!bankName || !accountNumber || !currency) {
      return NextResponse.json(
        { success: false, error: "bankName, accountNumber, and currency are required" },
        { status: 400 }
      );
    }

    const newAccount = {
      id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      bankName,
      accountNumber,
      iban: iban || "",
      swift: swift || "",
      currency,
      balance: balance ?? 0,
      lastSynced: new Date().toISOString(),
      isActive: isActive ?? true,
    };

    return NextResponse.json({ success: true, data: newAccount }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}
