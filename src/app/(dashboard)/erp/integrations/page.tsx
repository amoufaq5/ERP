"use client";

import { useState, useEffect, useRef } from "react";
import {
  Link2,
  Upload,
  Download,
  FileSpreadsheet,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  CreditCard,
  Shield,
  RefreshCw,
  Plus,
  Check,
  X,
  Settings,
  ExternalLink,
  Calendar,
  Webhook,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useDataStore } from "@/lib/data-store";
import { downloadCSV } from "@/lib/download";

// ── Types ──────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string; // key into ICON_MAP
  status: "connected" | "disconnected";
  builtIn?: boolean;
  apiKey?: string;
  apiUrl?: string;
  lastSyncAt?: string;
}

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
}

interface IntegrationsState {
  integrations: Integration[];
  webhooks: WebhookEntry[];
  googleSheetsUrl: string;
}

// ── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  FileSpreadsheet,
  Globe,
  Mail,
  Shield,
  MessageSquare,
  Phone,
  CreditCard,
  Calendar,
};

// ── Seed data ──────────────────────────────────────────────────────────────

const SEED_INTEGRATIONS: Integration[] = [
  {
    id: "int-excel",
    name: "Excel Import/Export",
    description: "Built-in CSV/Excel import and export for all entities.",
    icon: "FileSpreadsheet",
    status: "connected",
    builtIn: true,
  },
  {
    id: "int-google",
    name: "Google Workspace",
    description: "Google Sheets sync and Google Calendar integration.",
    icon: "Globe",
    status: "disconnected",
  },
  {
    id: "int-ms365",
    name: "Microsoft 365",
    description: "Excel Online and Outlook integration for enterprise users.",
    icon: "Mail",
    status: "disconnected",
  },
  {
    id: "int-eda",
    name: "EDA (Egyptian Drug Authority)",
    description: "Regulatory submissions and product registration sync.",
    icon: "Shield",
    status: "disconnected",
  },
  {
    id: "int-eta",
    name: "ETA (Egyptian Tax Authority)",
    description: "E-invoicing and tax compliance reporting.",
    icon: "Shield",
    status: "disconnected",
  },
  {
    id: "int-whatsapp",
    name: "WhatsApp Business API",
    description: "Send notifications and updates via WhatsApp.",
    icon: "MessageSquare",
    status: "disconnected",
  },
  {
    id: "int-sms",
    name: "SMS Gateway",
    description: "Send SMS alerts for orders, collections, and visits.",
    icon: "Phone",
    status: "disconnected",
  },
  {
    id: "int-payment",
    name: "Payment Gateways (Fawry, InstaPay)",
    description: "Accept online payments via Fawry and InstaPay.",
    icon: "CreditCard",
    status: "disconnected",
  },
];

const STORAGE_KEY = "pharma.integrations";

const WEBHOOK_EVENTS = [
  "order.created",
  "order.updated",
  "invoice.sent",
  "invoice.paid",
  "product.updated",
  "inventory.low",
  "visit.completed",
  "customer.created",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function loadState(): IntegrationsState {
  if (typeof window === "undefined") {
    return {
      integrations: SEED_INTEGRATIONS,
      webhooks: [],
      googleSheetsUrl: "",
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    integrations: SEED_INTEGRATIONS,
    webhooks: [],
    googleSheetsUrl: "",
  };
}

function saveState(state: IntegrationsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Page Component
// ════════════════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
  const store = useDataStore();
  const [state, setState] = useState<IntegrationsState>(loadState);
  const [tab, setTab] = useState("active");

  // Config dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<Integration | null>(null);
  const [configApiKey, setConfigApiKey] = useState("");
  const [configApiUrl, setConfigApiUrl] = useState("");

  // Webhook dialog
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  // CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist
  useEffect(() => {
    saveState(state);
  }, [state]);

  // ── Integration actions ────────────────────────────────────────────────

  function openConfig(integration: Integration) {
    setConfigTarget(integration);
    setConfigApiKey(integration.apiKey ?? "");
    setConfigApiUrl(integration.apiUrl ?? "");
    setConfigOpen(true);
  }

  function connectIntegration() {
    if (!configTarget) return;
    setState((prev) => ({
      ...prev,
      integrations: prev.integrations.map((i) =>
        i.id === configTarget.id
          ? {
              ...i,
              status: "connected" as const,
              apiKey: configApiKey,
              apiUrl: configApiUrl,
              lastSyncAt: new Date().toISOString(),
            }
          : i
      ),
    }));
    setConfigOpen(false);
  }

  function disconnectIntegration(id: string) {
    setState((prev) => ({
      ...prev,
      integrations: prev.integrations.map((i) =>
        i.id === id
          ? { ...i, status: "disconnected" as const, apiKey: undefined, apiUrl: undefined }
          : i
      ),
    }));
  }

  function syncIntegration(id: string) {
    setState((prev) => ({
      ...prev,
      integrations: prev.integrations.map((i) =>
        i.id === id ? { ...i, lastSyncAt: new Date().toISOString() } : i
      ),
    }));
  }

  // ── Export actions ─────────────────────────────────────────────────────

  function exportProducts() {
    downloadCSV("products_export.csv", store.products as unknown as Record<string, unknown>[], [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "strength", label: "Strength" },
      { key: "form", label: "Form" },
      { key: "pricePerUnit", label: "Price" },
      { key: "therapeuticArea", label: "Therapeutic Area" },
      { key: "stockQty", label: "Stock Qty" },
    ]);
  }

  function exportCustomers() {
    downloadCSV("customers_export.csv", store.customers as unknown as Record<string, unknown>[], [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "creditLimit", label: "Credit Limit" },
      { key: "outstanding", label: "Outstanding" },
      { key: "status", label: "Status" },
    ]);
  }

  function exportDoctors() {
    downloadCSV("doctors_export.csv", store.doctors as unknown as Record<string, unknown>[], [
      { key: "name", label: "Name" },
      { key: "specialty", label: "Specialty" },
      { key: "hospital", label: "Hospital" },
      { key: "city", label: "City" },
      { key: "phone", label: "Phone" },
      { key: "classification", label: "Classification" },
      { key: "isKOL", label: "KOL" },
    ]);
  }

  function exportInventory() {
    downloadCSV(
      "inventory_export.csv",
      store.products.map((p) => ({
        code: p.code,
        name: p.name,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        warehouse: p.warehouse ?? "Main",
        status: p.stockQty <= p.reorderLevel ? "LOW" : "OK",
      }))
    );
  }

  // ── Webhook actions ────────────────────────────────────────────────────

  function addWebhook() {
    if (!webhookUrl) return;
    const entry: WebhookEntry = {
      id: `wh-${Date.now()}`,
      url: webhookUrl,
      events: webhookEvents,
      secret: webhookSecret,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      webhooks: [...prev.webhooks, entry],
    }));
    setWebhookOpen(false);
    setWebhookUrl("");
    setWebhookSecret("");
    setWebhookEvents([]);
  }

  function toggleWebhook(id: string) {
    setState((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      ),
    }));
  }

  function deleteWebhook(id: string) {
    setState((prev) => ({
      ...prev,
      webhooks: prev.webhooks.filter((w) => w.id !== id),
    }));
  }

  function toggleWebhookEvent(event: string) {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  const connectedCount = state.integrations.filter(
    (i) => i.status === "connected"
  ).length;
  const disconnectedCount = state.integrations.filter(
    (i) => i.status === "disconnected"
  ).length;
  const webhookCount = state.webhooks.length;
  const activeWebhookCount = state.webhooks.filter((w) => w.enabled).length;

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Integrations"
        description="Manage external integrations, data import/export, and API webhooks."
      />

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          icon={<Link2 className="h-5 w-5" />}
          title="Total Integrations"
          value={state.integrations.length}
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={<Check className="h-5 w-5" />}
          title="Connected"
          value={connectedCount}
          iconColor="text-green-600"
        />
        <StatsCard
          icon={<X className="h-5 w-5" />}
          title="Disconnected"
          value={disconnectedCount}
          iconColor="text-red-600"
        />
        <StatsCard
          icon={<Webhook className="h-5 w-5" />}
          title="Active Webhooks"
          value={`${activeWebhookCount} / ${webhookCount}`}
          iconColor="text-purple-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active Integrations</TabsTrigger>
          <TabsTrigger value="excel">Excel &amp; Google Workspace</TabsTrigger>
          <TabsTrigger value="webhooks">API Webhooks</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Active Integrations ──────────────────────────────── */}
        <TabsContent value="active" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {state.integrations.map((integration) => {
              const IconComp = ICON_MAP[integration.icon] ?? Link2;
              const isConnected = integration.status === "connected";

              return (
                <Card key={integration.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                          <IconComp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            {integration.name}
                          </CardTitle>
                        </div>
                      </div>
                      <Badge
                        variant={isConnected ? "default" : "secondary"}
                        className={
                          isConnected
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : ""
                        }
                      >
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="text-xs text-muted-foreground flex-1">
                      {integration.description}
                    </p>
                    {integration.lastSyncAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Last sync:{" "}
                        {new Date(integration.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => syncIntegration(integration.id)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Sync Now
                          </Button>
                          {!integration.builtIn && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() =>
                                disconnectIntegration(integration.id)
                              }
                            >
                              Disconnect
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => openConfig(integration)}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tab 2: Excel & Google Workspace ─────────────────────────── */}
        <TabsContent value="excel" className="mt-6 space-y-6">
          {/* CSV Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                CSV Import
              </CardTitle>
              <CardDescription>
                Upload a CSV file to import data into the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV files up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      alert(
                        `File "${file.name}" selected. CSV parsing will process ${file.size} bytes.`
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Entity Exports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download entity data as CSV files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" onClick={exportProducts}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Products ({store.products.length})
                </Button>
                <Button variant="outline" onClick={exportCustomers}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Customers ({store.customers.length})
                </Button>
                <Button variant="outline" onClick={exportDoctors}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Doctors ({store.doctors.length})
                </Button>
                <Button variant="outline" onClick={exportInventory}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Inventory ({store.products.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Google Sheets Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Google Sheets Sync
              </CardTitle>
              <CardDescription>
                Connect a Google Sheets spreadsheet to sync data automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="gsheets-url">Google Sheets URL</Label>
                  <Input
                    id="gsheets-url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={state.googleSheetsUrl}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        googleSheetsUrl: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    disabled={!state.googleSheetsUrl}
                    onClick={() =>
                      alert("Google Sheets sync configured successfully.")
                    }
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Connect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: API Webhooks ─────────────────────────────────────── */}
        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">API Webhooks</h3>
              <p className="text-sm text-muted-foreground">
                Configure webhooks to receive real-time event notifications.
              </p>
            </div>
            <Button onClick={() => setWebhookOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Webhook
            </Button>
          </div>

          {state.webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Webhook className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No webhooks configured</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a webhook to receive event notifications via HTTP POST.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {state.webhooks.map((wh) => (
                <Card key={wh.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.map((ev) => (
                          <Badge key={ev} variant="secondary" className="text-[10px]">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Created: {new Date(wh.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`wh-toggle-${wh.id}`}
                          className="text-xs"
                        >
                          {wh.enabled ? "Enabled" : "Disabled"}
                        </Label>
                        <Switch
                          id={`wh-toggle-${wh.id}`}
                          checked={wh.enabled}
                          onCheckedChange={() => toggleWebhook(wh.id)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteWebhook(wh.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Config Dialog ─────────────────────────────────────────────── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Connect {configTarget?.name ?? "Integration"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cfg-api-key">API Key</Label>
              <Input
                id="cfg-api-key"
                placeholder="Enter your API key"
                value={configApiKey}
                onChange={(e) => setConfigApiKey(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cfg-api-url">API URL / Endpoint</Label>
              <Input
                id="cfg-api-url"
                placeholder="https://api.example.com/v1"
                value={configApiUrl}
                onChange={(e) => setConfigApiUrl(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={connectIntegration}>
              <Check className="mr-1 h-4 w-4" />
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Webhook Dialog ────────────────────────────────────────────── */}
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wh-url">Webhook URL</Label>
              <Input
                id="wh-url"
                placeholder="https://your-server.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wh-secret">Secret Key</Label>
              <Input
                id="wh-secret"
                placeholder="Optional signing secret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Events</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(event)}
                      onChange={() => toggleWebhookEvent(event)}
                      className="rounded border-gray-300"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addWebhook} disabled={!webhookUrl}>
              <Plus className="mr-1 h-4 w-4" />
              Add Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
