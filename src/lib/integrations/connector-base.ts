/**
 * Integration Connector SDK - Base Classes and Types
 *
 * Provides the abstract foundation for building connectors to external services.
 * All connectors must extend BaseConnector and implement required lifecycle methods.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export type ConnectorCategory =
  | 'payment'
  | 'communication'
  | 'storage'
  | 'identity'
  | 'accounting'
  | 'shipping'
  | 'ecommerce'
  | 'government';

export type AuthType = 'api_key' | 'oauth2' | 'basic' | 'certificate';

export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'url' | 'email';

export interface ConfigField {
  type: ConfigFieldType;
  label: string;
  description: string;
  required: boolean;
  default?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  sensitive?: boolean;
  group?: string;
}

export interface ConnectorConfig {
  tenantId: string;
  credentials: Record<string, string>;
  settings: Record<string, string | number | boolean>;
  environment: 'production' | 'sandbox' | 'test';
  metadata?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
  checkedAt: Date;
}

export interface WebhookResult {
  acknowledged: boolean;
  eventType: string;
  eventId?: string;
  data?: Record<string, unknown>;
  actions?: WebhookAction[];
  error?: string;
}

export interface WebhookAction {
  type: 'update_record' | 'create_record' | 'notify' | 'trigger_workflow' | 'log';
  entity?: string;
  entityId?: string;
  payload: Record<string, unknown>;
}

export interface ConnectorError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

// ─── Abstract Base Connector ─────────────────────────────────────────────────

export abstract class BaseConnector {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly category: ConnectorCategory;

  protected config: ConnectorConfig | null = null;
  protected initialized = false;
  protected rateLimitInfo: RateLimitInfo | null = null;

  // ─── Lifecycle Methods ───────────────────────────────────────────────────

  /**
   * Initialize the connector with tenant-specific configuration.
   * Must be called before any operations.
   */
  abstract initialize(config: ConnectorConfig): Promise<void>;

  /**
   * Perform a health check against the external service.
   * Should test connectivity and basic authorization.
   */
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * Gracefully disconnect and clean up resources.
   */
  abstract disconnect(): Promise<void>;

  // ─── Auth & Configuration ────────────────────────────────────────────────

  /**
   * Return the authentication type this connector uses.
   */
  abstract getAuthType(): AuthType;

  /**
   * Return the configuration schema describing all required/optional fields.
   */
  abstract getConfigSchema(): Record<string, ConfigField>;

  // ─── Webhook Handling (optional) ─────────────────────────────────────────

  /**
   * Process an incoming webhook payload from the external service.
   */
  handleWebhook?(payload: unknown, headers: Record<string, string>): Promise<WebhookResult>;

  /**
   * Verify the authenticity of an incoming webhook using its signature.
   */
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  // ─── Shared Utilities ────────────────────────────────────────────────────

  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw this.createError(
        'CONNECTOR_NOT_INITIALIZED',
        `Connector "${this.id}" has not been initialized. Call initialize() first.`,
        false
      );
    }
  }

  protected createError(
    code: string,
    message: string,
    retryable: boolean,
    statusCode?: number,
    originalError?: unknown
  ): ConnectorError {
    return {
      code,
      message,
      retryable,
      statusCode,
      originalError,
      context: {
        connectorId: this.id,
        connectorVersion: this.version,
        tenantId: this.config?.tenantId,
      },
    };
  }

  protected isRateLimited(): boolean {
    if (!this.rateLimitInfo) return false;
    return this.rateLimitInfo.remaining <= 0 && this.rateLimitInfo.resetAt > new Date();
  }

  protected updateRateLimit(headers: Record<string, string>): void {
    const limit = headers['x-ratelimit-limit'] || headers['ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'] || headers['ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'] || headers['ratelimit-reset'];

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt: new Date(parseInt(reset, 10) * 1000),
      };
    }
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err: unknown) {
        lastError = err;
        const connErr = err as ConnectorError;

        if (!connErr.retryable || attempt === maxAttempts) {
          throw err;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get connector metadata for registry display.
   */
  getMetadata(): {
    id: string;
    name: string;
    version: string;
    category: ConnectorCategory;
    authType: AuthType;
    initialized: boolean;
  } {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      category: this.category,
      authType: this.getAuthType(),
      initialized: this.initialized,
    };
  }
}
