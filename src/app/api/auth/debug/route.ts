import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET || "pharma-erp-dev-secret-change-in-production";

export async function GET(req: NextRequest) {
  const cookieList = req.cookies.getAll().map((c) => c.name);
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host");
  const fwdHost = req.headers.get("x-forwarded-host");
  const url = req.nextUrl.toString();

  let tokenResult: string;
  try {
    const token = await getToken({ req, secret });
    tokenResult = token ? JSON.stringify({ id: token.id, role: token.role, name: token.name }) : "null";
  } catch (e) {
    tokenResult = `error: ${e}`;
  }

  let tokenSecure: string;
  try {
    const token = await getToken({ req, secret, cookieName: "__Secure-next-auth.session-token" });
    tokenSecure = token ? JSON.stringify({ id: token.id, role: token.role }) : "null";
  } catch {
    tokenSecure = "error";
  }

  let tokenPlain: string;
  try {
    const token = await getToken({ req, secret, cookieName: "next-auth.session-token" });
    tokenPlain = token ? JSON.stringify({ id: token.id, role: token.role }) : "null";
  } catch {
    tokenPlain = "error";
  }

  return NextResponse.json({
    cookies: cookieList,
    headers: { proto, host, fwdHost },
    url,
    getToken_default: tokenResult,
    getToken_secure: tokenSecure,
    getToken_plain: tokenPlain,
  });
}
