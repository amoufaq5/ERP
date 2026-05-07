// ---------------------------------------------------------------------------
// POST /api/email/send — Send a single email (admin only)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { createEmailService, type EmailOptions } from "@/lib/email/email-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Auth check — only ADMIN role may send arbitrary emails
    const session = await getServerSession(authOptions);
    const role = (session?.user as Record<string, unknown> | undefined)?.role;
    if (!session || role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized — admin access required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<EmailOptions>;

    // Validate required fields
    if (!body.to || !body.subject || !body.html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 },
      );
    }

    const emailService = createEmailService();

    const result = await emailService.send({
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text,
      replyTo: body.replyTo,
      attachments: undefined, // Attachments not supported via JSON API
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 },
    );
  } catch (err) {
    console.error("[api/email/send] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
