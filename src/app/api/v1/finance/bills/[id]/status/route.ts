import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const BillStatus = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']);

const statusTransitionSchema = z.object({
  status: BillStatus,
  approvedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'CANCELLED'],
  REJECTED: ['DRAFT'],
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

    const { status: newStatus, approvedBy, rejectionReason } = result.data;

    const bill = await (prisma as any).bill.findFirst({
      where: { id, tenantId },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const currentStatus = bill.status as string;
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

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'APPROVED' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date().toISOString();
    }
    if (newStatus === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updated = await (prisma as any).bill.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /finance/bills/:id/status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
