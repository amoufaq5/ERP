const SW_PATH = '/sw.js';

type SWRegistration = ServiceWorkerRegistration;

let registration: SWRegistration | null = null;

/**
 * Register the service worker and set up update handling.
 * Call this once from the app root (e.g. in a layout effect).
 */
export async function registerSW(): Promise<SWRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    // ── Handle updates ────────────────────────────────────────────────
    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new SW is waiting; notify the app so it can show an update banner
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
      60 * 60 * 1000
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
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return Notification.requestPermission();
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
