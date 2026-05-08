import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { DEMO_CREDENTIALS } from "@/lib/auth/auth-utils";

const secret = "pharma-erp-dev-secret-change-in-production";

function setSessionCookies(response: NextResponse, token: string, isSecure: boolean) {
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

  if (isSecure) {
    response.cookies.set("__Secure-next-auth.session-token", token, {
      ...cookieOpts,
      secure: true,
    });
  }
}

async function createToken(demo: (typeof DEMO_CREDENTIALS)[string]) {
  return encode({
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
}

function findUser(username: string, password: string) {
  const trimUser = username.trim().toLowerCase();
  const trimPass = password.trim();
  return Object.values(DEMO_CREDENTIALS).find(
    (u) => u.username === trimUser && u.password === trimPass,
  );
}

export async function POST(req: NextRequest) {
  const isSecure = req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    const username = formData.get("username") as string || "";
    const password = formData.get("password") as string || "";
    const callbackUrl = formData.get("callbackUrl") as string || "/dashboard";

    const demo = findUser(username, password);
    if (!demo) {
      const host = req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const loginUrl = `${proto}://${host}/login?error=CredentialsSignin`;
      return NextResponse.redirect(loginUrl);
    }

    const token = await createToken(demo);
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const redirectUrl = `${proto}://${host}${callbackUrl}`;
    const response = NextResponse.redirect(redirectUrl);
    setSessionCookies(response, token, isSecure);
    return response;
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const demo = findUser(username, password);
    if (!demo) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken(demo);
    const response = NextResponse.json({ ok: true, user: demo.profile });
    setSessionCookies(response, token, isSecure);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
