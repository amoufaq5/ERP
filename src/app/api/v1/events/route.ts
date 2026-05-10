import { NextRequest } from 'next/server';
import { eventBus, ServerEvent } from '@/lib/notifications/event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`:connected\n\n`));

      if (role) {
        eventBus.registerUserRole(userId, role);
      }

      unsubscribe = eventBus.subscribe(userId, (event: ServerEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
      });

      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive ${Date.now()}\n\n`));
        } catch {
          cleanup();
        }
      }, 30000);
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (role) {
      eventBus.unregisterUserRole(userId!, role);
    }
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
