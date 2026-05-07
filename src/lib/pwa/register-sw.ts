const SW_PATH = '/sw.js';

type SWRegistration = ServiceWorkerRegistration;

let registration: SWRegistration | null = null;

// ─── Online/Offline helpers ─────────────────────────────────────────────────────

/**
 * Returns true if the browser reports online status.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Returns true if the browser reports offline status.
 */
export function isOffline(): boolean {
  return !isOnline();
}

// ─── Event listeners for online/offline ─────────────────────────────────────────

type ConnectivityCallback = (online: boolean) => void;
const connectivityListeners: ConnectivityCallback[] = [];

/**
 * Register a callback to be notified when connectivity changes.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(callback: ConnectivityCallback): () => void {
  connectivityListeners.push(callback);

  const handleOnline = () => {
    callback(true);
  };
  const handleOffline = () => {
    callback(false);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    const idx = connectivityListeners.indexOf(callback);
    if (idx >= 0) connectivityListeners.splice(idx, 1);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

// ─── Service Worker Registration ────────────────────────────────────────────────

/**
 * Register the service worker and set up update handling.
 * Call this once on app load.
 */
export async function registerSW(): Promise<SWRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    // Handle updates: show "New version available" prompt
    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new SW is waiting; dispatch event so the app can show an update banner
          window.dispatchEvent(
            new CustomEvent('sw-update-available', { detail: registration })
          );
        }
      });
    });

    // Listen for controller change (after skipWaiting) and reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Periodic update check (every 60 minutes)
    setInterval(
      () => {
        registration?.update().catch(() => {});
      },
      60 * 60 * 1000,
    );

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Prompt the waiting service worker to take over immediately.
 */
export function applyUpdate(): void {
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Get the current service worker registration (if any).
 */
export function getRegistration(): SWRegistration | null {
  return registration;
}

/**
 * Unregister the service worker and clear all caches.
 */
export async function unregisterSW(): Promise<boolean> {
  if (!registration) return false;

  const success = await registration.unregister();

  if (success) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    registration = null;
  }

  return success;
}
