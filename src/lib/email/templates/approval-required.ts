// ---------------------------------------------------------------------------
// Email template: Approval Required — "You have a pending approval"
// ---------------------------------------------------------------------------

import { wrapInLayout, actionButton, infoRow } from "./base-layout";

export interface ApprovalRequiredData {
  approverName: string;
  entityType: string;
  entityTitle: string;
  requesterName: string;
  amount?: number;
  link: string;
}

/**
 * Generates the HTML email body for a pending approval notification.
 */
export function approvalRequiredEmail(data: ApprovalRequiredData): string {
  const { approverName, entityType, entityTitle, requesterName, amount, link } = data;

  const amountRow = amount !== undefined
    ? infoRow("Amount", `EGP ${amount.toLocaleString("en-US")}`)
    : "";

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Approval Required</h1>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:22px;">
  Hello ${approverName}, a new ${entityType.toLowerCase()} requires your review and approval.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:8px;">
  ${infoRow("Request Type", entityType)}
  ${infoRow("Title", entityTitle)}
  ${infoRow("Requested By", requesterName)}
  ${amountRow}
</table>

${actionButton("Review &amp; Approve", link)}

<p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
  If the button above doesn't work, copy and paste the following URL into your browser:<br />
  <a href="${link}" style="color:#0d9488;word-break:break-all;">${link}</a>
</p>`;

  return wrapInLayout({
    title: `Approval Required: ${entityTitle}`,
    content,
    preheader: `Action needed: ${requesterName} submitted a ${entityType.toLowerCase()} for your approval.`,
  });
}
