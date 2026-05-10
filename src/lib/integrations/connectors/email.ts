/**
 * Email Connector
 *
 * Production email connector using nodemailer for SMTP transport.
 * Supports templates, attachments, batch sending, and bounce handling.
 */

import { createTransport, type Transporter, type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  BaseConnector,
  ConfigField,
  ConnectorConfig,
  HealthCheckResult,
  WebhookResult,
  WebhookAction,
} from '../connector-base';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
  variables: string[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: 'base64' | 'utf-8';
  cid?: string; // Content-ID for inline images
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  templateId?: string;
  templateVars?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  tags?: string[];
}

export interface BatchSendParams {
  recipients: Array<{
    to: string;
    templateVars?: Record<string, string>;
    metadata?: Record<string, string>;
  }>;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  templateId?: string;
  attachments?: EmailAttachment[];
  rateLimit?: number; // emails per second
}

export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  envelope: { from: string; to: string[] };
}

export interface BatchSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export interface BounceEvent {
  type: 'hard_bounce' | 'soft_bounce' | 'complaint' | 'unsubscribe';
  email: string;
  reason: string;
  timestamp: Date;
  messageId?: string;
}

export interface DkimConfig {
  domainName: string;
  keySelector: string;
  privateKey: string;
}

// ─── Email Connector ─────────────────────────────────────────────────────────

export class EmailConnector extends BaseConnector {
  readonly id = 'email-smtp';
  readonly name = 'Email (SMTP)';
  readonly version = '1.0.0';
  readonly category = 'communication' as const;

  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private defaultFrom = '';
  private templates: Map<string, EmailTemplate> = new Map();
  private suppressionList: Set<string> = new Set();
  private dkimConfig: DkimConfig | null = null;
  private rateLimit = 10; // default emails per second
  private lastSendTime = 0;
  private sendCount = 0;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(config: ConnectorConfig): Promise<void> {
    const { credentials, settings } = config;

    if (!credentials.smtp_host) {
      throw this.createError('EMAIL_MISSING_HOST', 'SMTP host is required', false);
    }

    const port = parseInt(credentials.smtp_port || '587', 10);
    const secure = port === 465;

    const transportOptions = {
      host: credentials.smtp_host,
      port,
      secure,
      auth: credentials.smtp_user
        ? {
            user: credentials.smtp_user,
            pass: credentials.smtp_pass || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: config.environment === 'production',
      },
      pool: true,
      maxConnections: parseInt((settings.max_connections as string) || '5', 10),
      maxMessages: parseInt((settings.max_messages_per_connection as string) || '100', 10),
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    } as SMTPTransport.Options;

    // DKIM configuration
    if (credentials.dkim_private_key && settings.dkim_domain && settings.dkim_selector) {
      this.dkimConfig = {
        domainName: settings.dkim_domain as string,
        keySelector: settings.dkim_selector as string,
        privateKey: credentials.dkim_private_key,
      };
      transportOptions.dkim = {
        domainName: this.dkimConfig.domainName,
        keySelector: this.dkimConfig.keySelector,
        privateKey: this.dkimConfig.privateKey,
      };
    }

    this.transporter = createTransport(transportOptions);
    this.defaultFrom = (settings.default_from as string) || credentials.smtp_user || '';
    this.rateLimit = parseInt((settings.rate_limit as string) || '10', 10);

    this.config = config;
    this.initialized = true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      this.ensureInitialized();

      if (!this.transporter) {
        return {
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          message: 'Transport not initialized',
          checkedAt: new Date(),
        };
      }

      await this.transporter.verify();
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: 'SMTP connection verified',
        checkedAt: new Date(),
      };
    } catch (err: unknown) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'SMTP health check failed',
        checkedAt: new Date(),
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    this.initialized = false;
    this.config = null;
  }

  getAuthType(): 'basic' {
    return 'basic';
  }

  getConfigSchema(): Record<string, ConfigField> {
    return {
      smtp_host: {
        type: 'string',
        label: 'SMTP Host',
        description: 'SMTP server hostname',
        required: true,
        group: 'credentials',
      },
      smtp_port: {
        type: 'number',
        label: 'SMTP Port',
        description: 'SMTP server port (587 for STARTTLS, 465 for SSL)',
        required: false,
        default: 587,
        validation: { min: 1, max: 65535 },
        group: 'credentials',
      },
      smtp_user: {
        type: 'string',
        label: 'SMTP Username',
        description: 'SMTP authentication username',
        required: false,
        group: 'credentials',
      },
      smtp_pass: {
        type: 'secret',
        label: 'SMTP Password',
        description: 'SMTP authentication password',
        required: false,
        sensitive: true,
        group: 'credentials',
      },
      default_from: {
        type: 'email',
        label: 'Default From Address',
        description: 'Default sender email address',
        required: true,
        group: 'settings',
      },
      rate_limit: {
        type: 'number',
        label: 'Rate Limit',
        description: 'Maximum emails per second',
        required: false,
        default: 10,
        validation: { min: 1, max: 1000 },
        group: 'settings',
      },
      max_connections: {
        type: 'number',
        label: 'Max Pool Connections',
        description: 'Maximum simultaneous SMTP connections',
        required: false,
        default: 5,
        validation: { min: 1, max: 50 },
        group: 'settings',
      },
      max_messages_per_connection: {
        type: 'number',
        label: 'Max Messages per Connection',
        description: 'Messages to send before reconnecting',
        required: false,
        default: 100,
        validation: { min: 1, max: 10000 },
        group: 'settings',
      },
      dkim_domain: {
        type: 'string',
        label: 'DKIM Domain',
        description: 'Domain for DKIM signing',
        required: false,
        group: 'dkim',
      },
      dkim_selector: {
        type: 'string',
        label: 'DKIM Selector',
        description: 'DKIM key selector',
        required: false,
        group: 'dkim',
      },
      dkim_private_key: {
        type: 'secret',
        label: 'DKIM Private Key',
        description: 'RSA private key for DKIM signing (PEM format)',
        required: false,
        sensitive: true,
        group: 'dkim',
      },
    };
  }

  // ─── Sending ───────────────────────────────────────────────────────────────

  /**
   * Send a single email.
   */
  async send(params: SendEmailParams): Promise<SendResult> {
    this.ensureInitialized();

    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    // Check suppression list
    const suppressed = recipients.filter((r) => this.suppressionList.has(r.toLowerCase()));
    if (suppressed.length === recipients.length) {
      throw this.createError(
        'EMAIL_ALL_SUPPRESSED',
        `All recipients are on the suppression list: ${suppressed.join(', ')}`,
        false
      );
    }

    // Apply rate limiting
    await this.enforceRateLimit();

    // Resolve template
    let html = params.html;
    let text = params.text;
    let subject = params.subject;

    if (params.templateId) {
      const template = this.templates.get(params.templateId);
      if (!template) {
        throw this.createError(
          'EMAIL_TEMPLATE_NOT_FOUND',
          `Template "${params.templateId}" not found`,
          false
        );
      }
      const vars = params.templateVars || {};
      html = this.renderTemplate(template.html, vars);
      text = template.text ? this.renderTemplate(template.text, vars) : undefined;
      subject = this.renderTemplate(template.subject, vars);
    }

    const mailOptions: SendMailOptions = {
      from: params.from || this.defaultFrom,
      to: recipients.filter((r) => !this.suppressionList.has(r.toLowerCase())),
      subject,
      html: html || undefined,
      text: text || undefined,
      replyTo: params.replyTo,
      cc: params.cc,
      bcc: params.bcc,
      priority: params.priority,
      headers: params.headers,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        encoding: a.encoding,
        cid: a.cid,
      })),
    };

    try {
      const info = await this.transporter!.sendMail(mailOptions);
      return {
        messageId: info.messageId,
        accepted: (info.accepted || []) as string[],
        rejected: (info.rejected || []) as string[],
        pending: (info.pending || []) as string[],
        envelope: info.envelope as { from: string; to: string[] },
      };
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('ECONNREFUSED') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('ECONNRESET'));

      throw this.createError(
        'EMAIL_SEND_FAILED',
        err instanceof Error ? err.message : 'Failed to send email',
        isRetryable,
        undefined,
        err
      );
    }
  }

  /**
   * Send emails in batch with rate limiting.
   */
  async sendBatch(params: BatchSendParams): Promise<BatchSendResult> {
    this.ensureInitialized();

    const results: BatchSendResult['results'] = [];
    const rateLimit = params.rateLimit || this.rateLimit;
    const delayMs = 1000 / rateLimit;

    for (const recipient of params.recipients) {
      try {
        // Resolve template variables per recipient
        let html = params.html;
        let text: string | undefined;
        let subject = params.subject;

        if (params.templateId) {
          const template = this.templates.get(params.templateId);
          if (template) {
            const vars = { ...recipient.templateVars };
            html = this.renderTemplate(template.html, vars);
            text = template.text ? this.renderTemplate(template.text, vars) : undefined;
            subject = this.renderTemplate(template.subject, vars);
          }
        }

        const sendResult = await this.send({
          to: recipient.to,
          subject,
          html,
          text,
          from: params.from,
          attachments: params.attachments,
          templateVars: recipient.templateVars,
        });

        results.push({
          to: recipient.to,
          success: true,
          messageId: sendResult.messageId,
        });
      } catch (err: unknown) {
        results.push({
          to: recipient.to,
          success: false,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }

      // Rate limiting between sends
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return {
      total: params.recipients.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  /**
   * Register an email template.
   */
  registerTemplate(id: string, template: EmailTemplate): void {
    this.templates.set(id, template);
  }

  /**
   * Remove a registered template.
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * List all registered template IDs.
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Render a template string with variable substitution.
   * Supports {{variable}} syntax with optional fallback: {{variable|fallback}}
   */
  private renderTemplate(template: string, variables: Record<string, string | undefined>): string {
    return template.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (match, key: string, fallback?: string) => {
      const value = variables[key];
      if (value !== undefined && value !== '') {
        return this.escapeHtml(value);
      }
      if (fallback !== undefined) {
        return fallback;
      }
      return match; // Leave unresolved
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Bounce Handling ───────────────────────────────────────────────────────

  /**
   * Handle bounce notification webhook.
   */
  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    const event = payload as {
      type?: string;
      event?: string;
      email?: string;
      reason?: string;
      messageId?: string;
      timestamp?: string;
    };

    const eventType = event.type || event.event || 'unknown';
    const actions: WebhookAction[] = [];

    const bounceEvent = this.parseBounceEvent(event);

    if (bounceEvent) {
      // Add to suppression list for hard bounces and complaints
      if (bounceEvent.type === 'hard_bounce' || bounceEvent.type === 'complaint') {
        this.suppressionList.add(bounceEvent.email.toLowerCase());
      }

      actions.push({
        type: 'update_record',
        entity: 'email_contact',
        entityId: bounceEvent.email,
        payload: {
          bounceType: bounceEvent.type,
          bounceReason: bounceEvent.reason,
          suppressed: bounceEvent.type === 'hard_bounce' || bounceEvent.type === 'complaint',
          lastBounceAt: bounceEvent.timestamp.toISOString(),
        },
      });

      if (bounceEvent.type === 'complaint') {
        actions.push({
          type: 'notify',
          payload: {
            channel: 'email_complaint',
            email: bounceEvent.email,
            reason: bounceEvent.reason,
          },
        });
      }
    }

    return {
      acknowledged: true,
      eventType,
      data: event as Record<string, unknown>,
      actions,
    };
  }

  private parseBounceEvent(event: Record<string, unknown>): BounceEvent | null {
    const email = event.email as string | undefined;
    if (!email) return null;

    const type = event.type as string || event.event as string || '';
    let bounceType: BounceEvent['type'];

    if (type.includes('hard') || type === 'bounce') {
      bounceType = 'hard_bounce';
    } else if (type.includes('soft')) {
      bounceType = 'soft_bounce';
    } else if (type.includes('complaint') || type.includes('spam')) {
      bounceType = 'complaint';
    } else if (type.includes('unsub')) {
      bounceType = 'unsubscribe';
    } else {
      bounceType = 'soft_bounce';
    }

    return {
      type: bounceType,
      email,
      reason: (event.reason as string) || 'Unknown',
      timestamp: event.timestamp ? new Date(event.timestamp as string) : new Date(),
      messageId: event.messageId as string | undefined,
    };
  }

  // ─── Suppression List ──────────────────────────────────────────────────────

  /**
   * Add an email to the suppression list.
   */
  addToSuppressionList(email: string): void {
    this.suppressionList.add(email.toLowerCase());
  }

  /**
   * Remove an email from the suppression list.
   */
  removeFromSuppressionList(email: string): boolean {
    return this.suppressionList.delete(email.toLowerCase());
  }

  /**
   * Check if an email is suppressed.
   */
  isSuppressed(email: string): boolean {
    return this.suppressionList.has(email.toLowerCase());
  }

  /**
   * Get the full suppression list.
   */
  getSuppressionList(): string[] {
    return Array.from(this.suppressionList);
  }

  // ─── SPF/DKIM Helpers ──────────────────────────────────────────────────────

  /**
   * Generate the SPF TXT record value for the configured domain.
   */
  getSPFRecord(additionalIncludes?: string[]): string {
    const includes = additionalIncludes || [];
    const host = this.config?.credentials.smtp_host;
    if (host) {
      includes.unshift(`include:${host}`);
    }
    const parts = ['v=spf1', ...includes.map((i) => (i.startsWith('include:') ? i : `include:${i}`)), '-all'];
    return parts.join(' ');
  }

  /**
   * Generate the DKIM TXT record info for DNS configuration.
   */
  getDKIMRecord(): { selector: string; domain: string; recordName: string; recordType: string } | null {
    if (!this.dkimConfig) return null;

    return {
      selector: this.dkimConfig.keySelector,
      domain: this.dkimConfig.domainName,
      recordName: `${this.dkimConfig.keySelector}._domainkey.${this.dkimConfig.domainName}`,
      recordType: 'TXT',
    };
  }

  /**
   * Generate a DMARC record suggestion.
   */
  getDMARCRecord(policy: 'none' | 'quarantine' | 'reject' = 'quarantine', reportEmail?: string): string {
    const parts = [`v=DMARC1`, `p=${policy}`];
    if (reportEmail) {
      parts.push(`rua=mailto:${reportEmail}`);
      parts.push(`ruf=mailto:${reportEmail}`);
    }
    parts.push('pct=100');
    return parts.join('; ');
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastSendTime;

    if (elapsed >= 1000) {
      // Reset counter every second
      this.sendCount = 0;
      this.lastSendTime = now;
    }

    if (this.sendCount >= this.rateLimit) {
      const waitMs = 1000 - elapsed;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.sendCount = 0;
      this.lastSendTime = Date.now();
    }

    this.sendCount++;
  }
}
