import { NextRequest, NextResponse } from 'next/server';

/**
 * Maintenance orders endpoint.
 * In production this would be backed by a Prisma model.
 * Currently returns empty data to complete the API chain.
 */

export async function GET() {
  return NextResponse.json({ data: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = {
      id: `mo-${Date.now()}`,
      orderNumber: `MO-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create maintenance order' }, { status: 500 });
  }
}
