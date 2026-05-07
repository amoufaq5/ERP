// ---------------------------------------------------------------------------
// SSE endpoint  –  GET /api/notifications/stream?userId=...
// ---------------------------------------------------------------------------
// Returns a text/event-stream response. Sends:
//   - heartbeat every 30 seconds (": heartbeat\n\n")
//   - real-time events published through the EventBus
//
// Event format:  data: { "type": "...", "payload": {...}, "timestamp": "..." }\n\n
// ---------------------------------------------------------------------------

import { type NextRequest } from "next/server";
import { eventBus, type ServerEvent } from "@/lib/notifications/event-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "userId query param is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // --- Send initial connection event ---
      const connectEvent: ServerEvent = {
        type: "connected",
        payload: { userId },
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`));

      // --- Subscribe to event bus ---
      unsubscribe = eventBus.subscribe(userId, (event: ServerEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed – cleanup will happen in cancel()
        }
      });

      // --- Heartbeat to keep the connection alive ---
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream closed
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      // Client disconnected – clean up
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
