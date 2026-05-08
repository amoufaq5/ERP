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
  ) => WebhookConfig;
  unregister: (webhookId: string) => boolean;
  update: (
    webhookId: string,
    patch: Partial<Omit<WebhookConfig, "id" | "createdAt">>
  ) => WebhookConfig | null;
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
  const [service, setService] = useState<WebhookService | null>(null);

  useEffect(() => {
    const svc = WebhookService.getInstance();
    setService(svc);
    setWebhooks(svc.getAll());
    setDeliveries(svc.getDeliveries());
  }, []);

  const refresh = useCallback(() => {
    if (!service) return;
    setWebhooks(service.getAll());
    setDeliveries(service.getDeliveries());
  }, [service]);

  const register = useCallback(
    (config: Omit<WebhookConfig, "id" | "createdAt" | "updatedAt">) => {
      if (!service) throw new Error("WebhookService not initialised");
      const wh = service.register(config);
      refresh();
      return wh;
    },
    [service, refresh]
  );

  const unregister = useCallback(
    (webhookId: string) => {
      if (!service) return false;
      const result = service.unregister(webhookId);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const update = useCallback(
    (
      webhookId: string,
      patch: Partial<Omit<WebhookConfig, "id" | "createdAt">>
    ) => {
      if (!service) return null;
      const wh = service.update(webhookId, patch);
      refresh();
      return wh;
    },
    [service, refresh]
  );

  const dispatch = useCallback(
    async (event: WebhookEvent, data: unknown) => {
      if (!service) return [];
      const result = await service.dispatch(event, data);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const retry = useCallback(
    async (deliveryId: string) => {
      if (!service) return null;
      const result = await service.retry(deliveryId);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const testWebhook = useCallback(
    async (webhookId: string) => {
      if (!service) return null;
      const result = await service.testWebhook(webhookId);
      refresh();
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
