import type { Invoice, Customer, Vendor } from "./data-store";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateInvoiceHTML(
  invoice: Invoice,
  party: Customer | Vendor | undefined,
  partyType: "customer" | "vendor"
): string {
  const partyName = party ? ("name" in party ? party.name : "Unknown") : "Unknown";
  const partyAddress = party ? ("address" in party ? party.address : "") : "";
  const partyPhone = party ? ("phone" in party ? party.phone : "") : "";
  const partyEmail = party ? ("email" in party ? party.email : "") : "";

  const itemRows = invoice.items
    .map(
      (item, i) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e2e8f0">${i + 1}</td>
          <td style="padding:8px;border:1px solid #e2e8f0">${esc(item.description)}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:right">${egp(item.unitPrice)}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600">${egp(item.total)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Invoice ${esc(invoice.number)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .company h1 { font-size: 24px; color: #2563eb; margin-bottom: 4px; }
  .company p { font-size: 12px; color: #64748b; }
  .inv-meta { text-align: right; }
  .inv-meta h2 { font-size: 28px; color: #1e293b; letter-spacing: 2px; }
  .inv-meta .num { font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 4px; }
  .inv-meta .date { font-size: 12px; color: #64748b; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party { flex: 1; }
  .party h3 { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
  .party p { font-size: 13px; line-height: 1.5; }
  .party .name { font-weight: 600; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  thead th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.grand { border-top: 2px solid #1e293b; font-size: 16px; font-weight: 700; padding-top: 10px; margin-top: 4px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .status.PAID { background: #dcfce7; color: #166534; }
  .status.SENT { background: #dbeafe; color: #1e40af; }
  .status.DRAFT { background: #f1f5f9; color: #475569; }
  .status.OVERDUE { background: #fef2f2; color: #991b1b; }
  .status.PARTIAL { background: #fef9c3; color: #854d0e; }
  .status.VOID { background: #f1f5f9; color: #94a3b8; }
  .footer { margin-top: 60px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>Pharma Enterprise</h1>
      <p>Pharmaceutical Manufacturing & Distribution</p>
      <p>Cairo, Egypt</p>
    </div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <div class="num">${esc(invoice.number)}</div>
      <div class="date">Date: ${invoice.date?.slice(0, 10) ?? ""}</div>
      <div class="date">Due: ${invoice.dueDate?.slice(0, 10) ?? ""}</div>
      <div style="margin-top:8px"><span class="status ${esc(invoice.status)}">${esc(invoice.status)}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>${partyType === "customer" ? "Bill To" : "Vendor"}</h3>
      <p class="name">${esc(partyName)}</p>
      ${partyAddress ? `<p>${esc(partyAddress)}</p>` : ""}
      ${partyPhone ? `<p>${esc(partyPhone)}</p>` : ""}
      ${partyEmail ? `<p>${esc(partyEmail)}</p>` : ""}
    </div>
    <div class="party" style="text-align:right">
      <h3>Invoice Details</h3>
      <p>Currency: ${esc(invoice.currency)}</p>
      ${invoice.notes ? `<p style="margin-top:8px;font-size:12px;color:#64748b">${esc(invoice.notes)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Description</th>
        <th style="width:80px;text-align:center">Qty</th>
        <th style="width:120px;text-align:right">Unit Price</th>
        <th style="width:120px;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${egp(invoice.subtotal)}</span></div>
    <div class="row"><span>Tax</span><span>${egp(invoice.tax)}</span></div>
    <div class="row grand"><span>Total</span><span>${egp(invoice.total)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for your business</p>
    <p style="margin-top:4px">Pharma Enterprise Suite — Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

export function openInvoicePDF(
  invoice: Invoice,
  party: Customer | Vendor | undefined,
  partyType: "customer" | "vendor"
): void {
  const html = generateInvoiceHTML(invoice, party, partyType);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      URL.revokeObjectURL(url);
    });
  }
}
