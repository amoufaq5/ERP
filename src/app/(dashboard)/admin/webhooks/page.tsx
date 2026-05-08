"use client";

import React from "react";
import PageHeader from "@/components/shared/page-header";
import WebhookManager from "@/components/shared/webhook-manager";
import { WebhookProvider, useWebhooks } from "@/lib/webhooks/webhook-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  CheckCircle2,
  Send,
  Code,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Stats Section (must be inside WebhookProvider)
// ---------------------------------------------------------------------------

function StatsCards() {
  const { webhooks, getDeliveryStats } = useWebhooks();
  const stats = getDeliveryStats();
  const activeCount = webhooks.filter((w) => w.isActive).length;
  const successRate =
    stats.total > 0
      ? Math.round((stats.delivered / stats.total) * 100)
      : 100;

  const cards = [
    {
      label: "Total Endpoints",
      value: webhooks.length,
      icon: Globe,
      color: "text-blue-600",
    },
    {
      label: "Active",
      value: activeCount,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "Deliveries Today",
      value: stats.total,
      icon: Send,
      color: "text-purple-600",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signature Verification Example
// ---------------------------------------------------------------------------

const VERIFY_EXAMPLE = `import { createHmac } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  // Parse the signature header
  const parts = header.split(',');
  let timestamp = '';
  let signature = '';
  for (const part of parts) {
    if (part.startsWith('t=')) timestamp = part.slice(2);
    if (part.startsWith('v1=')) signature = part.slice(3);
  }

  // Check timestamp tolerance (5 minutes)
  const ts = new Date(timestamp).getTime();
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw new Error('Webhook timestamp too old');
  }

  // Compute expected signature
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison
  return expected === signature;
}

// Express/Next.js handler example
app.post('/api/webhooks', (req, res) => {
  const sig = req.headers['x-webhook-signature'];
  const valid = verifyWebhookSignature(
    JSON.stringify(req.body),
    sig,
    process.env.WEBHOOK_SECRET
  );

  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  // Process the webhook event
  const { event, data } = req.body;
  console.log('Received event:', event, data);

  res.json({ received: true });
});`;

function SignatureExample() {
  return (
    <Card className="p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Code className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Verifying Webhook Signatures</h3>
        <Badge variant="outline">Example</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Each webhook delivery includes an <code className="bg-muted px-1 py-0.5 rounded text-xs">X-Webhook-Signature</code> header.
        Use the following code to verify the signature and protect against replay attacks.
      </p>
      <pre className="bg-muted p-4 rounded-md overflow-auto text-xs leading-relaxed max-h-96">
        <code>{VERIFY_EXAMPLE}</code>
      </pre>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WebhooksPage() {
  return (
    <WebhookProvider>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <PageHeader
          title="Webhooks & Integrations"
          description="Configure webhook endpoints to receive real-time event notifications from the system. Manage delivery logs and monitor integration health."
          icon={<Globe className="h-6 w-6" />}
        />

        <StatsCards />

        <WebhookManager />

        <SignatureExample />
      </div>
    </WebhookProvider>
  );
}
