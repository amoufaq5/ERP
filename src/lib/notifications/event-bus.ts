// ---------------------------------------------------------------------------
// Server-side Event Bus (singleton) for SSE notifications
// ---------------------------------------------------------------------------
// Works in a single-process Node.js environment. Uses an in-memory
// Map<userId, Set<callback>> to fan-out events to SSE streams.
// ---------------------------------------------------------------------------

export interface ServerEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventCallback = (event: ServerEvent) => void;

class EventBus {
  /** userId -> set of active subscriber callbacks */
  private subscribers = new Map<string, Set<EventCallback>>();
  /** role  -> set of userIds with that role */
  private roleMap = new Map<string, Set<string>>();

  // -------------------------------------------------------------------------
  // Subscribe / Unsubscribe
  // -------------------------------------------------------------------------

  /**
   * Subscribe a callback for a specific userId.
   * Returns an unsubscribe function.
   */
  subscribe(userId: string, callback: EventCallback): () => void {
    let subs = this.subscribers.get(userId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(userId, subs);
    }
    subs.add(callback);

    // Return unsubscribe function for cleanup
    return () => {
      const current = this.subscribers.get(userId);
      if (current) {
        current.delete(callback);
        if (current.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  // -------------------------------------------------------------------------
  // Role registry (optional enrichment)
  // -------------------------------------------------------------------------

  /**
   * Register a userId under a role. This enables `publishToRole`.
   */
  registerUserRole(userId: string, role: string): void {
    let users = this.roleMap.get(role);
    if (!users) {
      users = new Set();
      this.roleMap.set(role, users);
    }
    users.add(userId);
  }

  /**
   * Remove a user from a role.
   */
  unregisterUserRole(userId: string, role: string): void {
    const users = this.roleMap.get(role);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.roleMap.delete(role);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  /** Send an event to a specific user. */
  publish(userId: string, event: ServerEvent): void {
    const subs = this.subscribers.get(userId);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(event);
      } catch {
        // Silently remove broken callbacks (auto-cleanup)
        subs.delete(cb);
      }
    }
  }

  /** Broadcast an event to all users registered under a given role. */
  publishToRole(role: string, event: ServerEvent): void {
    const users = this.roleMap.get(role);
    if (!users) return;
    for (const userId of users) {
      this.publish(userId, event);
    }
  }

  /** Broadcast an event to every connected subscriber. */
  publishToAll(event: ServerEvent): void {
    for (const [userId] of this.subscribers) {
      this.publish(userId, event);
    }
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /** How many active subscriber connections exist for a user. */
  subscriberCount(userId: string): number {
    return this.subscribers.get(userId)?.size ?? 0;
  }

  /** Total number of unique users with at least one subscriber. */
  get totalUsers(): number {
    return this.subscribers.size;
  }
}

// ---------------------------------------------------------------------------
// Singleton — survives HMR in dev thanks to globalThis caching
// ---------------------------------------------------------------------------

const globalKey = "__pharma_erp_event_bus__";

function getEventBus(): EventBus {
  const g = globalThis as unknown as Record<string, EventBus>;
  if (!g[globalKey]) {
    g[globalKey] = new EventBus();
  }
  return g[globalKey];
}

export const eventBus = getEventBus();
