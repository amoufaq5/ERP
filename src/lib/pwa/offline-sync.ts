/**
 * Offline Sync Manager
 *
 * Queues failed API requests in IndexedDB (with localStorage fallback)
 * and replays them when connectivity is restored.
 *
 * Conflict resolution: last-write-wins using timestamps.
 */

const DB_NAME = 'pharmacrm-offline-sync';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';
const LS_KEY = 'pharmacrm-offline-queue';
const SYNC_TAG = 'background-sync-queue';

export interface PendingRequest {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
}

// ─── IndexedDB helpers ──────────────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;
let useLocalStorage = false;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        useLocalStorage = true;
        reject(request.error);
      };
    } catch {
      useLocalStorage = true;
      reject(new Error('IndexedDB not available'));
    }
  });
}

// ─── localStorage fallback ──────────────────────────────────────────────────────

function lsGetQueue(): PendingRequest[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSaveQueue(queue: PendingRequest[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch {
    // localStorage may be full
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Queue a failed API request for later sync.
 */
export function enqueueRequest(url: string, method: string, body: unknown): void {
  const entry: PendingRequest = {
    url,
    method,
    body,
    headers: { 'Content-Type': 'application/json' },
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (useLocalStorage) {
    const queue = lsGetQueue();
    entry.id = Date.now() + Math.random();
    queue.push(entry);
    lsSaveQueue(queue);
    return;
  }

  openDB()
    .then((db) => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    })
    .then(() => {
      // Register background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then((reg) => {
            return (
              reg as ServiceWorkerRegistration & {
                sync: { register: (tag: string) => Promise<void> };
              }
            ).sync.register(SYNC_TAG);
          })
          .catch(() => {
            // SyncManager may not be available
          });
      }
    })
    .catch(() => {
      // Fallback to localStorage if IndexedDB fails
      useLocalStorage = true;
      const queue = lsGetQueue();
      entry.id = Date.now() + Math.random();
      queue.push(entry);
      lsSaveQueue(queue);
    });
}

/**
 * Attempt to sync all pending requests to the server.
 * Uses last-write-wins: requests are sorted by timestamp and replayed in order.
 */
export async function syncPendingRequests(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0 };

  if (useLocalStorage) {
    return syncFromLocalStorage(result);
  }

  try {
    const db = await openDB();
    const items = await new Promise<PendingRequest[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (items.length === 0) return result;

    // Sort by timestamp for last-write-wins ordering
    items.sort((a, b) => a.timestamp - b.timestamp);

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
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).delete(item.id!);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          result.synced++;
        } else {
          // Increment retry count
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const updated = { ...item, retryCount: item.retryCount + 1 };
            const req = store.put(updated);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          result.failed++;
        }
      } catch {
        result.failed++;
        break; // Network error, stop trying
      }
    }
  } catch {
    // IndexedDB failed, try localStorage fallback
    useLocalStorage = true;
    return syncFromLocalStorage(result);
  }

  return result;
}

async function syncFromLocalStorage(result: SyncResult): Promise<SyncResult> {
  const queue = lsGetQueue();
  if (queue.length === 0) return result;

  // Sort by timestamp for last-write-wins ordering
  queue.sort((a, b) => a.timestamp - b.timestamp);

  const remaining: PendingRequest[] = [];

  for (const item of queue) {
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
        result.synced++;
      } else {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
        result.failed++;
      }
    } catch {
      remaining.push(item);
      result.failed++;
      break;
    }
  }

  lsSaveQueue(remaining);
  return result;
}

/**
 * Get the number of pending requests in the queue.
 */
export function getPendingCount(): number {
  if (useLocalStorage) {
    return lsGetQueue().length;
  }

  // For synchronous access, we track count via a cached value
  // and update it asynchronously
  return cachedPendingCount;
}

let cachedPendingCount = 0;

/**
 * Refresh the cached pending count from IndexedDB (async).
 */
export async function refreshPendingCount(): Promise<number> {
  if (useLocalStorage) {
    cachedPendingCount = lsGetQueue().length;
    return cachedPendingCount;
  }

  try {
    const db = await openDB();
    cachedPendingCount = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    cachedPendingCount = lsGetQueue().length;
  }

  return cachedPendingCount;
}

// ─── Auto-sync on reconnect ─────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingRequests()
      .then((result) => {
        if (result.synced > 0) {
          // Notify the service worker about completed sync
          navigator.serviceWorker?.controller?.postMessage({
            type: 'SYNC_COMPLETE',
          });
        }
      })
      .catch(() => {
        // Sync failed silently
      });
  });

  // Listen for sync-complete messages from service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshPendingCount();
      }
    });
  }

  // Initial count refresh
  refreshPendingCount();
}
