import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/banking/transactions — List transactions with filters ─────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const matchStatus = searchParams.get("matchStatus");
    const type = searchParams.get("type");

    // In production this would query a database with filters
    // Client-side filtering is handled by bank-client.ts getTransactions()
    return NextResponse.json({
      success: true,
      data: [],
      filters: { accountId, dateFrom, dateTo, matchStatus, type },
      message: "Use client-side getTransactions() from bank-client for localStorage data",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// ─── POST /api/banking/transactions — Import bank statement ─────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, format, data } = body;

    if (!accountId || !data) {
      return NextResponse.json(
        { success: false, error: "accountId and data are required" },
        { status: 400 }
      );
    }

    const supportedFormats = ["csv", "mt940"];
    const statementFormat = (format || "csv").toLowerCase();

    if (!supportedFormats.includes(statementFormat)) {
      return NextResponse.json(
        { success: false, error: `Unsupported format. Use: ${supportedFormats.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse based on format
    let parsedTransactions: Array<{
      date: string;
      description: string;
      reference: string;
      amount: number;
      type: "credit" | "debit";
    }> = [];

    if (statementFormat === "csv") {
      const lines = data.trim().split("\n");
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p: string) => p.trim().replace(/"/g, ""));
        if (parts.length < 4) continue;
        const [date, description, reference, amountStr] = parts;
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;
        parsedTransactions.push({
          date,
          description,
          reference: reference || `IMP-${Date.now()}-${i}`,
          amount: Math.abs(amount),
          type: amount >= 0 ? "credit" : "debit",
        });
      }
    } else if (statementFormat === "mt940") {
      // Simplified MT940 simulation — parse key fields
      const blocks = data.split(":61:");
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const dateMatch = block.match(/^(\d{6})/);
        const amountMatch = block.match(/[CD](\d+[.,]\d{2})/);
        const refMatch = block.match(/\/\/(.+)/);
        const descMatch = block.match(/:86:(.+)/);

        if (dateMatch && amountMatch) {
          const rawDate = dateMatch[1];
          const year = "20" + rawDate.substring(0, 2);
          const month = rawDate.substring(2, 4);
          const day = rawDate.substring(4, 6);

          parsedTransactions.push({
            date: `${year}-${month}-${day}`,
            description: descMatch ? descMatch[1].trim() : "MT940 Transaction",
            reference: refMatch ? refMatch[1].trim() : `MT940-${Date.now()}-${i}`,
            amount: parseFloat(amountMatch[1].replace(",", ".")),
            type: block.includes("C") ? "credit" : "debit",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        format: statementFormat,
        accountId,
        importedCount: parsedTransactions.length,
        transactions: parsedTransactions.map((tx, idx) => ({
          id: `bt-imp-${Date.now()}-${idx}`,
          accountId,
          ...tx,
          balance: 0,
          matchStatus: "unmatched" as const,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to import bank statement" },
      { status: 500 }
    );
  }
}
