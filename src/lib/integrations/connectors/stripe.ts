/**
 * Stripe Payment Connector
 *
 * Production connector for Stripe payment processing using the Stripe REST API directly.
 * Supports payment intents, refunds, customer management, and webhook processing.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import {
  BaseConnector,
  ConfigField,
  ConnectorConfig,
  HealthCheckResult,
  WebhookResult,
  WebhookAction,
  ConnectorError,
} from '../connector-base';

// ─── Stripe-specific Types ───────────────────────────────────────────────────

export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_received: number;
  currency: string;
  status: string;
  client_secret: string;
  customer?: string;
  metadata: Record<string, string>;
  created: number;
  payment_method?: string;
  capture_method: 'automatic' | 'manual';
  description?: string;
}

export interface StripeCustomer {
  id: string;
  object: 'customer';
  email: string;
  name?: string;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeRefund {
  id: string;
  object: 'refund';
  amount: number;
  currency: string;
  payment_intent: string;
  status: string;
  reason?: string;
  created: number;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  paymentMethodTypes?: string[];
  statementDescriptor?: string;
  receiptEmail?: string;
}

export interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number; // If omitted, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  description?: string;
  phone?: string;
}

// ─── Stripe Connector ────────────────────────────────────────────────────────

export class StripeConnector extends BaseConnector {
  readonly id = 'stripe';
  readonly name = 'Stripe Payments';
  readonly version = '1.0.0';
  readonly category = 'payment' as const;

  private apiKey = '';
  private webhookSecret = '';
  private baseUrl = 'https://api.stripe.com/v1';
  private apiVersion = '2024-12-18.acacia';

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(config: ConnectorConfig): Promise<void> {
    const { credentials, settings } = config;

    if (!credentials.api_key) {
      throw this.createError(
        'STRIPE_MISSING_API_KEY',
        'Stripe API key is required',
        false
      );
    }

    this.apiKey = credentials.api_key;
    this.webhookSecret = credentials.webhook_secret || '';

    if (config.environment === 'sandbox' || config.environment === 'test') {
      if (!this.apiKey.startsWith('sk_test_')) {
        throw this.createError(
          'STRIPE_INVALID_KEY_ENV',
          'Sandbox/test environment requires a test mode API key (sk_test_...)',
          false
        );
      }
    }

    if (settings.api_version && typeof settings.api_version === 'string') {
      this.apiVersion = settings.api_version;
    }

    this.config = config;
    this.initialized = true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      this.ensureInitialized();
      const response = await this.stripeRequest('GET', '/balance');
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          status: 'healthy',
          latencyMs,
          message: 'Stripe API is accessible',
          checkedAt: new Date(),
        };
      }

      if (response.status === 429) {
        return {
          status: 'degraded',
          latencyMs,
          message: 'Stripe API is rate limiting requests',
          checkedAt: new Date(),
        };
      }

      return {
        status: 'unhealthy',
        latencyMs,
        message: `Stripe API returned ${response.status}`,
        checkedAt: new Date(),
      };
    } catch (err: unknown) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Health check failed',
        checkedAt: new Date(),
      };
    }
  }

  async disconnect(): Promise<void> {
    this.apiKey = '';
    this.webhookSecret = '';
    this.initialized = false;
    this.config = null;
  }

  getAuthType(): 'api_key' {
    return 'api_key';
  }

  getConfigSchema(): Record<string, ConfigField> {
    return {
      api_key: {
        type: 'secret',
        label: 'API Secret Key',
        description: 'Your Stripe secret API key (starts with sk_live_ or sk_test_)',
        required: true,
        sensitive: true,
        validation: {
          pattern: '^sk_(live|test)_[a-zA-Z0-9]+$',
        },
        group: 'credentials',
      },
      webhook_secret: {
        type: 'secret',
        label: 'Webhook Signing Secret',
        description: 'Webhook endpoint signing secret (starts with whsec_)',
        required: false,
        sensitive: true,
        validation: {
          pattern: '^whsec_[a-zA-Z0-9]+$',
        },
        group: 'credentials',
      },
      api_version: {
        type: 'string',
        label: 'API Version',
        description: 'Stripe API version to use',
        required: false,
        default: '2024-12-18.acacia',
        group: 'settings',
      },
      statement_descriptor: {
        type: 'string',
        label: 'Statement Descriptor',
        description: 'Default statement descriptor for charges (max 22 chars)',
        required: false,
        validation: {
          maxLength: 22,
        },
        group: 'settings',
      },
    };
  }

  // ─── Payment Intents ───────────────────────────────────────────────────────

  /**
   * Create a new payment intent.
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<StripePaymentIntent> {
    this.ensureInitialized();

    if (params.amount <= 0) {
      throw this.createError('STRIPE_INVALID_AMOUNT', 'Amount must be positive', false);
    }

    const body: Record<string, string> = {
      amount: params.amount.toString(),
      currency: params.currency.toLowerCase(),
    };

    if (params.customerId) body['customer'] = params.customerId;
    if (params.description) body['description'] = params.description;
    if (params.captureMethod) body['capture_method'] = params.captureMethod;
    if (params.statementDescriptor) body['statement_descriptor'] = params.statementDescriptor;
    if (params.receiptEmail) body['receipt_email'] = params.receiptEmail;

    if (params.paymentMethodTypes) {
      params.paymentMethodTypes.forEach((type, i) => {
        body[`payment_method_types[${i}]`] = type;
      });
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    const response = await this.stripeRequest('POST', '/payment_intents', body);
    return this.handleResponse<StripePaymentIntent>(response, 'createPaymentIntent');
  }

  /**
   * Confirm a payment intent.
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<StripePaymentIntent> {
    this.ensureInitialized();

    const body: Record<string, string> = {};
    if (paymentMethodId) {
      body['payment_method'] = paymentMethodId;
    }

    const response = await this.stripeRequest(
      'POST',
      `/payment_intents/${paymentIntentId}/confirm`,
      body
    );
    return this.handleResponse<StripePaymentIntent>(response, 'confirmPaymentIntent');
  }

  /**
   * Capture a payment intent (for manual capture flows).
   */
  async capturePaymentIntent(
    paymentIntentId: string,
    amountToCapture?: number
  ): Promise<StripePaymentIntent> {
    this.ensureInitialized();

    const body: Record<string, string> = {};
    if (amountToCapture !== undefined) {
      body['amount_to_capture'] = amountToCapture.toString();
    }

    const response = await this.stripeRequest(
      'POST',
      `/payment_intents/${paymentIntentId}/capture`,
      body
    );
    return this.handleResponse<StripePaymentIntent>(response, 'capturePaymentIntent');
  }

  /**
   * Cancel a payment intent.
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    this.ensureInitialized();

    const response = await this.stripeRequest(
      'POST',
      `/payment_intents/${paymentIntentId}/cancel`
    );
    return this.handleResponse<StripePaymentIntent>(response, 'cancelPaymentIntent');
  }

  /**
   * Retrieve a payment intent by ID.
   */
  async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    this.ensureInitialized();

    const response = await this.stripeRequest('GET', `/payment_intents/${paymentIntentId}`);
    return this.handleResponse<StripePaymentIntent>(response, 'getPaymentIntent');
  }

  // ─── Refunds ───────────────────────────────────────────────────────────────

  /**
   * Create a refund (full or partial).
   */
  async createRefund(params: CreateRefundParams): Promise<StripeRefund> {
    this.ensureInitialized();

    const body: Record<string, string> = {
      payment_intent: params.paymentIntentId,
    };

    if (params.amount !== undefined) {
      body['amount'] = params.amount.toString();
    }
    if (params.reason) {
      body['reason'] = params.reason;
    }
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    const response = await this.stripeRequest('POST', '/refunds', body);
    return this.handleResponse<StripeRefund>(response, 'createRefund');
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  /**
   * Create a new Stripe customer.
   */
  async createCustomer(params: CreateCustomerParams): Promise<StripeCustomer> {
    this.ensureInitialized();

    const body: Record<string, string> = {
      email: params.email,
    };

    if (params.name) body['name'] = params.name;
    if (params.description) body['description'] = params.description;
    if (params.phone) body['phone'] = params.phone;

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    const response = await this.stripeRequest('POST', '/customers', body);
    return this.handleResponse<StripeCustomer>(response, 'createCustomer');
  }

  /**
   * Retrieve a customer by ID.
   */
  async getCustomer(customerId: string): Promise<StripeCustomer> {
    this.ensureInitialized();

    const response = await this.stripeRequest('GET', `/customers/${customerId}`);
    return this.handleResponse<StripeCustomer>(response, 'getCustomer');
  }

  /**
   * Look up a customer by email.
   */
  async findCustomerByEmail(email: string): Promise<StripeCustomer | null> {
    this.ensureInitialized();

    const response = await this.stripeRequest(
      'GET',
      `/customers/search?query=email:'${encodeURIComponent(email)}'`
    );
    const data = await this.handleResponse<{ data: StripeCustomer[] }>(
      response,
      'findCustomerByEmail'
    );
    return data.data.length > 0 ? data.data[0] : null;
  }

  // ─── Webhook Handling ──────────────────────────────────────────────────────

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = headers['stripe-signature'] || '';

    if (this.webhookSecret && !this.verifyWebhookSignature(rawBody, signature)) {
      return {
        acknowledged: false,
        eventType: 'unknown',
        error: 'Invalid webhook signature',
      };
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventObj = event as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

    const actions: WebhookAction[] = [];

    switch (eventObj.type) {
      case 'payment_intent.succeeded': {
        const pi = eventObj.data.object;
        actions.push({
          type: 'update_record',
          entity: 'payment',
          entityId: pi.id as string,
          payload: {
            status: 'completed',
            amount: pi.amount,
            currency: pi.currency,
            stripePaymentIntentId: pi.id,
          },
        });
        actions.push({
          type: 'notify',
          payload: {
            channel: 'payment_success',
            paymentIntentId: pi.id,
            amount: pi.amount,
            currency: pi.currency,
          },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = eventObj.data.object;
        const lastError = (pi.last_payment_error as Record<string, unknown>) || {};
        actions.push({
          type: 'update_record',
          entity: 'payment',
          entityId: pi.id as string,
          payload: {
            status: 'failed',
            errorCode: lastError.code,
            errorMessage: lastError.message,
            stripePaymentIntentId: pi.id,
          },
        });
        actions.push({
          type: 'notify',
          payload: {
            channel: 'payment_failed',
            paymentIntentId: pi.id,
            error: lastError.message,
          },
        });
        break;
      }

      case 'charge.refunded': {
        const charge = eventObj.data.object;
        actions.push({
          type: 'update_record',
          entity: 'payment',
          entityId: (charge.payment_intent as string) || (charge.id as string),
          payload: {
            status: 'refunded',
            refundedAmount: charge.amount_refunded,
            stripeChargeId: charge.id,
          },
        });
        actions.push({
          type: 'trigger_workflow',
          payload: {
            workflow: 'refund_processing',
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
            amountRefunded: charge.amount_refunded,
          },
        });
        break;
      }

      default:
        actions.push({
          type: 'log',
          payload: {
            message: `Unhandled Stripe event: ${eventObj.type}`,
            eventId: eventObj.id,
          },
        });
    }

    return {
      acknowledged: true,
      eventType: eventObj.type,
      eventId: eventObj.id,
      data: eventObj.data.object as Record<string, unknown>,
      actions,
    };
  }

  verifyWebhookSignature(payload: string, signatureHeader: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    // Parse the Stripe signature header: t=timestamp,v1=signature[,v1=signature...]
    const elements = signatureHeader.split(',');
    const timestampElement = elements.find((e) => e.startsWith('t='));
    const signatureElements = elements.filter((e) => e.startsWith('v1='));

    if (!timestampElement || signatureElements.length === 0) {
      return false;
    }

    const timestamp = timestampElement.substring(2);
    const signatures = signatureElements.map((e) => e.substring(3));

    // Check timestamp tolerance (5 minutes)
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (timestampAge > 300) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe comparison against all provided signatures
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    for (const sig of signatures) {
      const sigBuf = Buffer.from(sig, 'utf8');
      if (expectedBuf.length === sigBuf.length && timingSafeEqual(expectedBuf, sigBuf)) {
        return true;
      }
    }

    return false;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async stripeRequest(
    method: string,
    path: string,
    body?: Record<string, string>
  ): Promise<Response> {
    if (this.isRateLimited()) {
      throw this.createError(
        'STRIPE_RATE_LIMITED',
        `Rate limited. Resets at ${this.rateLimitInfo!.resetAt.toISOString()}`,
        true,
        429
      );
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Stripe-Version': this.apiVersion,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Add idempotency key for POST requests
    if (method === 'POST') {
      const { randomUUID } = await import('crypto');
      headers['Idempotency-Key'] = randomUUID();
    }

    const options: RequestInit = { method, headers };

    if (body && method !== 'GET') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        params.append(key, value);
      }
      options.body = params.toString();
    }

    const response = await fetch(url, options);

    // Update rate limit info from response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });
    this.updateRateLimit(responseHeaders);

    return response;
  }

  private async handleResponse<T>(response: Response, operation: string): Promise<T> {
    const responseBody = await response.text();

    if (response.ok) {
      return JSON.parse(responseBody) as T;
    }

    let errorData: { error?: { type?: string; code?: string; message?: string } } = {};
    try {
      errorData = JSON.parse(responseBody);
    } catch {
      // Non-JSON error response
    }

    const stripeError = errorData.error || {};
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      stripeError.type === 'api_connection_error';

    throw this.createError(
      `STRIPE_${(stripeError.code || stripeError.type || 'UNKNOWN').toUpperCase()}`,
      stripeError.message || `Stripe ${operation} failed with status ${response.status}`,
      retryable,
      response.status
    );
  }
}
