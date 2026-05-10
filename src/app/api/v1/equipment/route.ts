import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Equipment composite route.
 *
 * GET  /api/v1/equipment  - Returns composite StoreData with equipment,
 *                           calibrations, maintenanceOrders, and schedules.
 * POST /api/v1/equipment  - Create a new equipment record.
 *
 * This route bridges the equipment-store (which expects a composite payload)
 * with the EquipmentRecord Prisma model.
 */

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    const equipment = await prisma.equipmentRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Map Prisma records to the store's Equipment shape
    const mapped = equipment.map((e: any) => ({
      id: e.id,
      assetTag: e.code,
      name: e.name,
      type: (e.type ?? 'production').toLowerCase(),
      model: e.model ?? '',
      serialNumber: e.serialNumber ?? '',
      manufacturer: e.manufacturer ?? '',
      location: e.location ?? '',
      department: e.department ?? '',
      criticality: 'major',
      status: (e.status ?? 'OPERATIONAL').toLowerCase().replace(/_/g, '-'),
      installationDate: e.installDate?.toISOString().slice(0, 10) ?? '',
      lastCalibrationDate: undefined,
      nextCalibrationDue: e.calibrationDueDate?.toISOString().slice(0, 10),
      lastMaintenanceDate: e.lastMaintenanceDate?.toISOString().slice(0, 10),
      nextMaintenanceDue: e.nextMaintenanceDate?.toISOString().slice(0, 10),
      notes: e.notes,
    }));

    return NextResponse.json({
      equipment: mapped,
      calibrations: [],
      maintenanceOrders: [],
      schedules: [],
    });
  } catch (error) {
    console.error('[API] GET /equipment error:', error);
    return NextResponse.json({
      equipment: [],
      calibrations: [],
      maintenanceOrders: [],
      schedules: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    const record = await prisma.equipmentRecord.create({
      data: {
        tenantId,
        name: body.name ?? '',
        code: body.assetTag ?? `EQ-${Date.now()}`,
        type: body.type,
        department: body.department,
        status: 'OPERATIONAL',
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        location: body.location,
        installDate: body.installationDate ? new Date(body.installationDate) : undefined,
        notes: body.notes,
      },
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
      criticality: body.criticality ?? 'major',
      status: 'operational',
      installationDate: record.installDate?.toISOString().slice(0, 10) ?? '',
      notes: record.notes,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /equipment error:', error);
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
  }
}
