import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || 'default';

  try {
    const record = await prisma.equipmentRecord.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: record.id,
      assetTag: record.code,
      name: record.name,
      type: (record.type ?? 'production').toLowerCase(),
      model: record.model ?? '',
      serialNumber: record.serialNumber ?? '',
      manufacturer: record.manufacturer ?? '',
      location: record.location ?? '',
      department: record.department ?? '',
      criticality: 'major',
      status: (record.status ?? 'OPERATIONAL').toLowerCase().replace(/_/g, '-'),
      installationDate: record.installDate?.toISOString().slice(0, 10) ?? '',
      notes: record.notes,
    });
  } catch (error) {
    console.error('[API] GET /equipment/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || 'default';

  try {
    const existing = await prisma.equipmentRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, any> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.department !== undefined) data.department = body.department;
    if (body.status !== undefined) {
      data.status = body.status.toUpperCase().replace(/-/g, '_');
    }
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
    if (body.model !== undefined) data.model = body.model;
    if (body.serialNumber !== undefined) data.serialNumber = body.serialNumber;
    if (body.location !== undefined) data.location = body.location;
    if (body.notes !== undefined) data.notes = body.notes;

    const record = await prisma.equipmentRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: record.id,
      assetTag: record.code,
      name: record.name,
      type: (record.type ?? 'production').toLowerCase(),
      model: record.model ?? '',
      serialNumber: record.serialNumber ?? '',
      manufacturer: record.manufacturer ?? '',
      location: record.location ?? '',
      department: record.department ?? '',
      criticality: 'major',
      status: (record.status ?? 'OPERATIONAL').toLowerCase().replace(/_/g, '-'),
      installationDate: record.installDate?.toISOString().slice(0, 10) ?? '',
      notes: record.notes,
    });
  } catch (error) {
    console.error('[API] PATCH /equipment/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || 'default';

  try {
    const existing = await prisma.equipmentRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.equipmentRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /equipment/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
