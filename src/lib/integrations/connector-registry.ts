/**
 * Connector Registry - Singleton service for managing connector instances.
 *
 * Provides tenant-scoped connector management, health monitoring,
 * and lifecycle coordination across all registered connectors.
 */

import {
  BaseConnector,
  ConnectorCategory,
  ConnectorConfig,
  ConnectorError,
  HealthCheckResult,
} from './connector-base';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegisteredConnector {
  factory: () => BaseConnector;
  metadata: {
    id: string;
    name: string;
    version: string;
    category: ConnectorCategory;
  };
}

interface TenantConnectorInstance {
  connector: BaseConnector;
  config: ConnectorConfig;
  initializedAt: Date;
  lastHealthCheck?: HealthCheckResult;
}

interface RegistryStats {
  totalRegistered: number;
  totalInstances: number;
  byCategory: Record<string, number>;
  byTenant: Record<string, number>;
}

// ─── Registry Implementation ─────────────────────────────────────────────────

export class ConnectorRegistry {
  private static instance: ConnectorRegistry | null = null;

  private registeredConnectors: Map<string, RegisteredConnector> = new Map();
  private tenantInstances: Map<string, TenantConnectorInstance> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  /**
   * Get the singleton registry instance.
   */
  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  /**
   * Reset the registry (primarily for testing).
   */
  static resetInstance(): void {
    if (ConnectorRegistry.instance) {
      ConnectorRegistry.instance.shutdown();
      ConnectorRegistry.instance = null;
    }
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a connector factory. Does not instantiate the connector.
   */
  register(factory: () => BaseConnector): void {
    const probe = factory();
    const metadata = probe.getMetadata();

    if (this.registeredConnectors.has(metadata.id)) {
      throw new Error(
        `Connector with id "${metadata.id}" is already registered. Unregister it first.`
      );
    }

    this.registeredConnectors.set(metadata.id, {
      factory,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        version: metadata.version,
        category: metadata.category,
      },
    });
  }

  /**
   * Unregister a connector and disconnect all its tenant instances.
   */
  async unregister(connectorId: string): Promise<void> {
    if (!this.registeredConnectors.has(connectorId)) {
      throw new Error(`Connector "${connectorId}" is not registered.`);
    }

    // Disconnect all tenant instances of this connector
    const keysToRemove: string[] = [];
    for (const [key, instance] of this.tenantInstances.entries()) {
      if (instance.connector.id === connectorId) {
        try {
          await instance.connector.disconnect();
        } catch {
          // Best effort disconnect
        }
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.tenantInstances.delete(key);
    }

    this.registeredConnectors.delete(connectorId);
  }

  // ─── Instance Management ───────────────────────────────────────────────────

  /**
   * Build a composite key for tenant+connector scoping.
   */
  private buildInstanceKey(tenantId: string, connectorId: string): string {
    return `${tenantId}::${connectorId}`;
  }

  /**
   * Get or create a configured connector instance for a specific tenant.
   */
  async getConnectorForTenant(
    connectorId: string,
    config: ConnectorConfig
  ): Promise<BaseConnector> {
    const key = this.buildInstanceKey(config.tenantId, connectorId);

    const existing = this.tenantInstances.get(key);
    if (existing) {
      return existing.connector;
    }

    const registered = this.registeredConnectors.get(connectorId);
    if (!registered) {
      throw new Error(
        `Connector "${connectorId}" is not registered. Available: ${Array.from(
          this.registeredConnectors.keys()
        ).join(', ')}`
      );
    }

    const instance = registered.factory();
    await instance.initialize(config);

    this.tenantInstances.set(key, {
      connector: instance,
      config,
      initializedAt: new Date(),
    });

    return instance;
  }

  /**
   * Disconnect and remove a tenant's connector instance.
   */
  async disconnectTenantConnector(tenantId: string, connectorId: string): Promise<void> {
    const key = this.buildInstanceKey(tenantId, connectorId);
    const instance = this.tenantInstances.get(key);

    if (!instance) {
      return;
    }

    await instance.connector.disconnect();
    this.tenantInstances.delete(key);
  }

  /**
   * Disconnect all connector instances for a tenant.
   */
  async disconnectTenant(tenantId: string): Promise<void> {
    const keysToRemove: string[] = [];

    for (const [key, instance] of this.tenantInstances.entries()) {
      if (instance.config.tenantId === tenantId) {
        try {
          await instance.connector.disconnect();
        } catch {
          // Best effort disconnect
        }
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.tenantInstances.delete(key);
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /**
   * Get a registered connector's metadata by ID.
   */
  getConnectorById(connectorId: string): RegisteredConnector | undefined {
    return this.registeredConnectors.get(connectorId);
  }

  /**
   * Get all registered connectors in a specific category.
   */
  getConnectorsByCategory(category: ConnectorCategory): RegisteredConnector[] {
    const results: RegisteredConnector[] = [];
    for (const registered of this.registeredConnectors.values()) {
      if (registered.metadata.category === category) {
        results.push(registered);
      }
    }
    return results;
  }

  /**
   * Get all registered connector metadata.
   */
  listConnectors(): RegisteredConnector[] {
    return Array.from(this.registeredConnectors.values());
  }

  /**
   * Get all active instances for a tenant.
   */
  getTenantInstances(tenantId: string): Array<{
    connectorId: string;
    initializedAt: Date;
    lastHealthCheck?: HealthCheckResult;
  }> {
    const results: Array<{
      connectorId: string;
      initializedAt: Date;
      lastHealthCheck?: HealthCheckResult;
    }> = [];

    for (const [key, instance] of this.tenantInstances.entries()) {
      if (key.startsWith(`${tenantId}::`)) {
        results.push({
          connectorId: instance.connector.id,
          initializedAt: instance.initializedAt,
          lastHealthCheck: instance.lastHealthCheck,
        });
      }
    }

    return results;
  }

  // ─── Health Checks ─────────────────────────────────────────────────────────

  /**
   * Run health check on a specific tenant's connector instance.
   */
  async healthCheckConnector(tenantId: string, connectorId: string): Promise<HealthCheckResult> {
    const key = this.buildInstanceKey(tenantId, connectorId);
    const instance = this.tenantInstances.get(key);

    if (!instance) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        message: `No active instance for tenant "${tenantId}" connector "${connectorId}"`,
        checkedAt: new Date(),
      };
    }

    const result = await instance.connector.healthCheck();
    instance.lastHealthCheck = result;
    return result;
  }

  /**
   * Run health checks on all active connector instances.
   */
  async healthCheckAll(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const checks: Array<Promise<void>> = [];

    for (const [key, instance] of this.tenantInstances.entries()) {
      checks.push(
        instance.connector
          .healthCheck()
          .then((result) => {
            instance.lastHealthCheck = result;
            results.set(key, result);
          })
          .catch((err: unknown) => {
            const errorResult: HealthCheckResult = {
              status: 'unhealthy',
              latencyMs: 0,
              message: err instanceof Error ? err.message : 'Health check failed',
              checkedAt: new Date(),
            };
            instance.lastHealthCheck = errorResult;
            results.set(key, errorResult);
          })
      );
    }

    await Promise.allSettled(checks);
    return results;
  }

  /**
   * Start periodic health checking of all instances.
   */
  startPeriodicHealthChecks(intervalMs = 60000): void {
    this.stopPeriodicHealthChecks();
    this.healthCheckInterval = setInterval(() => {
      void this.healthCheckAll();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks.
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // ─── Stats & Administration ────────────────────────────────────────────────

  /**
   * Get registry statistics.
   */
  getStats(): RegistryStats {
    const byCategory: Record<string, number> = {};
    const byTenant: Record<string, number> = {};

    for (const registered of this.registeredConnectors.values()) {
      byCategory[registered.metadata.category] =
        (byCategory[registered.metadata.category] || 0) + 1;
    }

    for (const instance of this.tenantInstances.values()) {
      const tenantId = instance.config.tenantId;
      byTenant[tenantId] = (byTenant[tenantId] || 0) + 1;
    }

    return {
      totalRegistered: this.registeredConnectors.size,
      totalInstances: this.tenantInstances.size,
      byCategory,
      byTenant,
    };
  }

  /**
   * Gracefully shut down the registry and all instances.
   */
  async shutdown(): Promise<void> {
    this.stopPeriodicHealthChecks();

    const disconnects: Array<Promise<void>> = [];
    for (const instance of this.tenantInstances.values()) {
      disconnects.push(
        instance.connector.disconnect().catch(() => {
          // Best effort
        })
      );
    }

    await Promise.allSettled(disconnects);
    this.tenantInstances.clear();
  }
}

/**
 * Convenience function to get the registry singleton.
 */
export function getConnectorRegistry(): ConnectorRegistry {
  return ConnectorRegistry.getInstance();
}
