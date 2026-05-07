'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  refreshPendingCount,
  syncPendingRequests,
  getPendingCount,
} from '@/lib/pwa/offline-sync';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await refreshPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(getPendingCount());
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => {
      setOnline(true);
      setDismissed(false);
      refreshCount();
      // Auto-hide after 4 seconds when back online and no pending items
      setTimeout(() => {
        setPendingCount((current) => {
          if (current === 0) {
            setVisible(false);
          }
          return current;
        });
      }, 4000);
    };

    const goOffline = () => {
      setOnline(false);
      setVisible(true);
      setDismissed(false);
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

    // Initial state
    refreshCount();
    if (!navigator.onLine) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker?.removeEventListener('message', onSWMessage);
    };
  }, [refreshCount]);

  // Show bar whenever offline or there are pending items
  useEffect(() => {
    if (!online || pendingCount > 0) {
      setVisible(true);
      setDismissed(false);
    }
  }, [online, pendingCount]);

  const handleSync = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await syncPendingRequests();
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [online, syncing, refreshCount]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!visible || (dismissed && online)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        backgroundColor: online ? '#0d9488' : '#f59e0b',
        color: online ? '#ffffff' : '#78350f',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Status dot */}
        <span
          style={{
            display: 'inline-block',
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: online ? '#99f6e4' : '#92400e',
          }}
        />

        {online ? (
          <span>Back online</span>
        ) : (
          <span>
            You&apos;re offline. Changes will sync when reconnected.
          </span>
        )}

        {pendingCount > 0 && (
          <span
            style={{
              marginLeft: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '0.125rem 0.5rem',
              fontSize: '0.75rem',
            }}
          >
            {pendingCount} pending
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {online && pendingCount > 0 && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              border: 'none',
              color: 'inherit',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.5 : 1,
            }}
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        )}

        {/* Dismiss button */}
        {online && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              borderRadius: '0.375rem',
              padding: '0.25rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <svg
              width="16"
              height="16"
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
