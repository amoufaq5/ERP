import { NextRequest, NextResponse } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { eventBus, type ServerEvent } from "@/lib/notifications/event-bus";
import { notificationService } from "@/lib/notifications/notification-service";

// ---------------------------------------------------------------------------
// In-memory notification store (fallback when DB unavailable)
// ---------------------------------------------------------------------------

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable */
}

interface StoredNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  module: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  userId?: string;
}

const inMemoryStore: StoredNotification[] = [];

function generateId(): string {
  return `notif-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// OPTIONS
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return corsOptions();
}

// ---------------------------------------------------------------------------
// GET /api/v1/notifications  -- list notifications for user
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { page, limit, params } = parseQueryParams(req.url);
    const userId = params.get("userId");
    const unreadOnly = params.get("unreadOnly") === "true";

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;
        if (unreadOnly) where.isRead = false;

        const [total, records] = await Promise.all([
          prisma.notification.count({ where }),
          prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);

        return apiResponse(records, 200, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch {
        /* fall through */
      }
    }

    // In-memory fallback
    let results = [...inMemoryStore];
    if (userId) results = results.filter((n) => !n.userId || n.userId === userId);
    if (unreadOnly) results = results.filter((n) => !n.isRead);

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { items, pagination } = paginate(results, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch notifications", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/notifications  -- create a notification
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.message) {
      return apiError("title and message are required", 400);
    }

    const notification: StoredNotification = {
      id: body.id || generateId(),
      type: body.type || "INFO",
      title: body.title,
      message: body.message,
      module: body.module || "SYSTEM",
      entityType: body.entityType,
      entityId: body.entityId,
      actionUrl: body.actionUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
      userId: body.userId,
    };

    // Persist
    if (prisma) {
      try {
        const created = await prisma.notification.create({ data: notification });
        notification.id = created.id;
      } catch {
        /* fall through to in-memory */
        inMemoryStore.unshift(notification);
        if (inMemoryStore.length > 5000) inMemoryStore.length = 5000;
      }
    } else {
      inMemoryStore.unshift(notification);
      if (inMemoryStore.length > 5000) inMemoryStore.length = 5000;
    }

    // Push via SSE
    const event: ServerEvent = {
      type: "notification",
      payload: notification as unknown as Record<string, unknown>,
      timestamp: notification.createdAt,
    };

    if (body.broadcast) {
      eventBus.publishToAll(event);
    } else if (body.role) {
      eventBus.publishToRole(body.role, event);
    } else if (body.userId) {
      eventBus.publish(body.userId, event);
    }

    return apiResponse(notification, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create notification", 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications  -- mark-read / mark-all-read / remove
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, userId } = body as {
      action: "mark_read" | "mark_all_read" | "remove" | "clear_all";
      id?: string;
      userId?: string;
    };

    if (!action) {
      return apiError("action is required (mark_read | mark_all_read | remove | clear_all)", 400);
    }

    if (prisma) {
      try {
        if (action === "mark_read" && id) {
          await prisma.notification.update({
            where: { id },
            data: { isRead: true },
          });
        } else if (action === "mark_all_read" && userId) {
          await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
          });
        } else if (action === "remove" && id) {
          await prisma.notification.delete({ where: { id } });
        } else if (action === "clear_all" && userId) {
          await prisma.notification.deleteMany({ where: { userId } });
        }
        return apiResponse({ success: true });
      } catch {
        /* fall through */
      }
    }

    // In-memory fallback
    if (action === "mark_read" && id) {
      const n = inMemoryStore.find((n) => n.id === id);
      if (n) n.isRead = true;
    } else if (action === "mark_all_read") {
      for (const n of inMemoryStore) {
        if (!userId || !n.userId || n.userId === userId) {
          n.isRead = true;
        }
      }
    } else if (action === "remove" && id) {
      const idx = inMemoryStore.findIndex((n) => n.id === id);
      if (idx >= 0) inMemoryStore.splice(idx, 1);
    } else if (action === "clear_all") {
      if (userId) {
        const toRemove = inMemoryStore.filter((n) => !n.userId || n.userId === userId);
        for (const r of toRemove) {
          const idx = inMemoryStore.indexOf(r);
          if (idx >= 0) inMemoryStore.splice(idx, 1);
        }
      } else {
        inMemoryStore.length = 0;
      }
    }

    // Push SSE update
    if (userId) {
      const event: ServerEvent = {
        type: "notification_update",
        payload: { action, notificationId: id ?? null },
        timestamp: new Date().toISOString(),
      };
      eventBus.publish(userId, event);
    }

    return apiResponse({ success: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update notification", 500);
  }
}
