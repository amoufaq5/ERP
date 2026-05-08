import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { DEMO_CREDENTIALS } from "@/lib/auth/auth-utils";

const secret = process.env.NEXTAUTH_SECRET || "pharma-erp-dev-secret-change-in-production";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const trimUser = username.trim().toLowerCase();
    const trimPass = password.trim();

    const demo = Object.values(DEMO_CREDENTIALS).find(
      (u) => u.username === trimUser && u.password === trimPass,
    );

    if (!demo) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await encode({
      token: {
        name: demo.profile.name,
        email: demo.profile.email,
        sub: demo.profile.id,
        id: demo.profile.id,
        role: demo.profile.role,
        department: demo.profile.department,
        territory: demo.profile.territory,
      },
      secret,
      maxAge: 8 * 60 * 60,
    });

    const response = NextResponse.json({ ok: true, user: demo.profile });

    const isSecure = req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:";

    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 8 * 60 * 60,
    };

    response.cookies.set("next-auth.session-token", token, {
      ...cookieOpts,
      secure: false,
    });

    response.cookies.set("__Secure-next-auth.session-token", token, {
      ...cookieOpts,
      secure: true,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
