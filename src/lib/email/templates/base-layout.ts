// ---------------------------------------------------------------------------
// Base HTML email layout wrapper
// Uses inline styles and table layout for maximum email-client compatibility.
// Bilingual-ready: content area accepts LTR or RTL direction.
// ---------------------------------------------------------------------------

export interface LayoutOptions {
  title: string;
  content: string;
  /** Short preview text visible in some mail clients */
  preheader?: string;
  /** "ltr" | "rtl" — defaults to "ltr" */
  direction?: "ltr" | "rtl";
}

/**
 * Wraps HTML body content in the shared PharmaCRM email layout.
 */
export function wrapInLayout({ title, content, preheader, direction = "ltr" }: LayoutOptions): string {
  const preheaderHtml = preheader
    ? `<span style="display:none!important;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheaderHtml}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Inner card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background-color:#0d9488;padding:24px 32px;text-align:${direction === "rtl" ? "right" : "left"};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo placeholder -->
                    <div style="width:40px;height:40px;background-color:#ffffff;border-radius:8px;display:inline-block;text-align:center;line-height:40px;font-weight:bold;color:#0d9488;font-size:18px;">P</div>
                  </td>
                  <td style="padding-${direction === "rtl" ? "right" : "left"}:12px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">PharmaCRM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content area -->
          <tr>
            <td style="padding:32px;direction:${direction};text-align:${direction === "rtl" ? "right" : "left"};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color:#9ca3af;font-size:12px;line-height:18px;text-align:center;">
                    &copy; ${new Date().getFullYear()} PharmaCRM &mdash; Pharmaceutical ERP &amp; CRM<br />
                    This is an automated message. Please do not reply directly to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Inner card -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->
</body>
</html>`;
}

/**
 * Helper: create an action button (CTA) suitable for email.
 */
export function actionButton(label: string, href: string, color = "#0d9488"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background-color:${color};border-radius:6px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Helper: info row for key/value display.
 */
export function infoRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;color:#111827;font-size:13px;">${value}</td>
</tr>`;
}
