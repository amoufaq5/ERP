import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { withAuthAndTenant } from "@/lib/api/with-tenant";

// Phase 0 Track B7 — admin-only user management. Replaces a prior version
// that: returned a hardcoded "managed client-side" stub on GET; created
// its own PrismaClient per request on POST (connection leak); ran
// completely unauthenticated. localStorage references inside an API
// route were also removed.
//
// Both endpoints require an authenticated session and ADMIN role. New
// users are created in the calling admin's tenant (auto-injected by
// the extension).

export const GET = withAuthAndTenant(async (_req, { db, role }) => {
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      territory: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
});

export const POST = withAuthAndTenant(async (req, { db, role }) => {
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, role: newRole, department, password } = body as Record<
      string,
      unknown
    >;

    if (!name || !email || !newRole || !password) {
      return NextResponse.json(
        { error: "name, email, role, and password are required" },
        { status: 400 },
      );
    }

    // The extension auto-injects tenantId on the where clause so this
    // conflict check is scoped to the calling admin's tenant (email is
    // now unique per @@unique([tenantId, email])).
    const existing = await db.user.findFirst({
      where: { email: String(email) },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists in this tenant" },
        { status: 409 },
      );
    }

    const user = await db.user.create({
      data: {
        name: String(name),
        email: String(email),
        passwordHash: hashSync(String(password), 10),
        role: String(newRole).toUpperCase(),
        department: department ? String(department) : null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[API] POST /users error:", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
});
