// ---------------------------------------------------------------------------
// Email template: Report Delivery — "Scheduled report is ready"
// ---------------------------------------------------------------------------

import { wrapInLayout, actionButton, infoRow } from "./base-layout";

export interface ReportDeliveryData {
  recipientName: string;
  reportTitle: string;
  period: string;
  summary: string;
  link: string;
}

/**
 * Generates the HTML email body for a scheduled report delivery.
 */
export function reportDeliveryEmail(data: ReportDeliveryData): string {
  const { recipientName, reportTitle, period, summary, link } = data;

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Your Report is Ready</h1>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:22px;">
  Hello ${recipientName}, the scheduled report <strong>${reportTitle}</strong> for the period <strong>${period}</strong> is now available.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:8px;">
  ${infoRow("Report", reportTitle)}
  ${infoRow("Period", period)}
</table>

<div style="background-color:#f0fdfa;border-left:4px solid #0d9488;border-radius:4px;padding:16px;margin:20px 0;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0d9488;">Summary</p>
  <p style="margin:0;font-size:13px;color:#374151;line-height:20px;">
    ${summary}
  </p>
</div>

${actionButton("View Full Report", link)}

<p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
  If the button above doesn't work, copy and paste the following URL into your browser:<br />
  <a href="${link}" style="color:#0d9488;word-break:break-all;">${link}</a>
</p>`;

  return wrapInLayout({
    title: `Report Ready: ${reportTitle}`,
    content,
    preheader: `Your ${reportTitle} for ${period} is ready to view.`,
  });
}
