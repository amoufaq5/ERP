import {
  type WebhookConfig,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookPayload,
  type DeliveryStatus,
} from './webhook-types';
import { signPayload, generateTimestamp, buildSignatureHeader } from './webhook-signature';

const API_BASE = '/api/v1/webhooks';
const DELIVERY_TIMEOUT_MS = 30_000;

function generateId(): string {
  return `wh_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function generateDeliveryId(): string {
  return `del_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export class WebhookService {
  private static instance: WebhookService | null = null;
  private cache: WebhookConfig[] | null = null;
  private deliveryCache: WebhookDelivery[] = [];

  private constructor() {}

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  private async loadWebhooks(): Promise<WebhookConfig[]> {
    if (this.cache) return this.cache;
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) return [];
      const data = await res.json();
      this.cache = data.data ?? data;
      return this.cache!;
    } catch {
      return [];
    }
  }

  private async persistWebhook(webhook: WebhookConfig): Promise<void> {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook),
    }).catch(() => {});
  }

  private async persistWebhookUpdate(id: string, patch: Partial<WebhookConfig>): Promise<void> {
    await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  private async persistDelivery(delivery: WebhookDelivery): Promise<void> {
    await fetch(`${API_BASE}/deliveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delivery),
    }).catch(() => {});
  }

  async register(
    config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WebhookConfig> {
    const now = new Date().toISOString();
    const webhook: WebhookConfig = {
      ...config,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.cache = null;
    await this.persistWebhook(webhook);
    return webhook;
  }

  async unregister(webhookId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${webhookId}`, { method: 'DELETE' });
      this.cache = null;
      return res.ok;
    } catch {
      return false;
    }
  }

  async update(
    webhookId: string,
    patch: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
  ): Promise<WebhookConfig | null> {
    const webhooks = await this.loadWebhooks();
    const existing = webhooks.find((w) => w.id === webhookId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.cache = null;
    await this.persistWebhookUpdate(webhookId, { ...patch, updatedAt: updated.updatedAt });
    return updated;
  }

  async getAll(): Promise<WebhookConfig[]> {
    return this.loadWebhooks();
  }

  async getById(id: string): Promise<WebhookConfig | null> {
    const webhooks = await this.loadWebhooks();
    return webhooks.find((w) => w.id === id) ?? null;
  }

  async getDeliveries(webhookId?: string, limit = 50): Promise<WebhookDelivery[]> {
    try {
      const params = new URLSearchParams();
      if (webhookId) params.set('webhookId', webhookId);
      params.set('limit', String(limit));
      const res = await fetch(`${API_BASE}/deliveries?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data;
    } catch {
      return this.deliveryCache
        .filter((d) => !webhookId || d.webhookId === webhookId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }
  }

  private async deliverToEndpoint(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<{ statusCode: number; response?: string; error?: string }> {
    const payloadStr = JSON.stringify(payload);
    const signature = await signPayload(payloadStr, webhook.secret);
    const signatureHeader = buildSignatureHeader(payload.timestamp, signature);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signatureHeader,
      'User-Agent': 'ERP-Webhook/1.0',
      ...(webhook.headers ?? {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseText = await res.text().catch(() => '');
      return {
        statusCode: res.status,
        response: responseText || undefined,
        error: res.ok ? undefined : `HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        statusCode: 0,
        error: message.includes('abort') ? 'Request timeout' : message,
      };
    }
  }

  async dispatch(event: WebhookEvent, data: unknown): Promise<WebhookDelivery[]> {
    const webhooks = (await this.loadWebhooks()).filter(
      (w) => w.isActive && w.events.includes(event)
    );

    const deliveries: WebhookDelivery[] = [];

    for (const webhook of webhooks) {
      const payload: WebhookPayload = {
        event,
        timestamp: generateTimestamp(),
        data,
      };

      const result = await this.deliverToEndpoint(webhook, payload);

      const delivery: WebhookDelivery = {
        id: generateDeliveryId(),
        webhookId: webhook.id,
        event,
        payload,
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        attempts: 1,
        nextRetryAt: result.error
          ? new Date(Date.now() + webhook.retryPolicy.backoffMs).toISOString()
          : undefined,
        deliveredAt: !result.error ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };

      deliveries.push(delivery);
      this.deliveryCache.push(delivery);
      this.persistDelivery(delivery).catch(() => {});
    }

    return deliveries;
  }

  async retry(deliveryId: string): Promise<WebhookDelivery | null> {
    const deliveries = await this.getDeliveries();
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return null;

    const webhook = await this.getById(delivery.webhookId);
    if (!webhook) return null;

    const payload: WebhookPayload = delivery.payload as WebhookPayload;
    const result = await this.deliverToEndpoint(webhook, payload);

    delivery.attempts += 1;
    delivery.statusCode = result.statusCode;
    delivery.response = result.response ?? delivery.response;
    delivery.error = result.error;
    delivery.deliveredAt = !result.error ? new Date().toISOString() : undefined;
    delivery.nextRetryAt =
      !result.error || delivery.attempts >= webhook.retryPolicy.maxRetries
        ? undefined
        : new Date(Date.now() + webhook.retryPolicy.backoffMs * delivery.attempts).toISOString();

    this.persistDelivery(delivery).catch(() => {});
    return delivery;
  }

  async testWebhook(webhookId: string): Promise<WebhookDelivery | null> {
    const webhook = await this.getById(webhookId);
    if (!webhook) return null;

    const payload: WebhookPayload = {
      event: 'test' as WebhookEvent,
      timestamp: generateTimestamp(),
      data: {
        _test: true,
        message: 'Test webhook delivery from ERP',
        webhookId,
      },
    };

    const result = await this.deliverToEndpoint(webhook, payload);

    const delivery: WebhookDelivery = {
      id: generateDeliveryId(),
      webhookId,
      event: 'test' as WebhookEvent,
      payload,
      statusCode: result.statusCode,
      response: result.response,
      error: result.error,
      attempts: 1,
      deliveredAt: !result.error ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    this.deliveryCache.push(delivery);
    this.persistDelivery(delivery).catch(() => {});
    return delivery;
  }

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
