import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const statusTransitions: Record<string, string[]> = {
  'OPEN': ['INVESTIGATION'],
  'INVESTIGATION': ['ACTION_PLAN', 'CLOSED'],
  'ACTION_PLAN': ['IMPLEMENTATION'],
  'IMPLEMENTATION': ['VERIFICATION'],
  'VERIFICATION': ['CLOSED', 'IMPLEMENTATION'],
};

const statusSchema = z.object({
  status: z.string(),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json();

    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { status: newStatus } = validation.data;

    const existing = await (prisma as any).cAPA.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allowed = statusTransitions[existing.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${newStatus}` },
        { status: 422 },
      );
    }

    const updated = await (prisma as any).cAPA.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === 'CLOSED' && { completedDate: new Date() }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PATCH /qaqc/capa/:id/status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
