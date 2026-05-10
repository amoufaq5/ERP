'use client';

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

let toastIdCounter = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let currentToasts: Toast[] = [];

function notify() {
  listeners.forEach(listener => listener([...currentToasts]));
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = `toast-${++toastIdCounter}`;
  const newToast: Toast = { ...options, id };
  currentToasts = [...currentToasts, newToast];
  notify();

  const duration = options.duration || 5000;
  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    notify();
  }, duration);

  return id;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => { listeners.delete(setToasts); };
  }, []);

  const dismiss = useCallback((id: string) => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    notify();
  }, []);

  return { toasts, dismiss };
}
