import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory expiry items store.
 * In production this would be backed by a Prisma model; this provides
 * a working API so the UI -> store -> API chain is complete.
 */

export interface ExpiryItemRecord {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate?: string;
  quantity: number;
  unit: string;
  location: { warehouse: string; zone: string; shelf: string };
  status: string;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt: string;
}

const items: ExpiryItemRecord[] = [];
let seq = 1;

function generateId(): string {
  return `exp-item-${Date.now()}-${seq++}`;
}

export async function GET() {
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item: ExpiryItemRecord = {
      id: generateId(),
      productId: body.productId ?? '',
      productName: body.productName ?? '',
      batchNumber: body.batchNumber ?? '',
      expiryDate: body.expiryDate ?? '',
      manufacturingDate: body.manufacturingDate,
      quantity: body.quantity ?? 0,
      unit: body.unit ?? 'units',
      location: body.location ?? { warehouse: '', zone: '', shelf: '' },
      status: 'active',
      daysUntilExpiry: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(item);
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create expiry item' }, { status: 500 });
  }
}
