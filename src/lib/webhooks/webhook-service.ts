import {
  type WebhookConfig,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookPayload,
  type DeliveryStatus,
} from './webhook-types';
import { signPayload, generateTimestamp, buildSignatureHeader } from './webhook-signature';

const WEBHOOKS_KEY = 'pharma.webhooks';
const DELIVERIES_KEY = 'pharma.webhook-deliveries';

function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateDeliveryId(): string {
  return `del_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class WebhookService {
  private static instance: WebhookService | null = null;

  private constructor() {
    this.seedDemoData();
  }

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------

  private loadWebhooks(): WebhookConfig[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(WEBHOOKS_KEY);
      return raw ? (JSON.parse(raw) as WebhookConfig[]) : [];
    } catch {
      return [];
    }
  }

  private saveWebhooks(webhooks: WebhookConfig[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));
  }

  private loadDeliveries(): WebhookDelivery[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DELIVERIES_KEY);
      return raw ? (JSON.parse(raw) as WebhookDelivery[]) : [];
    } catch {
      return [];
    }
  }

  private saveDeliveries(deliveries: WebhookDelivery[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DELIVERIES_KEY, JSON.stringify(deliveries));
  }

  // ---------------------------------------------------------------------------
  // Seed demo data
  // ---------------------------------------------------------------------------

  private seedDemoData(): void {
    if (typeof window === 'undefined') return;
    const existing = this.loadWebhooks();
    if (existing.length > 0) return;

    const now = new Date().toISOString();

    const demoWebhooks: WebhookConfig[] = [
      {
        id: 'wh_demo_erp_sync',
        url: 'https://erp.example.com/api/webhooks/pharma',
        events: ['doctor.created', 'doctor.updated', 'visit.created', 'visit.completed'],
        secret: 'whsec_erp_demo_secret_key_12345',
        isActive: true,
        description: 'ERP Sync - Synchronises doctor and visit data with the central ERP system',
        headers: { 'X-Source': 'pharma-crm' },
        retryPolicy: { maxRetries: 3, backoffMs: 5000 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh_demo_notifications',
        url: 'https://notify.example.com/hooks/approvals',
        events: [
          'plan.approved',
          'plan.rejected',
          'request.approved',
          'request.rejected',
          'expense.approved',
        ],
        secret: 'whsec_notify_demo_secret_key_67890',
        isActive: true,
        description: 'Notification Service - Sends approval/rejection alerts via email and Slack',
        headers: {},
        retryPolicy: { maxRetries: 5, backoffMs: 10000 },
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.saveWebhooks(demoWebhooks);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  register(
    config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): WebhookConfig {
    const webhooks = this.loadWebhooks();
    const now = new Date().toISOString();
    const webhook: WebhookConfig = {
      ...config,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    webhooks.push(webhook);
    this.saveWebhooks(webhooks);
    return webhook;
  }

  unregister(webhookId: string): boolean {
    const webhooks = this.loadWebhooks();
    const idx = webhooks.findIndex((w) => w.id === webhookId);
    if (idx === -1) return false;
    webhooks.splice(idx, 1);
    this.saveWebhooks(webhooks);
    return true;
  }

  update(
    webhookId: string,
    patch: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
  ): WebhookConfig | null {
    const webhooks = this.loadWebhooks();
    const idx = webhooks.findIndex((w) => w.id === webhookId);
    if (idx === -1) return null;
    webhooks[idx] = {
      ...webhooks[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.saveWebhooks(webhooks);
    return webhooks[idx];
  }

  getAll(): WebhookConfig[] {
    return this.loadWebhooks();
  }

  getById(id: string): WebhookConfig | null {
    return this.loadWebhooks().find((w) => w.id === id) ?? null;
  }

  getDeliveries(webhookId?: string, limit = 50): WebhookDelivery[] {
    let deliveries = this.loadDeliveries();
    if (webhookId) {
      deliveries = deliveries.filter((d) => d.webhookId === webhookId);
    }
    return deliveries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  async dispatch(event: WebhookEvent, data: unknown): Promise<WebhookDelivery[]> {
    const webhooks = this.loadWebhooks().filter(
      (w) => w.isActive && w.events.includes(event)
    );

    const deliveries: WebhookDelivery[] = [];

    for (const webhook of webhooks) {
      const payload: WebhookPayload = {
        event,
        timestamp: generateTimestamp(),
        data,
      };

      const payloadStr = JSON.stringify(payload);
      const signature = await signPayload(payloadStr, webhook.secret);
      const signatureHeader = buildSignatureHeader(payload.timestamp, signature);

      // For demo: log to console instead of making real HTTP requests
      console.log(`[Webhook] Dispatching ${event} to ${webhook.url}`);
      console.log(`[Webhook] Signature: ${signatureHeader}`);
      console.log(`[Webhook] Payload:`, payload);

      // Simulate delivery — randomly succeed or fail for demo purposes
      const success = Math.random() > 0.2;
      const status: DeliveryStatus = success ? 'delivered' : 'failed';

      const delivery: WebhookDelivery = {
        id: generateDeliveryId(),
        webhookId: webhook.id,
        event,
        payload,
        statusCode: success ? 200 : 500,
        response: success ? '{"ok":true}' : undefined,
        error: success ? undefined : 'Connection refused (simulated)',
        attempts: 1,
        nextRetryAt: success
          ? undefined
          : new Date(Date.now() + webhook.retryPolicy.backoffMs).toISOString(),
        deliveredAt: success ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };

      deliveries.push(delivery);
      console.log(`[Webhook] Delivery ${delivery.id}: ${status}`);
    }

    // Persist deliveries
    const allDeliveries = this.loadDeliveries();
    allDeliveries.push(...deliveries);
    this.saveDeliveries(allDeliveries);

    return deliveries;
  }

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  async retry(deliveryId: string): Promise<WebhookDelivery | null> {
    const deliveries = this.loadDeliveries();
    const idx = deliveries.findIndex((d) => d.id === deliveryId);
    if (idx === -1) return null;

    const delivery = deliveries[idx];
    const webhook = this.getById(delivery.webhookId);
    if (!webhook) return null;

    // Simulate retry
    const success = Math.random() > 0.3;
    delivery.attempts += 1;
    delivery.statusCode = success ? 200 : 500;
    delivery.response = success ? '{"ok":true}' : delivery.response;
    delivery.error = success ? undefined : 'Retry failed (simulated)';
    delivery.deliveredAt = success ? new Date().toISOString() : undefined;
    delivery.nextRetryAt =
      success || delivery.attempts >= webhook.retryPolicy.maxRetries
        ? undefined
        : new Date(Date.now() + webhook.retryPolicy.backoffMs * delivery.attempts).toISOString();

    deliveries[idx] = delivery;
    this.saveDeliveries(deliveries);

    console.log(
      `[Webhook] Retry ${deliveryId} attempt #${delivery.attempts}: ${success ? 'delivered' : 'failed'}`
    );
    return delivery;
  }

  // ---------------------------------------------------------------------------
  // Test
  // ---------------------------------------------------------------------------

  async testWebhook(webhookId: string): Promise<WebhookDelivery | null> {
    const webhook = this.getById(webhookId);
    if (!webhook) return null;

    const payload: WebhookPayload = {
      event: 'doctor.created' as WebhookEvent,
      timestamp: generateTimestamp(),
      data: {
        _test: true,
        message: 'This is a test webhook delivery from PharmaERP',
        webhookId,
      },
    };

    const payloadStr = JSON.stringify(payload);
    const signature = await signPayload(payloadStr, webhook.secret);
    const signatureHeader = buildSignatureHeader(payload.timestamp, signature);

    console.log(`[Webhook Test] Pinging ${webhook.url}`);
    console.log(`[Webhook Test] Signature: ${signatureHeader}`);

    const delivery: WebhookDelivery = {
      id: generateDeliveryId(),
      webhookId,
      event: 'doctor.created' as WebhookEvent,
      payload,
      statusCode: 200,
      response: '{"ok":true,"test":true}',
      attempts: 1,
      deliveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const deliveries = this.loadDeliveries();
    deliveries.push(delivery);
    this.saveDeliveries(deliveries);

    return delivery;
  }

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------

  generateSecret(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const base = Array.from(array)
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 32);
    return `whsec_${base}`;
  }

  getDeliveryStatus(delivery: WebhookDelivery): DeliveryStatus {
    if (delivery.deliveredAt) return 'delivered';
    if (delivery.error) return 'failed';
    return 'pending';
  }
}

export const webhookService = WebhookService.getInstance();
