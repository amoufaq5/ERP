import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const DealStage = z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']);

const stageTransitionSchema = z.object({
  stage: DealStage,
  lostReason: z.string().optional(),
  notes: z.string().optional(),
});

// Pipeline stage transitions: forward movement and specific backward/close paths
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  LEAD: ['QUALIFIED', 'CLOSED_LOST'],
  QUALIFIED: ['PROPOSAL', 'LEAD', 'CLOSED_LOST'],
  PROPOSAL: ['NEGOTIATION', 'QUALIFIED', 'CLOSED_LOST'],
  NEGOTIATION: ['CLOSED_WON', 'CLOSED_LOST', 'PROPOSAL'],
  CLOSED_WON: [],
  CLOSED_LOST: ['LEAD'],
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json();

    const result = stageTransitionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { stage: newStage, lostReason, notes } = result.data;

    const deal = await (prisma as any).deal.findFirst({
      where: { id, tenantId },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const currentStage = deal.stage as string;
    const allowed = ALLOWED_TRANSITIONS[currentStage] || [];

    if (!allowed.includes(newStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage transition from ${currentStage} to ${newStage}`,
          allowedTransitions: allowed,
        },
        { status: 422 },
      );
    }

    const updateData: Record<string, unknown> = { stage: newStage };
    if (newStage === 'CLOSED_LOST' && lostReason) {
      updateData.lostReason = lostReason;
    }
    if (newStage === 'CLOSED_WON' || newStage === 'CLOSED_LOST') {
      updateData.actualCloseDate = new Date().toISOString();
    }
    if (notes) {
      updateData.stageNotes = notes;
    }

    const updated = await (prisma as any).deal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /crm/deals/:id/status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
