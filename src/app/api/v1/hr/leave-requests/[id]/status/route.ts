import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const LeaveStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN']);

const statusTransitionSchema = z.object({
  status: LeaveStatus,
  approverId: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  WITHDRAWN: [],
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

    const { status: newStatus, approverId, rejectionReason } = result.data;

    const leaveRequest = await (prisma as any).leaveRequest.findFirst({
      where: { id, tenantId },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const currentStatus = leaveRequest.status as string;
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
    if (newStatus === 'APPROVED' && approverId) {
      updateData.approverId = approverId;
      updateData.approvedAt = new Date().toISOString();
    }
    if (newStatus === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updated = await (prisma as any).leaveRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /hr/leave-requests/:id/status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
