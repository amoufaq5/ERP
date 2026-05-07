// ---------------------------------------------------------------------------
// Notification REST API – /api/notifications
// ---------------------------------------------------------------------------
// POST   – Create a new notification (triggers SSE push via event bus)
// GET    – Placeholder (notifications are kept in client-side localStorage)
// PATCH  – Mark notification as read (triggers SSE update)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { eventBus, type ServerEvent } from "@/lib/notifications/event-bus";

export const runtime = "nodejs";

// POST /api/notifications – create a notification & push via SSE
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      title,
      message,
      module,
      entityType,
      entityId,
      actionUrl,
      role,
      broadcast,
    } = body as {
      userId?: string;
      type?: string;
      title?: string;
      message?: string;
      module?: string;
      entityType?: string;
      entityId?: string;
      actionUrl?: string;
      role?: string;
      broadcast?: boolean;
    };

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 }
      );
    }

    const event: ServerEvent = {
      type: type === "notification" ? "notification" : type,
      payload: {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        message,
        module: module ?? "SYSTEM",
        entityType,
        entityId,
        actionUrl,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Determine delivery target
    if (broadcast) {
      eventBus.publishToAll(event);
    } else if (role) {
      eventBus.publishToRole(role, event);
    } else if (userId) {
      eventBus.publish(userId, event);
    } else {
      return NextResponse.json(
        { error: "One of userId, role, or broadcast=true is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// GET /api/notifications – placeholder; actual list is in client localStorage
export async function GET() {
  return NextResponse.json({
    message:
      "Notifications are stored client-side. Use the notification context to read them.",
  });
}

// PATCH /api/notifications – mark as read, push SSE update
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationId, action } = body as {
      userId?: string;
      notificationId?: string;
      action?: "mark_read" | "mark_all_read";
    };

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const event: ServerEvent = {
      type: "notification_update",
      payload: {
        action: action ?? "mark_read",
        notificationId: notificationId ?? null,
      },
      timestamp: new Date().toISOString(),
    };

    eventBus.publish(userId, event);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
