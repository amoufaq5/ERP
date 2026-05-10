/**
 * Webhook Delivery Service
 *
 * Production-grade webhook delivery system with queue-based processing,
 * exponential backoff retries, dead letter queue, HMAC-SHA256 signing,
 * and comprehensive delivery logging.
 */

import { createHmac, randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  id?: string;
  tenantId: string;
  url: string;
  event: string;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  attemptNumber: number;
  deliveredAt?: Date;
  durationMs: number;
  error?: string;
}

export interface DeliveryLogEntry {
  webhookId: string;
  tenantId: string;
  url: string;
  event: string;
  attempts: WebhookAttempt[];
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  createdAt: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
}

export interface WebhookAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  success: boolean;
}

export interface DeadLetterEntry {
  webhookId: string;
  tenantId: string;
  payload: WebhookPayload;
  lastAttempt: WebhookAttempt;
  totalAttempts: number;
  failedAt: Date;
  reason: string;
}

export interface WebhookDeliveryConfig {
  maxConcurrency: number;
  defaultTimeoutMs: number;
  maxAttempts: number;
  retryDelaysMs: number[];
  signingAlgorithm: string;
  batchSize: number;
  batchDelayMs: number;
}

interface QueueItem {
  payload: WebhookPayload;
  attemptNumber: number;
  scheduledAt: Date;
}

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_CONFIG: WebhookDeliveryConfig = {
  maxConcurrency: 10,
  defaultTimeoutMs: 30000,
  maxAttempts: 5,
  retryDelaysMs: [1000, 5000, 30000, 300000, 1800000], // 1s, 5s, 30s, 5min, 30min
  signingAlgorithm: 'sha256',
  batchSize: 50,
  batchDelayMs: 100,
};

// ─── Webhook Delivery Service ────────────────────────────────────────────────

export class WebhookDeliveryService {
  private config: WebhookDeliveryConfig;
  private queue: QueueItem[] = [];
  private activeDeliveries = 0;
  private deliveryLogs: Map<string, DeliveryLogEntry> = new Map();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private processing = false;
  private processingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: Partial<WebhookDeliveryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Enqueue a webhook for delivery.
   */
  async deliver(payload: WebhookPayload): Promise<string> {
    const webhookId = payload.id || randomUUID();
    const enrichedPayload: WebhookPayload = { ...payload, id: webhookId };

    // Create delivery log entry
    this.deliveryLogs.set(webhookId, {
      webhookId,
      tenantId: payload.tenantId,
      url: payload.url,
      event: payload.event,
      attempts: [],
      status: 'pending',
      createdAt: new Date(),
    });

    // Enqueue
    this.queue.push({
      payload: enrichedPayload,
      attemptNumber: 1,
      scheduledAt: new Date(),
    });

    this.processQueue();
    return webhookId;
  }

  /**
   * Deliver multiple webhooks in batch.
   */
  async deliverBatch(payloads: WebhookPayload[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < payloads.length; i += this.config.batchSize) {
      const batch = payloads.slice(i, i + this.config.batchSize);
      const batchIds = await Promise.all(batch.map((p) => this.deliver(p)));
      ids.push(...batchIds);

      // Small delay between batches to avoid overwhelming
      if (i + this.config.batchSize < payloads.length) {
        await new Promise((resolve) => setTimeout(resolve, this.config.batchDelayMs));
      }
    }

    return ids;
  }

  /**
   * Retry a specific failed webhook from the dead letter queue.
   */
  async retryFailed(webhookId: string): Promise<boolean> {
    const dlqIndex = this.deadLetterQueue.findIndex((entry) => entry.webhookId === webhookId);
    if (dlqIndex === -1) {
      return false;
    }

    const entry = this.deadLetterQueue[dlqIndex];
    this.deadLetterQueue.splice(dlqIndex, 1);

    // Reset the delivery log
    const log = this.deliveryLogs.get(webhookId);
    if (log) {
      log.status = 'pending';
      log.nextRetryAt = undefined;
      log.completedAt = undefined;
    }

    // Re-enqueue with attempt 1
    this.queue.push({
      payload: entry.payload,
      attemptNumber: 1,
      scheduledAt: new Date(),
    });

    this.processQueue();
    return true;
  }

  /**
   * Get the delivery log for a specific webhook.
   */
  getDeliveryLog(webhookId: string): DeliveryLogEntry | undefined {
    return this.deliveryLogs.get(webhookId);
  }

  /**
   * Get all entries in the dead letter queue, optionally filtered by tenant.
   */
  getDeadLetterQueue(tenantId?: string): DeadLetterEntry[] {
    if (!tenantId) {
      return [...this.deadLetterQueue];
    }
    return this.deadLetterQueue.filter((entry) => entry.tenantId === tenantId);
  }

  /**
   * Get delivery logs for a tenant.
   */
  getTenantDeliveryLogs(tenantId: string, limit = 100): DeliveryLogEntry[] {
    const logs: DeliveryLogEntry[] = [];
    for (const log of this.deliveryLogs.values()) {
      if (log.tenantId === tenantId) {
        logs.push(log);
      }
    }
    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get service statistics.
   */
  getStats(): {
    queueSize: number;
    activeDeliveries: number;
    deadLetterCount: number;
    totalProcessed: number;
    successRate: number;
  } {
    let delivered = 0;
    let failed = 0;

    for (const log of this.deliveryLogs.values()) {
      if (log.status === 'delivered') delivered++;
      if (log.status === 'failed' || log.status === 'dead_letter') failed++;
    }

    const total = delivered + failed;
    return {
      queueSize: this.queue.length,
      activeDeliveries: this.activeDeliveries,
      deadLetterCount: this.deadLetterQueue.length,
      totalProcessed: total,
      successRate: total > 0 ? delivered / total : 0,
    };
  }

  /**
   * Purge dead letter queue entries older than the specified duration.
   */
  purgeDeadLetterQueue(olderThanMs?: number): number {
    if (!olderThanMs) {
      const count = this.deadLetterQueue.length;
      this.deadLetterQueue = [];
      return count;
    }

    const cutoff = new Date(Date.now() - olderThanMs);
    const before = this.deadLetterQueue.length;
    this.deadLetterQueue = this.deadLetterQueue.filter(
      (entry) => entry.failedAt > cutoff
    );
    return before - this.deadLetterQueue.length;
  }

  /**
   * Gracefully shut down the service, finishing active deliveries.
   */
  async shutdown(): Promise<void> {
    this.processing = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    // Wait for active deliveries to complete (with timeout)
    const shutdownTimeout = 30000;
    const start = Date.now();
    while (this.activeDeliveries > 0 && Date.now() - start < shutdownTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;
    this.drainQueue();
  }

  private drainQueue(): void {
    while (this.queue.length > 0 && this.activeDeliveries < this.config.maxConcurrency) {
      const now = new Date();
      // Find the next item that is ready
      const readyIndex = this.queue.findIndex((item) => item.scheduledAt <= now);

      if (readyIndex === -1) {
        // All items are scheduled for later; set a timer
        const nextItem = this.queue.reduce((earliest, item) =>
          item.scheduledAt < earliest.scheduledAt ? item : earliest
        );
        const delayMs = nextItem.scheduledAt.getTime() - now.getTime();
        this.processingTimer = setTimeout(() => {
          this.processingTimer = null;
          this.drainQueue();
        }, Math.max(delayMs, 10));
        return;
      }

      const item = this.queue.splice(readyIndex, 1)[0];
      this.activeDeliveries++;

      void this.executeDelivery(item).finally(() => {
        this.activeDeliveries--;
        // Continue draining
        if (this.queue.length > 0) {
          this.drainQueue();
        } else {
          this.processing = false;
        }
      });
    }

    if (this.queue.length === 0) {
      this.processing = false;
    }
  }

  private async executeDelivery(item: QueueItem): Promise<void> {
    const { payload, attemptNumber } = item;
    const webhookId = payload.id!;
    const log = this.deliveryLogs.get(webhookId);

    const startedAt = new Date();
    let attempt: WebhookAttempt;

    try {
      const result = await this.sendWebhook(payload);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      attempt = {
        attemptNumber,
        startedAt,
        completedAt,
        durationMs,
        statusCode: result.statusCode,
        responseBody: result.responseBody?.substring(0, 1024),
        success: result.success,
        error: result.error,
      };

      if (log) {
        log.attempts.push(attempt);
      }

      if (result.success) {
        if (log) {
          log.status = 'delivered';
          log.completedAt = completedAt;
        }
      } else {
        this.handleFailedAttempt(payload, attempt, attemptNumber);
      }
    } catch (err: unknown) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage = err instanceof Error ? err.message : 'Unknown delivery error';

      attempt = {
        attemptNumber,
        startedAt,
        completedAt,
        durationMs,
        success: false,
        error: errorMessage,
      };

      if (log) {
        log.attempts.push(attempt);
      }

      this.handleFailedAttempt(payload, attempt, attemptNumber);
    }
  }

  private handleFailedAttempt(
    payload: WebhookPayload,
    attempt: WebhookAttempt,
    attemptNumber: number
  ): void {
    const webhookId = payload.id!;
    const log = this.deliveryLogs.get(webhookId);

    if (attemptNumber >= this.config.maxAttempts) {
      // Move to dead letter queue
      if (log) {
        log.status = 'dead_letter';
        log.completedAt = new Date();
      }

      this.deadLetterQueue.push({
        webhookId,
        tenantId: payload.tenantId,
        payload,
        lastAttempt: attempt,
        totalAttempts: attemptNumber,
        failedAt: new Date(),
        reason: attempt.error || `HTTP ${attempt.statusCode}`,
      });
    } else {
      // Schedule retry with exponential backoff
      const delayMs = this.config.retryDelaysMs[attemptNumber - 1] || 1800000;
      const nextRetryAt = new Date(Date.now() + delayMs);

      if (log) {
        log.status = 'pending';
        log.nextRetryAt = nextRetryAt;
      }

      this.queue.push({
        payload,
        attemptNumber: attemptNumber + 1,
        scheduledAt: nextRetryAt,
      });

      // Ensure queue processing will pick up the scheduled item
      if (!this.processingTimer) {
        this.processingTimer = setTimeout(() => {
          this.processingTimer = null;
          this.drainQueue();
        }, delayMs + 10);
      }
    }
  }

  private async sendWebhook(
    payload: WebhookPayload
  ): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
    const body = JSON.stringify({
      id: payload.id,
      event: payload.event,
      data: payload.data,
      timestamp: new Date().toISOString(),
      metadata: payload.metadata,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ERP-Webhook-Service/1.0',
      'X-Webhook-Id': payload.id!,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': Date.now().toString(),
      ...payload.headers,
    };

    // Sign the payload
    if (payload.secret) {
      const timestamp = headers['X-Webhook-Timestamp'];
      const signaturePayload = `${timestamp}.${body}`;
      const signature = createHmac('sha256', payload.secret)
        .update(signaturePayload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const timeoutMs = payload.timeoutMs || this.config.defaultTimeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(payload.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      const success = response.status >= 200 && response.status < 300;

      return {
        success,
        statusCode: response.status,
        responseBody,
        error: success ? undefined : `HTTP ${response.status}: ${responseBody.substring(0, 256)}`,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${timeoutMs}ms`,
        };
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  // ─── Signature Utilities (static) ──────────────────────────────────────────

  /**
   * Generate an HMAC-SHA256 signature for a webhook payload.
   */
  static generateSignature(payload: string, secret: string, timestamp: string): string {
    const signaturePayload = `${timestamp}.${payload}`;
    return createHmac('sha256', secret).update(signaturePayload).digest('hex');
  }

  /**
   * Verify an incoming webhook signature (timing-safe).
   */
  static verifySignature(
    payload: string,
    secret: string,
    timestamp: string,
    receivedSignature: string
  ): boolean {
    const expected = WebhookDeliveryService.generateSignature(payload, secret, timestamp);
    const receivedClean = receivedSignature.replace('sha256=', '');

    if (expected.length !== receivedClean.length) {
      return false;
    }

    // Timing-safe comparison
    const { timingSafeEqual } = require('crypto') as typeof import('crypto');
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedClean, 'hex'));
  }
}
