'use client';

/**
 * Creates a backward-compatible Proxy wrapper around a zustand quality store.
 * This allows pages that haven't been migrated yet to continue using
 * the old class-based API (getAll, getById, create, update, etc.).
 *
 * Unknown method calls return empty arrays/objects to prevent runtime crashes.
 *
 * @deprecated Migrate pages to use the zustand hook directly instead.
 */
export function createStoreCompat<T extends { id: string; status: string }>(
  hook: any,
): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      // Known zustand state properties
      if (prop === 'getState') return () => hook.getState();
      if (prop === 'subscribe') return hook.subscribe;
      if (prop === 'setState') return hook.setState;

      // Backward-compatible method mappings
      const state = hook.getState();

      switch (prop) {
        // ── Standard CRUD ───────────────────────────────────────────
        case 'getAll':
          return () => state.items as T[];
        case 'getById':
          return (id: string) => (state.items as T[]).find((i) => i.id === id);
        case 'create':
          return (data: any) => state.create(data);
        case 'update':
          return (id: string, data: any) => state.update(id, data);
        case 'delete':
        case 'remove':
          return (id: string) => state.remove(id);

        // ── Status management ─────────────────────────────────────
        case 'updateStatus':
          return (id: string, newStatus: string, reason?: string) =>
            state.updateStatus(id, newStatus, reason);
        case 'advanceStatus':
          return (id: string) => {
            // No-op; pages should use updateStatus with explicit status
            return (state.items as T[]).find((i) => i.id === id);
          };

        // ── Data loading ──────────────────────────────────────────
        case 'fetchAll':
          return (params?: any) => state.fetchAll(params);
        case 'items':
          return state.items;
        case 'loading':
          return state.loading;
        case 'error':
          return state.error;
        case 'total':
          return state.total;

        // ── Generic getMetrics - returns empty metrics ────────────
        case 'getMetrics':
          return () => null;

        // ── Generate number ───────────────────────────────────────
        case 'generateNumber':
          return () => `${Date.now()}`;

        default:
          // For any unknown method, return a no-op function that returns
          // an empty array (most domain methods return arrays)
          if (typeof prop === 'string' && prop.startsWith('get')) {
            return (..._args: any[]) => [];
          }
          // For action methods, return a no-op
          return (..._args: any[]) => undefined;
      }
    },
  };

  return new Proxy({}, handler);
}
