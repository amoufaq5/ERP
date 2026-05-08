import { NextResponse } from "next/server";

export async function POST() {
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login"></head><body>Logging out...</body></html>`;
  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });

  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: true,
  });
  response.cookies.set("next-auth.csrf-token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("next-auth.callback-url", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  return POST();
}
