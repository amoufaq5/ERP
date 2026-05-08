import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  // In production, this would:
  // 1. Look up the webhook config from the database
  // 2. Send a real HTTP request to the webhook URL
  // 3. Record the delivery result
  // For the demo, the client-side WebhookService.testWebhook() handles this.

  const delivery = {
    id: `del_test_${Date.now()}`,
    webhookId: id,
    event: "doctor.created",
    payload: {
      event: "doctor.created",
      timestamp: new Date().toISOString(),
      data: {
        _test: true,
        message: "This is a test webhook delivery from PharmaERP",
        webhookId: id,
      },
    },
    statusCode: 200,
    response: '{"ok":true,"test":true}',
    attempts: 1,
    deliveredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    message: `Test ping sent to webhook ${id}`,
    delivery,
  });
}
