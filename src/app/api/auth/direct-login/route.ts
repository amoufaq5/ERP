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

function setAuthCookies(response: NextResponse, token: string) {
  const maxAge = 8 * 60 * 60;
  response.cookies.set("next-auth.session-token", token, {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: "lax",
  });
  response.cookies.set("__Secure-next-auth.session-token", token, {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });
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
      // 303 See Other — redirect back to login with error
      const response = new NextResponse(null, {
        status: 303,
        headers: { Location: "/login?error=CredentialsSignin" },
      });
      return response;
    }

    const token = await createToken(demo);
    const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

    // 303 See Other — browser follows with GET, cookies are set before redirect
    const response = new NextResponse(null, {
      status: 303,
      headers: { Location: safeCallback },
    });
    setAuthCookies(response, token);
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
    setAuthCookies(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
