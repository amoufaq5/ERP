"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataStore as useLocalStore } from "../data-store";
import type { DataStoreState } from "../data-store";
import { api } from "./client";
import { useCallback, useMemo } from "react";

type EntityKey = {
  [K in keyof DataStoreState]: DataStoreState[K] extends Array<unknown> ? K : never;
}[keyof DataStoreState];

const API_ROUTES: Partial<Record<EntityKey, string>> = {
  products: "/products",
  invoices: "/invoices",
  payments: "/payments",
  glAccounts: "/gl-accounts",
  journalEntries: "/journal-entries",
  employees: "/employees",
  purchaseOrders: "/purchase-orders",
  salesOrders: "/sales-orders",
  candidates: "/candidates",
  jobs: "/jobs",
  territories: "/territories",
  businessUnits: "/business-units",
  vendors: "/suppliers",
  customers: "/customers",
  doctors: "/doctors",
  visits: "/visits",
  weeklyPlans: "/weekly-plans",
  marketRequests: "/market-requests",
  kpis: "/kpis",
};

const SHAPE_MAPPERS: Partial<Record<EntityKey, (item: Record<string, unknown>) => Record<string, unknown>>> = {
  products: (p) => ({
    strength: "",
    form: "Tablet",
    buId: null,
    warehouse: "",
    manufacturer: "",
    shelfLife: "",
    storageCondition: "",
    ...p,
    code: p.sku ?? p.code ?? "",
    pricePerUnit: p.unitPrice ?? p.pricePerUnit ?? 0,
    stockQty: p.quantity ?? p.stockQty ?? 0,
    therapeuticArea: p.category ?? p.therapeuticArea ?? "",
  }),
  invoices: (inv) => ({
    items: [],
    ...inv,
    number: inv.invoiceNumber ?? inv.number ?? "",
  }),
  glAccounts: (a) => ({
    subType: "",
    currency: "EGP",
    ...a,
    accountCode: a.code ?? a.accountCode ?? "",
  }),
  employees: (e) => ({
    ...e,
    name: e.name ?? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
  }),
  vendors: (v) => ({
    outstanding: 0,
    creditLimit: 0,
    ...v,
    contactName: v.contactName ?? v.name ?? "",
    paymentTerms: v.paymentTerms ?? "Net 30",
  }),
  journalEntries: (je) => ({
    ...je,
    number: je.entryNumber ?? je.number ?? "",
    lines: je.lines ?? [],
  }),
  customers: (c) => ({
    outstanding: 0,
    creditLimit: 0,
    ...c,
  }),
  purchaseOrders: (po) => ({
    items: [],
    discountPct: 0,
    discountAmount: 0,
    ...po,
  }),
  salesOrders: (so) => ({
    items: [],
    discountPct: 0,
    discountAmount: 0,
    ...so,
  }),
};

async function fetchAllApiEntities(): Promise<Partial<Record<string, unknown[]>>> {
  const entries = Object.entries(API_ROUTES) as [EntityKey, string][];
  const responses = await Promise.allSettled(
    entries.map(([, path]) => api.get<unknown[]>(path, { limit: 200 }))
  );

  const results: Partial<Record<string, unknown[]>> = {};
  entries.forEach(([key], i) => {
    const result = responses[i];
    if (result.status === "fulfilled" && result.value?.data) {
      const data = Array.isArray(result.value.data) ? result.value.data : [];
      if (data.length > 0) {
        const mapper = SHAPE_MAPPERS[key];
        results[key] = mapper ? data.map((d) => mapper(d as Record<string, unknown>)) : data;
      }
    }
  });

  return results;
}

function mergeEntityLists(local: Array<{ id: string }>, apiMapped: unknown[]): unknown[] {
  if (!apiMapped?.length) return local;

  const apiMap = new Map((apiMapped as Array<{ id: string }>).map((item) => [item.id, item]));
  const seen = new Set<string>();

  const merged = local.map((localItem) => {
    seen.add(localItem.id);
    const apiItem = apiMap.get(localItem.id);
    return apiItem ? { ...localItem, ...apiItem } : localItem;
  });

  for (const apiItem of apiMapped as Array<{ id: string }>) {
    if (!seen.has(apiItem.id)) {
      merged.push(apiItem);
    }
  }

  return merged;
}

export function useApiDataStore() {
  const store = useLocalStore();
  const qc = useQueryClient();

  const { data: apiData } = useQuery({
    queryKey: ["api-data-sync"],
    queryFn: fetchAllApiEntities,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const merged = useMemo(() => {
    if (!apiData) return store;

    const result: Record<string, unknown> = {};
    const storeObj = store as unknown as Record<string, unknown>;

    for (const key of Object.keys(storeObj)) {
      const apiEntities = (apiData as Record<string, unknown>)[key];
      const localEntities = storeObj[key];

      if (Array.isArray(localEntities) && Array.isArray(apiEntities) && apiEntities.length) {
        result[key] = mergeEntityLists(localEntities as Array<{ id: string }>, apiEntities);
      } else {
        result[key] = localEntities;
      }
    }

    return result;
  }, [store, apiData]);

  const add = useCallback(
    <K extends EntityKey>(key: K, item: DataStoreState[K][number]) => {
      store.add(key, item);
      const path = API_ROUTES[key];
      if (path) {
        api.post(path, item).catch(() => {});
        setTimeout(() => qc.invalidateQueries({ queryKey: ["api-data-sync"] }), 500);
      }
    },
    [store, qc]
  );

  const update = useCallback(
    <K extends EntityKey>(key: K, id: string, patch: Partial<DataStoreState[K][number]>) => {
      store.update(key, id, patch);
      const path = API_ROUTES[key];
      if (path) {
        api.patch(`${path}/${id}`, patch).catch(() => {});
        setTimeout(() => qc.invalidateQueries({ queryKey: ["api-data-sync"] }), 500);
      }
    },
    [store, qc]
  );

  const remove = useCallback(
    <K extends EntityKey>(key: K, id: string) => {
      store.remove(key, id);
      const path = API_ROUTES[key];
      if (path) {
        api.delete(`${path}/${id}`).catch(() => {});
        setTimeout(() => qc.invalidateQueries({ queryKey: ["api-data-sync"] }), 500);
      }
    },
    [store, qc]
  );

  const bulkAdd = useCallback(
    <K extends EntityKey>(key: K, items: DataStoreState[K][number][]) => {
      store.bulkAdd(key, items);
      const path = API_ROUTES[key];
      if (path) {
        Promise.all(items.map((item) => api.post(path!, item).catch(() => {})));
        setTimeout(() => qc.invalidateQueries({ queryKey: ["api-data-sync"] }), 1000);
      }
    },
    [store, qc]
  );

  return {
    ...merged,
    add,
    update,
    remove,
    bulkAdd,
    reset: store.reset,
    genId: store.genId,
    generateInvoiceNumber: store.generateInvoiceNumber,
    generateJournalNumber: store.generateJournalNumber,
    generatePONumber: store.generatePONumber,
    generateSONumber: store.generateSONumber,
    generateRFQNumber: store.generateRFQNumber,
    generateGRNNumber: store.generateGRNNumber,
    generateDNNumber: store.generateDNNumber,
    generateCustomerCode: store.generateCustomerCode,
    generateVendorCode: store.generateVendorCode,
    generateProductCode: store.generateProductCode,
    generateBankCode: store.generateBankCode,
    generateCostCenterCode: store.generateCostCenterCode,
    generatePaymentRef: store.generatePaymentRef,
    generateChequeNumber: store.generateChequeNumber,
    generateShipmentNumber: store.generateShipmentNumber,
  } as ReturnType<typeof useLocalStore>;
}
