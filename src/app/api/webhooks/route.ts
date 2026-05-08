import { NextRequest, NextResponse } from "next/server";

// Note: WebhookService uses localStorage which is client-side only.
// These API routes return structured responses that the client-side service
// can work with. In production, this would use a database.

export async function GET() {
  return NextResponse.json({
    message: "Webhooks are managed client-side via localStorage for this demo.",
    hint: "Use the WebhookService singleton on the client to list webhooks.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, events, secret, description, headers, retryPolicy } = body;

    // Validate required fields
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid URL is required" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "At least one event is required" },
        { status: 400 }
      );
    }

    // In production, persist to database here.
    // For demo, the client will handle registration via localStorage.
    return NextResponse.json(
      {
        message: "Webhook registration accepted",
        webhook: {
          url,
          events,
          secret: secret ?? "whsec_generated",
          description: description ?? null,
          headers: headers ?? {},
          retryPolicy: retryPolicy ?? { maxRetries: 3, backoffMs: 5000 },
          isActive: true,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
