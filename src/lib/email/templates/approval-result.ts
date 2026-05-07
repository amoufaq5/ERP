// ---------------------------------------------------------------------------
// Email template: Approval Result — "Your request was approved/rejected"
// ---------------------------------------------------------------------------

import { wrapInLayout, actionButton, infoRow } from "./base-layout";

export interface ApprovalResultData {
  userName: string;
  entityType: string;
  entityTitle: string;
  status: "approved" | "rejected";
  approverName: string;
  reason?: string;
  link: string;
}

/**
 * Generates the HTML email body for an approval result notification.
 */
export function approvalResultEmail(data: ApprovalResultData): string {
  const { userName, entityType, entityTitle, status, approverName, reason, link } = data;

  const isApproved = status === "approved";
  const statusColor = isApproved ? "#059669" : "#dc2626";
  const statusLabel = isApproved ? "Approved" : "Rejected";
  const statusIcon = isApproved ? "&#10003;" : "&#10007;";

  const reasonRow = reason ? infoRow("Reason", reason) : "";

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Request ${statusLabel}</h1>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:22px;">
  Hello ${userName}, your ${entityType.toLowerCase()} has been <strong style="color:${statusColor};">${status}</strong> by ${approverName}.
</p>

<div style="background-color:${isApproved ? "#ecfdf5" : "#fef2f2"};border-left:4px solid ${statusColor};border-radius:4px;padding:16px;margin-bottom:20px;">
  <span style="font-size:20px;color:${statusColor};vertical-align:middle;">${statusIcon}</span>
  <span style="font-size:15px;font-weight:600;color:${statusColor};vertical-align:middle;margin-left:8px;">
    ${entityTitle} &mdash; ${statusLabel}
  </span>
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:8px;">
  ${infoRow("Request Type", entityType)}
  ${infoRow("Title", entityTitle)}
  ${infoRow("Reviewed By", approverName)}
  ${infoRow("Decision", statusLabel)}
  ${reasonRow}
</table>

${actionButton("View Details", link)}

<p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
  If the button above doesn't work, copy and paste the following URL into your browser:<br />
  <a href="${link}" style="color:#0d9488;word-break:break-all;">${link}</a>
</p>`;

  return wrapInLayout({
    title: `Request ${statusLabel}: ${entityTitle}`,
    content,
    preheader: `Your ${entityType.toLowerCase()} "${entityTitle}" has been ${status} by ${approverName}.`,
  });
}
