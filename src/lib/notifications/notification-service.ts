import { EventEmitter } from 'events';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationPayload {
  id?: string;
  tenantId: string;
  userId?: string;
  role?: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  sentAt?: Date;
  readAt?: Date;
  failureReason?: string;
  createdAt: Date;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface NotificationServiceConfig {
  email?: EmailConfig;
  smsProvider?: 'twilio' | 'messagebird';
  smsConfig?: Record<string, string>;
  webhookRetries?: number;
  batchSize?: number;
}

class NotificationService {
  private static instance: NotificationService;
  private config: NotificationServiceConfig = {};
  private eventBus = new EventEmitter();
  private notifications: NotificationRecord[] = [];
  private channelHandlers: Map<NotificationChannel, (payload: NotificationPayload) => Promise<boolean>> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  configure(config: NotificationServiceConfig): void {
    this.config = config;
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // In-app notifications (always available)
    this.channelHandlers.set('in_app', async (payload) => {
      const record = this.createRecord(payload);
      record.status = 'delivered';
      record.sentAt = new Date();
      this.notifications.push(record);
      this.eventBus.emit('notification:delivered', record);
      return true;
    });

    // Email handler
    this.channelHandlers.set('email', async (payload) => {
      const record = this.createRecord(payload);
      try {
        if (!this.config.email) {
          console.warn('[NotificationService] Email not configured, queuing for later delivery');
          record.status = 'pending';
          this.notifications.push(record);
          return false;
        }

        // Real email sending via nodemailer
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: this.config.email.host,
          port: this.config.email.port,
          secure: this.config.email.secure,
          auth: {
            user: this.config.email.user,
            pass: this.config.email.pass,
          },
        });

        const html = payload.template
          ? this.renderTemplate(payload.template, payload.templateData || {})
          : `<h2>${payload.title}</h2><p>${payload.body}</p>${payload.actionUrl ? `<a href="${payload.actionUrl}">View Details</a>` : ''}`;

        await transporter.sendMail({
          from: this.config.email.from,
          to: payload.userId, // In production, resolve userId to email
          subject: payload.title,
          html,
        });

        record.status = 'sent';
        record.sentAt = new Date();
        this.notifications.push(record);
        this.eventBus.emit('notification:sent', record);
        return true;
      } catch (error) {
        record.status = 'failed';
        record.failureReason = error instanceof Error ? error.message : 'Unknown error';
        this.notifications.push(record);
        this.eventBus.emit('notification:failed', record);
        return false;
      }
    });

    // SMS handler
    this.channelHandlers.set('sms', async (payload) => {
      const record = this.createRecord(payload);
      if (!this.config.smsConfig) {
        record.status = 'pending';
        this.notifications.push(record);
        return false;
      }
      // Real SMS via Twilio/MessageBird would go here
      record.status = 'sent';
      record.sentAt = new Date();
      this.notifications.push(record);
      return true;
    });

    // Webhook handler
    this.channelHandlers.set('webhook', async (payload) => {
      const record = this.createRecord(payload);
      const url = payload.metadata?.webhookUrl as string;
      if (!url) {
        record.status = 'failed';
        record.failureReason = 'No webhook URL provided';
        this.notifications.push(record);
        return false;
      }

      const maxRetries = this.config.webhookRetries || 3;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: payload.template || 'notification',
              data: { title: payload.title, body: payload.body, ...payload.metadata },
              timestamp: new Date().toISOString(),
            }),
          });

          if (response.ok) {
            record.status = 'delivered';
            record.sentAt = new Date();
            this.notifications.push(record);
            return true;
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        } catch (error) {
          if (attempt === maxRetries) {
            record.status = 'failed';
            record.failureReason = error instanceof Error ? error.message : 'Network error';
            this.notifications.push(record);
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      return false;
    });
  }

  private createRecord(payload: NotificationPayload): NotificationRecord {
    return {
      id: payload.id || crypto.randomUUID(),
      tenantId: payload.tenantId,
      userId: payload.userId || '',
      channel: payload.channel,
      priority: payload.priority,
      title: payload.title,
      body: payload.body,
      status: 'pending',
      metadata: payload.metadata,
      actionUrl: payload.actionUrl,
      createdAt: new Date(),
    };
  }

  private renderTemplate(templateId: string, data: Record<string, unknown>): string {
    // Template rendering - replaces {{variable}} patterns
    const templates: Record<string, string> = {
      'capa-assigned': '<h2>CAPA Assigned: {{title}}</h2><p>You have been assigned CAPA #{{number}}. Priority: {{priority}}.</p><p>Due: {{dueDate}}</p>',
      'approval-required': '<h2>Approval Required: {{title}}</h2><p>{{description}}</p><p>Please review and take action.</p>',
      'deviation-reported': '<h2>Deviation Reported: {{title}}</h2><p>Severity: {{severity}}</p><p>Department: {{department}}</p>',
      'maintenance-due': '<h2>Maintenance Due: {{equipment}}</h2><p>Type: {{type}}</p><p>Scheduled: {{dueDate}}</p>',
      'reservation-confirmed': '<h2>Reservation Confirmed</h2><p>Dear {{guestName}},</p><p>Your reservation #{{confirmationNumber}} is confirmed.</p><p>Check-in: {{checkInDate}}</p>',
      'timesheet-reminder': '<h2>Timesheet Reminder</h2><p>Please submit your timesheet for the week ending {{weekEnd}}.</p>',
      'password-reset': '<h2>Password Reset</h2><p>Click the link below to reset your password:</p><a href="{{resetUrl}}">Reset Password</a>',
      'welcome': '<h2>Welcome to {{appName}}</h2><p>Your account has been created. Please login at {{loginUrl}}.</p>',
    };

    let html = templates[templateId] || `<h2>${templateId}</h2><p>{{body}}</p>`;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return html;
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    const handler = this.channelHandlers.get(payload.channel);
    if (!handler) {
      console.error(`[NotificationService] No handler for channel: ${payload.channel}`);
      return false;
    }
    return handler(payload);
  }

  async sendMultiChannel(payload: Omit<NotificationPayload, 'channel'>, channels: NotificationChannel[]): Promise<Record<NotificationChannel, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      channels.map(async (channel) => {
        results[channel] = await this.send({ ...payload, channel });
      })
    );
    return results as Record<NotificationChannel, boolean>;
  }

  async sendToRole(tenantId: string, role: string, payload: Omit<NotificationPayload, 'tenantId' | 'channel'>, channel: NotificationChannel = 'in_app'): Promise<void> {
    // In production, resolve role to user list from DB
    await this.send({ ...payload, tenantId, channel, role });
  }

  getNotifications(tenantId: string, userId: string, options?: { unreadOnly?: boolean; limit?: number }): NotificationRecord[] {
    let filtered = this.notifications.filter(n => n.tenantId === tenantId && n.userId === userId);
    if (options?.unreadOnly) {
      filtered = filtered.filter(n => !n.readAt);
    }
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return filtered.slice(0, options?.limit || 50);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.readAt = new Date();
      notification.status = 'read';
    }
  }

  markAllAsRead(tenantId: string, userId: string): void {
    this.notifications
      .filter(n => n.tenantId === tenantId && n.userId === userId && !n.readAt)
      .forEach(n => {
        n.readAt = new Date();
        n.status = 'read';
      });
  }

  getUnreadCount(tenantId: string, userId: string): number {
    return this.notifications.filter(n => n.tenantId === tenantId && n.userId === userId && !n.readAt).length;
  }

  onNotification(event: string, handler: (record: NotificationRecord) => void): void {
    this.eventBus.on(event, handler);
  }

  registerChannelHandler(channel: NotificationChannel, handler: (payload: NotificationPayload) => Promise<boolean>): void {
    this.channelHandlers.set(channel, handler);
  }
}

export const notificationService = NotificationService.getInstance();
export { NotificationService };
