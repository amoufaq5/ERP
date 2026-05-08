import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  // In production this would query a database.
  // The client-side demo uses localStorage via WebhookService.
  return NextResponse.json({
    message: `Webhook ${id} details are managed client-side for this demo.`,
    id,
    hint: "Use WebhookService.getById() on the client.",
  });
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  try {
    const body = await req.json();

    // Validate URL if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    // Validate events if provided
    if (body.events && (!Array.isArray(body.events) || body.events.length === 0)) {
      return NextResponse.json(
        { error: "Events must be a non-empty array" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Webhook ${id} update accepted`,
      id,
      patch: body,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  return NextResponse.json({
    message: `Webhook ${id} deleted`,
    id,
  });
}
