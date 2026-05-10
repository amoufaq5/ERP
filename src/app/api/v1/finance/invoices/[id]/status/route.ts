import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const InvoiceStatus = z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'OVERDUE']);

const statusTransitionSchema = z.object({
  status: InvoiceStatus,
});

// Allowed transitions: from → [valid targets]
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'CANCELLED', 'OVERDUE'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json();

    const result = statusTransitionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { status: newStatus } = result.data;

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const currentStatus = invoice.status as string;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          allowedTransitions: allowed,
        },
        { status: 422 },
      );
    }

    const updated = await (prisma as any).invoice.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /finance/invoices/:id/status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
