'use client';

import { useCallback, useEffect, useState } from 'react';
import { getQueueCount, syncQueue } from '@/lib/pwa/offline-storage';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showBar, setShowBar] = useState(false);

  // Refresh pending count from IndexedDB
  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may be unavailable
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => {
      setOnline(true);
      refreshCount();
      // Auto-hide after 3 seconds when back online and no pending items
      setTimeout(() => {
        setShowBar(false);
      }, 3000);
    };

    const goOffline = () => {
      setOnline(false);
      setShowBar(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for sync-complete messages from the service worker
    const onSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshCount();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSWMessage);

    // Initial count
    refreshCount();

    // Show bar if currently offline
    if (!navigator.onLine) {
      setShowBar(true);
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker?.removeEventListener('message', onSWMessage);
    };
  }, [refreshCount]);

  // Show bar whenever there are pending items or we're offline
  useEffect(() => {
    if (!online || pendingCount > 0) {
      setShowBar(true);
    }
  }, [online, pendingCount]);

  const handleSync = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await syncQueue();
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [online, syncing, refreshCount]);

  if (!showBar) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors ${
        online
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-500 text-amber-950'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            online ? 'bg-emerald-200' : 'bg-amber-800'
          }`}
        />

        {online ? (
          <span>Back online</span>
        ) : (
          <span>You are offline — changes will be saved locally</span>
        )}

        {pendingCount > 0 && (
          <span className="ml-2 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {online && pendingCount > 0 && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/30 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        )}

        {online && pendingCount === 0 && (
          <button
            type="button"
            onClick={() => setShowBar(false)}
            aria-label="Dismiss"
            className="rounded-md p-1 transition-colors hover:bg-white/20"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
