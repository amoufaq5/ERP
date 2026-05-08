import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { DEMO_CREDENTIALS } from "@/lib/auth/auth-utils";

const secret = "pharma-erp-dev-secret-change-in-production";

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

function setCookieHeaders(headers: Headers, token: string) {
  const maxAge = 8 * 60 * 60;
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();

  headers.append(
    "Set-Cookie",
    `next-auth.session-token=${token}; Path=/; Expires=${expires}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
  );
  headers.append(
    "Set-Cookie",
    `__Secure-next-auth.session-token=${token}; Path=/; Expires=${expires}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    const username = formData.get("username") as string || "";
    const password = formData.get("password") as string || "";
    const callbackUrl = formData.get("callbackUrl") as string || "/dashboard";

    const demo = findUser(username, password);

    if (!demo) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login?error=CredentialsSignin"></head><body>Redirecting...</body></html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    const token = await createToken(demo);
    const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

    const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${safeCallback}"></head><body>Redirecting...</body></html>`;
    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    setCookieHeaders(response.headers, token);
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
    setCookieHeaders(response.headers, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
