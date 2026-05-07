"use client";

// ---------------------------------------------------------------------------
// useSSE – Client-side hook for Server-Sent Events connection
// ---------------------------------------------------------------------------
// Creates an EventSource connection to /api/notifications/stream
// with auto-reconnect using exponential backoff.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from "react";

export interface ServerEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface UseSSEOptions {
  /** Called for every incoming SSE event */
  onEvent?: (event: ServerEvent) => void;
  /** Whether to enable the connection (default: true) */
  enabled?: boolean;
}

interface UseSSEReturn {
  connected: boolean;
  lastEvent: ServerEvent | null;
  /** Number of reconnection attempts since last successful connect */
  reconnectAttempts: number;
}

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

export function useSSE(userId: string, options: UseSSEOptions = {}): UseSSEReturn {
  const { onEvent, enabled = true } = options;

  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ServerEvent | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs to keep current values accessible in the EventSource callbacks
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !userId) {
      cleanup();
      setConnected(false);
      return;
    }

    let currentBackoff = MIN_BACKOFF_MS;

    function connect() {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setReconnectAttempts(0);
        currentBackoff = MIN_BACKOFF_MS; // Reset backoff on success
      };

      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data) as ServerEvent;
          setLastEvent(event);
          onEventRef.current?.(event);
        } catch {
          // Ignore parse errors (e.g., heartbeat comments)
        }
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Schedule reconnect with exponential backoff
        setReconnectAttempts((prev) => prev + 1);
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, currentBackoff);
        currentBackoff = Math.min(currentBackoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
      setConnected(false);
    };
  }, [userId, enabled, cleanup]);

  return { connected, lastEvent, reconnectAttempts };
}
