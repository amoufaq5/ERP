import { NextResponse } from "next/server";
import { withAuthAndTenant } from "@/lib/api/with-tenant";

// Equipment composite route.
//
// GET  /api/v1/equipment  — Returns composite StoreData with equipment +
//                          stub calibrations / maintenanceOrders / schedules
//                          (those collections live in separate models that
//                          this route does not currently consume).
// POST /api/v1/equipment  — Create an EquipmentRecord.
//
// The route maps between the EquipmentRecord Prisma model and the
// equipment-store's expected shape (renamed fields, normalized casing).
// Mapping logic is preserved verbatim from the pre-migration code; only
// the tenancy + auth surface changed (Phase 0 Track B7).

const toEquipmentDto = (e: any) => ({
  id: e.id,
  assetTag: e.code,
  name: e.name,
  type: (e.type ?? "production").toLowerCase(),
  model: e.model ?? "",
  serialNumber: e.serialNumber ?? "",
  manufacturer: e.manufacturer ?? "",
  location: e.location ?? "",
  department: e.department ?? "",
  criticality: "major" as const,
  status: (e.status ?? "OPERATIONAL").toLowerCase().replace(/_/g, "-"),
  installationDate: e.installDate?.toISOString().slice(0, 10) ?? "",
  lastCalibrationDate: undefined,
  nextCalibrationDue: e.calibrationDueDate?.toISOString().slice(0, 10),
  lastMaintenanceDate: e.lastMaintenanceDate?.toISOString().slice(0, 10),
  nextMaintenanceDue: e.nextMaintenanceDate?.toISOString().slice(0, 10),
  notes: e.notes,
});

export const GET = withAuthAndTenant(async (_req, { db }) => {
  try {
    const equipment = await db.equipmentRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      equipment: equipment.map(toEquipmentDto),
      calibrations: [],
      maintenanceOrders: [],
      schedules: [],
    });
  } catch (error) {
    console.error("[API] GET /equipment error:", error);
    return NextResponse.json({
      equipment: [],
      calibrations: [],
      maintenanceOrders: [],
      schedules: [],
    });
  }
});

export const POST = withAuthAndTenant(async (req, { db }) => {
  try {
    const body = await req.json();

    // tenantId is auto-injected by the extension; do not add it here.
    const record = await db.equipmentRecord.create({
      data: {
        name: body.name ?? "",
        code: body.assetTag ?? `EQ-${Date.now()}`,
        type: body.type,
        department: body.department,
        status: "OPERATIONAL",
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        location: body.location,
        installDate: body.installationDate
          ? new Date(body.installationDate)
          : undefined,
        notes: body.notes,
      },
    });

    return NextResponse.json(
      { ...toEquipmentDto(record), criticality: body.criticality ?? "major" },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API] POST /equipment error:", error);
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 },
    );
  }
});
