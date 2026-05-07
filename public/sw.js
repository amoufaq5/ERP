// ─── Cache Configuration ────────────────────────────────────────────────────────
const CACHE_VERSION = 'v3';
const STATIC_CACHE = 'pharmacrm-static-' + CACHE_VERSION;
const API_CACHE = 'pharmacrm-api-' + CACHE_VERSION;
const PAGES_CACHE = 'pharmacrm-pages-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'background-sync-queue';

// Max cache ages
const API_MAX_AGE = 24 * 60 * 60 * 1000;       // 24 hours
const STATIC_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Critical routes to pre-cache
const PRECACHE_ROUTES = [
  '/dashboard',
  '/crm/doctors',
  '/crm/weekly-plan',
];

const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
];

// ─── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      // Pre-cache critical routes
      caches.open(PAGES_CACHE).then((cache) =>
        Promise.allSettled(
          PRECACHE_ROUTES.map((route) =>
            fetch(route)
              .then((response) => {
                if (response.ok) {
                  return cache.put(route, response);
                }
              })
              .catch(() => {
                // Route may not be available during install; skip
              })
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, API_CACHE, PAGES_CACHE];
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
  var request = event.request;
  var url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET for caching (POST/PUT/DELETE go straight to network)
  if (request.method !== 'GET') {
    return;
  }

  // API calls: network-first with cache fallback, enforce max age
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithAge(request, API_CACHE, API_MAX_AGE));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(PAGES_CACHE).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): cache-first with max age
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithAge(request, STATIC_CACHE, STATIC_MAX_AGE));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirstWithAge(request, PAGES_CACHE, API_MAX_AGE));
});

// ─── Background Sync ────────────────────────────────────────────────────────────
self.addEventListener('sync', function (event) {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

// ─── Push Notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'PharmaCRM', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'PharmaCRM', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clients) {
        var existing = clients.find(function (c) {
          return c.url.includes(targetUrl);
        });
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Message handler (for manual sync trigger) ──────────────────────────────────
self.addEventListener('message', function (event) {
  if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
    event.waitUntil(processOfflineQueue());
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Strategies ─────────────────────────────────────────────────────────────────

/**
 * Cache-first strategy with max age enforcement.
 * If cached response is too old, fetch fresh from network.
 */
function cacheFirstWithAge(request, cacheName, maxAge) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) {
        var dateHeader = cached.headers.get('date') || cached.headers.get('sw-cache-time');
        if (dateHeader) {
          var cachedTime = new Date(dateHeader).getTime();
          if (Date.now() - cachedTime < maxAge) {
            return cached;
          }
        } else {
          // No date header - serve it but refresh in background
          return cached;
        }
      }
      return fetch(request).then(function (response) {
        if (response.ok) {
          var headers = new Headers(response.headers);
          headers.set('sw-cache-time', new Date().toISOString());
          var body = response.clone().blob();
          return body.then(function (blob) {
            var cachedResponse = new Response(blob, {
              status: response.status,
              statusText: response.statusText,
              headers: headers,
            });
            cache.put(request, cachedResponse);
            return response;
          });
        }
        return response;
      }).catch(function () {
        // Network failed, serve stale cached response if available
        return cached || new Response('Offline', { status: 503 });
      });
    });
  });
}

/**
 * Network-first strategy with cache fallback, enforcing max age on cached responses.
 */
function networkFirstWithAge(request, cacheName, maxAge) {
  return fetch(request)
    .then(function (response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(cacheName).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.open(cacheName).then(function (cache) {
        return cache.match(request).then(function (cached) {
          if (cached) {
            var dateHeader = cached.headers.get('date');
            if (dateHeader) {
              var cachedTime = new Date(dateHeader).getTime();
              if (Date.now() - cachedTime > maxAge) {
                // Cache is too old, return offline response
                return null;
              }
            }
            return cached;
          }
          return null;
        });
      });
    });
}

function isStaticAsset(pathname) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif)(\?.*)?$/i.test(
    pathname
  );
}

// ─── Offline queue processing ───────────────────────────────────────────────────

function processOfflineQueue() {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('sync-queue', 'readwrite');
      var store = tx.objectStore('sync-queue');
      var getAll = store.getAll();

      getAll.onsuccess = function () {
        var items = getAll.result;
        if (!items.length) {
          resolve();
          return;
        }

        // Sort by timestamp for last-write-wins ordering
        items.sort(function (a, b) {
          return a.timestamp - b.timestamp;
        });

        Promise.allSettled(
          items.map(function (item) {
            return fetch(item.url, {
              method: item.method,
              headers: item.headers,
              body: item.body ? JSON.stringify(item.body) : undefined,
            }).then(function (res) {
              if (res.ok) {
                var deleteTx = db.transaction('sync-queue', 'readwrite');
                deleteTx.objectStore('sync-queue').delete(item.id);
              }
              return res;
            });
          })
        )
          .then(function () {
            return notifyClients({ type: 'SYNC_COMPLETE' });
          })
          .then(resolve)
          .catch(reject);
      };

      getAll.onerror = function () {
        reject(getAll.error);
      };
    });
  });
}

function openDB() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open('pharmacrm-sw', 1);
    request.onupgradeneeded = function () {
      var db = request.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

function notifyClients(message) {
  return self.clients.matchAll({ type: 'window' }).then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage(message);
    });
  });
}
