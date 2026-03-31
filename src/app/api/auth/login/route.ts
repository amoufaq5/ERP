import { NextRequest, NextResponse } from "next/server";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: "usr_1",
    name: "Admin User",
    email: "admin@enterprise.com",
    role: "admin",
    password: "admin123",
  },
  {
    id: "usr_2",
    name: "Manager User",
    email: "manager@enterprise.com",
    role: "manager",
    password: "manager123",
  },
  {
    id: "usr_3",
    name: "Standard User",
    email: "user@enterprise.com",
    role: "user",
    password: "user123",
  },
];

function generateToken(userId: string): string {
  return `demo-token-${userId}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const matchedUser = DEMO_USERS.find(
      (u) => u.email === normalizedEmail && u.password === password
    );

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Strip password before returning
    const { password: _password, ...safeUser } = matchedUser;

    const token = generateToken(safeUser.id);

    return NextResponse.json(
      {
        user: safeUser,
        token,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
