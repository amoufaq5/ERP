import { NextResponse } from "next/server";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

// Phase 0 Track B7 migration. Shape-mapping logic preserved verbatim;
// tenancy + auth surface updated (header-based x-tenant-id removed,
// withAuthAndTenantParams supplies db + tenant context).

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
  notes: e.notes,
});

type IdParams = { params: Promise<{ id: string }> };

export const GET = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      // Extension auto-injects where.tenantId.
      const record = await db.equipmentRecord.findFirst({ where: { id } });
      if (!record) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(toEquipmentDto(record));
    } catch (error) {
      console.error("[API] GET /equipment/:id error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuthAndTenantParams<IdParams>(
  async (req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.equipmentRecord.findFirst({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const body = await req.json();
      const data: Record<string, any> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.type !== undefined) data.type = body.type;
      if (body.department !== undefined) data.department = body.department;
      if (body.status !== undefined) {
        data.status = body.status.toUpperCase().replace(/-/g, "_");
      }
      if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
      if (body.model !== undefined) data.model = body.model;
      if (body.serialNumber !== undefined) data.serialNumber = body.serialNumber;
      if (body.location !== undefined) data.location = body.location;
      if (body.notes !== undefined) data.notes = body.notes;

      const record = await db.equipmentRecord.update({ where: { id }, data });
      return NextResponse.json(toEquipmentDto(record));
    } catch (error) {
      console.error("[API] PATCH /equipment/:id error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.equipmentRecord.findFirst({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await db.equipmentRecord.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[API] DELETE /equipment/:id error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
