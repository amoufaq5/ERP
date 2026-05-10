/**
 * Integration Connector SDK
 *
 * Main entry point for the connector framework.
 * Import from '@/lib/integrations' to access all SDK components.
 */

// Base classes and types
export {
  BaseConnector,
  type ConnectorCategory,
  type AuthType,
  type ConfigFieldType,
  type ConfigField,
  type ConnectorConfig,
  type HealthCheckResult,
  type WebhookResult,
  type WebhookAction,
  type ConnectorError,
  type RateLimitInfo,
} from './connector-base';

// Registry
export { ConnectorRegistry, getConnectorRegistry } from './connector-registry';

// Webhook delivery
export {
  WebhookDeliveryService,
  type WebhookPayload,
  type WebhookDeliveryResult,
  type DeliveryLogEntry,
  type WebhookAttempt,
  type DeadLetterEntry,
  type WebhookDeliveryConfig,
} from './webhook-delivery';

// Connectors
export { StripeConnector } from './connectors/stripe';
export { EmailConnector } from './connectors/email';
export { S3Connector } from './connectors/s3';
