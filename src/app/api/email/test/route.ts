// ---------------------------------------------------------------------------
// POST /api/email/test — Send a test email to verify SMTP configuration
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { createEmailService } from "@/lib/email/email-service";
import { wrapInLayout } from "@/lib/email/templates/base-layout";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Auth check — only ADMIN role
    const session = await getServerSession(authOptions);
    const role = (session?.user as Record<string, unknown> | undefined)?.role;
    if (!session || role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized — admin access required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { to?: string };
    const to = body.to ?? (session.user?.email || "");

    if (!to) {
      return NextResponse.json(
        { error: "No recipient specified. Provide 'to' in request body or ensure session has email." },
        { status: 400 },
      );
    }

    const html = wrapInLayout({
      title: "PharmaCRM Test Email",
      content: `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Email Configuration Test</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:22px;">
  This is a test email from <strong>PharmaCRM</strong>. If you are reading this, your email
  configuration is working correctly.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;">
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">SMTP Host</td>
    <td style="padding:6px 0;color:#111827;font-size:13px;">${process.env.SMTP_HOST ?? "(not configured — console mode)"}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">SMTP Port</td>
    <td style="padding:6px 0;color:#111827;font-size:13px;">${process.env.SMTP_PORT ?? "—"}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">From Address</td>
    <td style="padding:6px 0;color:#111827;font-size:13px;">${process.env.SMTP_FROM ?? "noreply@pharmacrm.com"}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">Sent At</td>
    <td style="padding:6px 0;color:#111827;font-size:13px;">${new Date().toISOString()}</td>
  </tr>
</table>`,
      preheader: "PharmaCRM email configuration test — if you can read this, it works!",
    });

    const emailService = createEmailService();
    const result = await emailService.send({
      to,
      subject: "[PharmaCRM] Test Email — Configuration Verified",
      html,
      text: "This is a test email from PharmaCRM. If you are reading this, your email configuration is working correctly.",
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        to,
        mode: process.env.SMTP_HOST ? "smtp" : "console",
      });
    }

    return NextResponse.json(
      { success: false, error: result.error, to },
      { status: 502 },
    );
  } catch (err) {
    console.error("[api/email/test] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
