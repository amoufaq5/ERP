// ---------------------------------------------------------------------------
// Email template: SLA Breach Warning — "Approval overdue"
// ---------------------------------------------------------------------------

import { wrapInLayout, actionButton, infoRow } from "./base-layout";

export interface SlaWarningData {
  approverName: string;
  entityType: string;
  entityTitle: string;
  submittedAt: string;
  slaHours: number;
  link: string;
}

/**
 * Generates the HTML email body for an SLA breach/warning notification.
 */
export function slaWarningEmail(data: SlaWarningData): string {
  const { approverName, entityType, entityTitle, submittedAt, slaHours, link } = data;

  const submittedDate = new Date(submittedAt);
  const formattedDate = submittedDate.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">&#9888; SLA Breach Warning</h1>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:22px;">
  Hello ${approverName}, the following approval request has exceeded the expected response time of <strong>${slaHours} hours</strong>.
  Please review it as soon as possible.
</p>

<div style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin-bottom:20px;">
  <span style="font-size:15px;font-weight:600;color:#b45309;">
    &#9888; This approval is overdue and may be escalated automatically.
  </span>
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:8px;">
  ${infoRow("Request Type", entityType)}
  ${infoRow("Title", entityTitle)}
  ${infoRow("Submitted", formattedDate)}
  ${infoRow("SLA Target", `${slaHours} hours`)}
</table>

${actionButton("Review Now", link, "#f59e0b")}

<p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
  If the button above doesn't work, copy and paste the following URL into your browser:<br />
  <a href="${link}" style="color:#0d9488;word-break:break-all;">${link}</a>
</p>`;

  return wrapInLayout({
    title: `SLA Warning: ${entityTitle}`,
    content,
    preheader: `Urgent: ${entityType} "${entityTitle}" has exceeded the ${slaHours}-hour SLA.`,
  });
}
