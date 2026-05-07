import { NextRequest, NextResponse } from "next/server";
import { SearchIndex } from "@/lib/search/search-index";
import { SEED_DATA } from "@/lib/data-store";
import { DEMO_USERS } from "@/lib/user-context";

/**
 * GET /api/search?q=<query>&entities=doctor,account&limit=20&fuzzy=true
 *
 * Server-side search endpoint. For now it builds the index from seed/demo data
 * on each request. Once a database is available this should read from persistent
 * storage and potentially cache the index across requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing required query parameter 'q'" },
      { status: 400 },
    );
  }

  const entitiesParam = searchParams.get("entities");
  const limitParam = searchParams.get("limit");
  const fuzzyParam = searchParams.get("fuzzy");

  const entities = entitiesParam ? entitiesParam.split(",").filter(Boolean) : undefined;
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;
  const fuzzy = fuzzyParam === "true";

  // Build index from data-store seed data
  const idx = new SearchIndex();

  for (const doc of SEED_DATA.doctors) {
    idx.addDocument(doc.id, "doctor", {
      name: doc.name,
      specialty: doc.specialty,
      hospital: doc.hospital,
      city: doc.city,
      classification: doc.classification,
    });
  }

  for (const acc of SEED_DATA.amAccounts) {
    idx.addDocument(acc.id, "account", {
      name: acc.name,
      type: acc.type,
      city: acc.city,
      address: acc.address,
    });
  }

  for (const mr of SEED_DATA.marketRequests) {
    idx.addDocument(mr.id, "market_request", {
      type: mr.type,
      description: mr.description,
      priority: mr.priority,
      status: mr.status,
    });
  }

  for (const visit of SEED_DATA.visits) {
    const doctor = SEED_DATA.doctors.find((d) => d.id === visit.doctorId);
    idx.addDocument(visit.id, "visit", {
      notes: visit.notes || "",
      doctorName: doctor?.name || "",
      status: visit.status,
      type: visit.type,
    });
  }

  for (const bu of SEED_DATA.businessUnits) {
    idx.addDocument(bu.id, "business_unit", {
      name: bu.name,
      code: bu.code,
      description: bu.description,
    });
  }

  for (const terr of SEED_DATA.territories) {
    idx.addDocument(terr.id, "territory", {
      name: terr.name,
      nameAr: terr.nameAr,
      code: terr.imsCode,
      level: terr.level,
    });
  }

  for (const user of DEMO_USERS) {
    idx.addDocument(user.id, "user", {
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
    });
  }

  const results = idx.search(q, { entities, limit, fuzzy });

  return NextResponse.json({ query: q, count: results.length, results });
}
