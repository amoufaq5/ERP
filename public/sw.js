const CACHE_NAME = 'enterprise-suite-v2';
const STATIC_CACHE = 'enterprise-static-v2';
const API_CACHE = 'enterprise-api-v2';
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'background-sync-queue';

const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
];

// ─── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (POST/PUT/DELETE go straight to network)
  if (request.method !== 'GET') {
    return;
  }

  // API calls: network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ─── Background Sync ────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

// ─── Push Notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Enterprise Suite', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Enterprise Suite', {
      body: data.body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Message handler (for manual sync trigger) ──────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
    event.waitUntil(processOfflineQueue());
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Strategies ─────────────────────────────────────────────────────────────────

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  });
}

function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

function isStaticAsset(pathname) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif)(\?.*)?$/i.test(
    pathname
  );
}

// ─── Offline queue processing ───────────────────────────────────────────────────

function processOfflineQueue() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync-queue', 'readwrite');
      const store = tx.objectStore('sync-queue');
      const getAll = store.getAll();

      getAll.onsuccess = () => {
        const items = getAll.result;
        if (!items.length) {
          resolve();
          return;
        }

        Promise.allSettled(
          items.map((item) =>
            fetch(item.url, {
              method: item.method,
              headers: item.headers,
              body: item.body ? JSON.stringify(item.body) : undefined,
            }).then((res) => {
              if (res.ok) {
                const deleteTx = db.transaction('sync-queue', 'readwrite');
                deleteTx.objectStore('sync-queue').delete(item.id);
              }
              return res;
            })
          )
        )
          .then(() => notifyClients({ type: 'SYNC_COMPLETE' }))
          .then(resolve)
          .catch(reject);
      };

      getAll.onerror = () => reject(getAll.error);
    });
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('enterprise-suite-sw', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyClients(message) {
  return self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}
