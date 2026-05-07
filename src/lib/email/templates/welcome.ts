// ---------------------------------------------------------------------------
// Email template: Welcome — "Welcome to PharmaCRM"
// ---------------------------------------------------------------------------

import { wrapInLayout, actionButton, infoRow } from "./base-layout";

export interface WelcomeData {
  userName: string;
  role: string;
  loginUrl: string;
  tempPassword?: string;
}

/**
 * Generates the HTML email body for a welcome / new-user notification.
 */
export function welcomeEmail(data: WelcomeData): string {
  const { userName, role, loginUrl, tempPassword } = data;

  const passwordSection = tempPassword
    ? `<div style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin:20px 0;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#b45309;">Temporary Password</p>
  <p style="margin:0;font-size:14px;color:#374151;font-family:monospace;letter-spacing:1px;">${tempPassword}</p>
  <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Please change your password after your first login.</p>
</div>`
    : "";

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Welcome to PharmaCRM!</h1>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:22px;">
  Hello ${userName}, your account has been created and you are ready to get started.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:8px;">
  ${infoRow("Name", userName)}
  ${infoRow("Role", role)}
</table>

${passwordSection}

<p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:22px;">
  Here&rsquo;s what you can do to get started:
</p>
<ol style="margin:0 0 20px;padding-left:20px;color:#374151;font-size:14px;line-height:24px;">
  <li>Log in to your account using the button below.</li>
  <li>Update your profile and preferences.</li>
  <li>Explore the dashboard to see your tasks and KPIs.</li>
</ol>

${actionButton("Log In to PharmaCRM", loginUrl)}

<p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
  If the button above doesn't work, copy and paste the following URL into your browser:<br />
  <a href="${loginUrl}" style="color:#0d9488;word-break:break-all;">${loginUrl}</a>
</p>`;

  return wrapInLayout({
    title: "Welcome to PharmaCRM",
    content,
    preheader: `Welcome ${userName}! Your PharmaCRM account is ready.`,
  });
}
