// ---------------------------------------------------------------------------
// In-memory Email Queue with rate limiting and retry support
// ---------------------------------------------------------------------------

import { createEmailService, type EmailOptions, type EmailResult } from "./email-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueuedEmail {
  id: string;
  email: EmailOptions;
  retries: number;
  addedAt: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface QueueStatus {
  pending: number;
  sent: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RATE_LIMIT = 10; // max emails per minute
const RATE_WINDOW_MS = 60_000;
const BASE_BACKOFF_MS = 2_000; // 2s, 4s, 8s

// ---------------------------------------------------------------------------
// Queue singleton
// ---------------------------------------------------------------------------

const pendingQueue: QueuedEmail[] = [];
const failedQueue: QueuedEmail[] = [];
let sentCount = 0;
let processing = false;

/** Timestamps of recent sends for rate-limit tracking */
const sendTimestamps: number[] = [];

function generateId(): string {
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add an email to the send queue.
 */
export function enqueue(email: EmailOptions): string {
  const id = generateId();
  pendingQueue.push({
    id,
    email,
    retries: 0,
    addedAt: Date.now(),
  });
  return id;
}

/**
 * Process all pending emails in the queue respecting rate limits and retries.
 */
export async function processQueue(): Promise<{ sent: number; failed: number }> {
  if (processing) {
    return { sent: 0, failed: 0 };
  }
  processing = true;

  const service = createEmailService();
  let batchSent = 0;
  let batchFailed = 0;

  try {
    while (pendingQueue.length > 0) {
      // Rate limit check
      const now = Date.now();
      // Purge timestamps older than the rate window
      while (sendTimestamps.length > 0 && sendTimestamps[0] < now - RATE_WINDOW_MS) {
        sendTimestamps.shift();
      }

      if (sendTimestamps.length >= RATE_LIMIT) {
        // Wait until the oldest timestamp falls out of the window
        const waitMs = sendTimestamps[0] + RATE_WINDOW_MS - now + 50;
        await sleep(waitMs);
        continue;
      }

      const item = pendingQueue[0];

      // Backoff check for retried items
      if (item.retries > 0 && item.lastAttemptAt) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, item.retries - 1);
        const elapsed = Date.now() - item.lastAttemptAt;
        if (elapsed < backoff) {
          await sleep(backoff - elapsed);
        }
      }

      // Attempt send
      let result: EmailResult;
      try {
        result = await service.send(item.email);
      } catch (err) {
        result = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      if (result.success) {
        pendingQueue.shift();
        sentCount++;
        batchSent++;
        sendTimestamps.push(Date.now());
      } else {
        item.retries++;
        item.lastAttemptAt = Date.now();
        item.error = result.error;

        if (item.retries >= MAX_RETRIES) {
          pendingQueue.shift();
          failedQueue.push(item);
          batchFailed++;
          console.error(`[EmailQueue] Permanently failed after ${MAX_RETRIES} retries:`, item.error);
        }
        // If still retriable, it stays at the front of the queue and the loop
        // will handle backoff on the next iteration.
      }
    }
  } finally {
    processing = false;
  }

  return { sent: batchSent, failed: batchFailed };
}

/**
 * Get current queue status.
 */
export function getQueueStatus(): QueueStatus {
  return {
    pending: pendingQueue.length,
    sent: sentCount,
    failed: failedQueue.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
