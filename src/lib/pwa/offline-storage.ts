const DB_NAME = 'enterprise-suite-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'mutation-queue';

export interface QueuedMutation {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
  retryCount: number;
  /** Optional label so callers can identify the operation (e.g. "create-lead") */
  tag?: string;
}

// ─── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tag', 'tag', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, mode);
        const store = tx.objectStore(QUEUE_STORE);
        const req = callback(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Save a mutation to the offline queue.
 * Automatically tries to register a background-sync event so the service worker
 * will replay it when connectivity returns.
 */
export async function saveOffline(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>
): Promise<number> {
  const entry: QueuedMutation = {
    ...mutation,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const id = await withStore<IDBValidKey>('readwrite', (store) =>
    store.add(entry)
  );

  // Ask the service worker to sync when back online
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'background-sync-queue'
      );
    } catch {
      // SyncManager may not be available; we fall back to manual sync
    }
  }

  return id as number;
}

/**
 * Return all queued mutations, ordered by timestamp ascending.
 */
export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  return withStore<QueuedMutation[]>('readonly', (store) => store.getAll());
}

/**
 * Get the number of pending mutations in the queue.
 */
export async function getQueueCount(): Promise<number> {
  return withStore<number>('readonly', (store) => store.count());
}

/**
 * Process the offline queue: replay each mutation against the server.
 * Successfully replayed entries are removed. Failed entries have their
 * retryCount incremented.
 *
 * Returns the number of successfully synced mutations.
 */
export async function syncQueue(): Promise<number> {
  const db = await openDB();
  const items = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (items.length === 0) return 0;

  let synced = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok) {
        // Remove from queue on success
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(QUEUE_STORE, 'readwrite');
          const req = tx.objectStore(QUEUE_STORE).delete(item.id!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        synced++;
      } else {
        // Non-OK response: bump retry count
        await incrementRetry(db, item);
      }
    } catch {
      // Network error: bump retry count and stop processing
      await incrementRetry(db, item);
      break;
    }
  }

  return synced;
}

/**
 * Remove a single item from the queue by id.
 */
export async function removeFromQueue(id: number): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(id));
}

/**
 * Clear the entire offline queue.
 */
export async function clearQueue(): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.clear());
}

// ─── Internal ───────────────────────────────────────────────────────────────────

async function incrementRetry(
  db: IDBDatabase,
  item: QueuedMutation
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const updated: QueuedMutation = { ...item, retryCount: item.retryCount + 1 };
    const req = store.put(updated);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
