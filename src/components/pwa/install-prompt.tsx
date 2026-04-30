'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setVisible(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-violet-200 bg-white p-4 shadow-lg dark:border-violet-800 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
          <svg
            className="h-5 w-5 text-violet-600 dark:text-violet-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Install Enterprise Suite
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Add to your home screen for quick access and offline support.
          </p>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
      </div>

      {/* Install button */}
      <button
        type="button"
        onClick={handleInstall}
        className="mt-3 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        Install App
      </button>
    </div>
  );
}
