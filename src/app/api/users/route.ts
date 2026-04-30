import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";

const STORAGE_KEY = "pharma.allUsers";
const CREDS_KEY = "pharma.credentials";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export async function GET() {
  // In production, this would query the database
  // For now, return a standard response that the client-side will handle
  return NextResponse.json({ message: "Users managed client-side via localStorage" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, department, password } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: "name, email, role, and password are required" },
        { status: 400 }
      );
    }

    // Try to create in Prisma DB if available
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.$disconnect();
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hashSync(password, 10),
          role: role.toUpperCase(),
          department: department || null,
          isActive: true,
        },
      });
      await prisma.$disconnect();

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
        },
      }, { status: 201 });
    } catch {
      // DB not available — return success for client-side handling
      const id = `usr-${Date.now()}`;
      return NextResponse.json({
        user: {
          id,
          name,
          email,
          role,
          department: department || "",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      }, { status: 201 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
