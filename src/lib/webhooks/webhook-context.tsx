"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  WebhookConfig,
  WebhookDelivery,
  WebhookEvent,
  DeliveryStatus,
} from "./webhook-types";
import { WebhookService } from "./webhook-service";

interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface WebhookContextValue {
  webhooks: WebhookConfig[];
  deliveries: WebhookDelivery[];
  register: (
    config: Omit<WebhookConfig, "id" | "createdAt" | "updatedAt">
  ) => Promise<WebhookConfig>;
  unregister: (webhookId: string) => Promise<boolean>;
  update: (
    webhookId: string,
    patch: Partial<Omit<WebhookConfig, "id" | "createdAt">>
  ) => Promise<WebhookConfig | null>;
  dispatch: (event: WebhookEvent, data: unknown) => Promise<WebhookDelivery[]>;
  retry: (deliveryId: string) => Promise<WebhookDelivery | null>;
  testWebhook: (webhookId: string) => Promise<WebhookDelivery | null>;
  getDeliveryStats: () => DeliveryStats;
}

const WebhookContext = createContext<WebhookContextValue | null>(null);

function getDeliveryStatus(delivery: WebhookDelivery): DeliveryStatus {
  if (delivery.deliveredAt) return "delivered";
  if (delivery.error) return "failed";
  return "pending";
}

export function WebhookProvider({ children }: { children: React.ReactNode }) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [service] = useState(() => WebhookService.getInstance());

  const refresh = useCallback(async () => {
    const [wh, del] = await Promise.all([
      service.getAll(),
      service.getDeliveries(),
    ]);
    setWebhooks(wh);
    setDeliveries(del);
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(
    async (config: Omit<WebhookConfig, "id" | "createdAt" | "updatedAt">) => {
      const wh = await service.register(config);
      await refresh();
      return wh;
    },
    [service, refresh]
  );

  const unregister = useCallback(
    async (webhookId: string) => {
      const result = await service.unregister(webhookId);
      await refresh();
      return result;
    },
    [service, refresh]
  );

  const update = useCallback(
    async (
      webhookId: string,
      patch: Partial<Omit<WebhookConfig, "id" | "createdAt">>
    ) => {
      const wh = await service.update(webhookId, patch);
      await refresh();
      return wh;
    },
    [service, refresh]
  );

  const dispatch = useCallback(
    async (event: WebhookEvent, data: unknown) => {
      const result = await service.dispatch(event, data);
      await refresh();
      return result;
    },
    [service, refresh]
  );

  const retry = useCallback(
    async (deliveryId: string) => {
      const result = await service.retry(deliveryId);
      await refresh();
      return result;
    },
    [service, refresh]
  );

  const testWebhook = useCallback(
    async (webhookId: string) => {
      const result = await service.testWebhook(webhookId);
      await refresh();
      return result;
    },
    [service, refresh]
  );

  const getDeliveryStats = useCallback((): DeliveryStats => {
    const total = deliveries.length;
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    for (const d of deliveries) {
      const status = getDeliveryStatus(d);
      if (status === "delivered") delivered++;
      else if (status === "failed") failed++;
      else pending++;
    }
    return { total, delivered, failed, pending };
  }, [deliveries]);

  return (
    <WebhookContext.Provider
      value={{
        webhooks,
        deliveries,
        register,
        unregister,
        update,
        dispatch,
        retry,
        testWebhook,
        getDeliveryStats,
      }}
    >
      {children}
    </WebhookContext.Provider>
  );
}

export function useWebhooks(): WebhookContextValue {
  const ctx = useContext(WebhookContext);
  if (!ctx) {
    throw new Error("useWebhooks must be used within a WebhookProvider");
  }
  return ctx;
}
