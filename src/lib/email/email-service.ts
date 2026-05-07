// ---------------------------------------------------------------------------
// Email Service — abstraction + SMTP and Console implementations
// ---------------------------------------------------------------------------

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}

// ---------------------------------------------------------------------------
// SMTP Implementation (nodemailer)
// ---------------------------------------------------------------------------

export class SMTPEmailService implements EmailService {
  private transporter: Transporter;
  private from: string;

  constructor(config?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  }) {
    const host = config?.host ?? process.env.SMTP_HOST ?? "localhost";
    const port = config?.port ?? Number(process.env.SMTP_PORT ?? "587");
    const user = config?.user ?? process.env.SMTP_USER ?? "";
    const pass = config?.pass ?? process.env.SMTP_PASS ?? "";
    this.from = config?.from ?? process.env.SMTP_FROM ?? "noreply@pharmacrm.com";

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc?.join(", "),
        bcc: options.bcc?.join(", "),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[SMTPEmailService] Send failed:", message);
      return {
        success: false,
        error: message,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Console / Dev Implementation
// ---------------------------------------------------------------------------

export class ConsoleEmailService implements EmailService {
  async send(options: EmailOptions): Promise<EmailResult> {
    const id = `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    console.log("─".repeat(60));
    console.log("[ConsoleEmailService] Email sent (dev mode)");
    console.log(`  Message ID : ${id}`);
    console.log(`  To         : ${to}`);
    if (options.cc?.length) console.log(`  CC         : ${options.cc.join(", ")}`);
    if (options.bcc?.length) console.log(`  BCC        : ${options.bcc.join(", ")}`);
    console.log(`  Subject    : ${options.subject}`);
    if (options.replyTo) console.log(`  Reply-To   : ${options.replyTo}`);
    if (options.attachments?.length) {
      console.log(`  Attachments: ${options.attachments.map((a) => a.filename).join(", ")}`);
    }
    console.log(`  HTML length: ${options.html.length} chars`);
    console.log("─".repeat(60));

    return {
      success: true,
      messageId: id,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _instance: EmailService | null = null;

/**
 * Returns an `EmailService` singleton.
 * - If SMTP_HOST is configured, returns an SMTPEmailService.
 * - Otherwise falls back to ConsoleEmailService (logs to stdout).
 */
export function createEmailService(): EmailService {
  if (_instance) return _instance;

  const smtpHost = process.env.SMTP_HOST;

  if (smtpHost) {
    console.log(`[Email] Using SMTP transport → ${smtpHost}:${process.env.SMTP_PORT ?? 587}`);
    _instance = new SMTPEmailService();
  } else {
    console.log("[Email] SMTP not configured — using ConsoleEmailService (dev mode)");
    _instance = new ConsoleEmailService();
  }

  return _instance;
}
