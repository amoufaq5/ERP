import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json({
    id,
    status: 'completed',
    completionDate: body.completionDate,
    downtimeHours: body.downtimeHours ?? 0,
    partsUsed: body.partsUsed ?? [],
    rootCause: body.rootCause,
    correctiveAction: body.correctiveAction,
    updatedAt: new Date().toISOString(),
  });
}
