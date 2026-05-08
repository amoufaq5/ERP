"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useWebhooks } from "@/lib/webhooks/webhook-context";
import {
  EVENT_DESCRIPTIONS,
  type WebhookEvent,
  type WebhookConfig,
  type WebhookDelivery,
  type DeliveryStatus,
} from "@/lib/webhooks/webhook-types";
import { WebhookService } from "@/lib/webhooks/webhook-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeliveryStatus(delivery: WebhookDelivery): DeliveryStatus {
  if (delivery.deliveredAt) return "delivered";
  if (delivery.error) return "failed";
  return "pending";
}

function truncateUrl(url: string, max = 40): string {
  return url.length > max ? url.slice(0, max) + "..." : url;
}

const ALL_EVENTS = Object.keys(EVENT_DESCRIPTIONS) as WebhookEvent[];

function groupEventsByCategory() {
  const groups: Record<string, { event: WebhookEvent; description: string }[]> = {};
  for (const [event, meta] of Object.entries(EVENT_DESCRIPTIONS)) {
    if (!groups[meta.category]) groups[meta.category] = [];
    groups[meta.category].push({ event: event as WebhookEvent, description: meta.description });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Add/Edit Webhook Dialog
// ---------------------------------------------------------------------------

interface WebhookFormValues {
  url: string;
  description: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  maxRetries: number;
  backoffMs: number;
  headers: { key: string; value: string }[];
}

function emptyForm(): WebhookFormValues {
  const svc = WebhookService.getInstance();
  return {
    url: "",
    description: "",
    events: [],
    secret: svc.generateSecret(),
    isActive: true,
    maxRetries: 3,
    backoffMs: 5000,
    headers: [],
  };
}

function configToForm(config: WebhookConfig): WebhookFormValues {
  return {
    url: config.url,
    description: config.description ?? "",
    events: [...config.events],
    secret: config.secret,
    isActive: config.isActive,
    maxRetries: config.retryPolicy.maxRetries,
    backoffMs: config.retryPolicy.backoffMs,
    headers: Object.entries(config.headers ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
  };
}

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: WebhookConfig | null;
  onSave: (values: WebhookFormValues) => void;
}

function WebhookDialog({ open, onOpenChange, initial, onSave }: WebhookDialogProps) {
  const [form, setForm] = useState<WebhookFormValues>(
    initial ? configToForm(initial) : emptyForm()
  );
  const [urlError, setUrlError] = useState("");

  React.useEffect(() => {
    if (open) {
      setForm(initial ? configToForm(initial) : emptyForm());
      setUrlError("");
    }
  }, [open, initial]);

  const categories = useMemo(() => groupEventsByCategory(), []);

  const handleSave = () => {
    try {
      new URL(form.url);
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }
    if (form.events.length === 0) return;
    onSave(form);
    onOpenChange(false);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  const copySecret = () => {
    navigator.clipboard.writeText(form.secret).catch(() => {});
  };

  const regenerateSecret = () => {
    const svc = WebhookService.getInstance();
    setForm((f) => ({ ...f, secret: svc.generateSecret() }));
  };

  const addHeader = () => {
    setForm((f) => ({ ...f, headers: [...f.headers, { key: "", value: "" }] }));
  };

  const removeHeader = (idx: number) => {
    setForm((f) => ({ ...f, headers: f.headers.filter((_, i) => i !== idx) }));
  };

  const updateHeader = (idx: number, field: "key" | "value", val: string) => {
    setForm((f) => {
      const headers = [...f.headers];
      headers[idx] = { ...headers[idx], [field]: val };
      return { ...f, headers };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
          <DialogDescription>
            Configure a webhook endpoint to receive event notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://example.com/api/webhooks"
              value={form.url}
              onChange={(e) => {
                setForm((f) => ({ ...f, url: e.target.value }));
                setUrlError("");
              }}
            />
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="webhook-desc">Description</Label>
            <Input
              id="webhook-desc"
              placeholder="What is this webhook used for?"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Events grouped by category */}
          <div className="space-y-2">
            <Label>Events</Label>
            {Object.entries(categories).map(([category, events]) => (
              <div key={category} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mt-3">
                  {category}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {events.map(({ event, description }) => (
                    <label
                      key={event}
                      className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={form.events.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{event}</span>
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {form.events.length === 0 && (
              <p className="text-sm text-destructive">
                Select at least one event
              </p>
            )}
          </div>

          {/* Secret */}
          <div className="space-y-2">
            <Label>Signing Secret</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={form.secret}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={copySecret}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={regenerateSecret}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Retry Policy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-retries">Max Retries (1-5)</Label>
              <Input
                id="max-retries"
                type="number"
                min={1}
                max={5}
                value={form.maxRetries}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxRetries: Math.min(5, Math.max(1, Number(e.target.value))),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backoff">Backoff (ms)</Label>
              <Input
                id="backoff"
                type="number"
                min={1000}
                max={30000}
                step={1000}
                value={form.backoffMs}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    backoffMs: Math.min(
                      30000,
                      Math.max(1000, Number(e.target.value))
                    ),
                  }))
                }
              />
            </div>
          </div>

          {/* Custom Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom Headers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {form.headers.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="Header name"
                  value={h.key}
                  onChange={(e) => updateHeader(i, "key", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={h.value}
                  onChange={(e) => updateHeader(i, "value", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHeader(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initial ? "Update" : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Endpoints Tab
// ---------------------------------------------------------------------------

function EndpointsTab() {
  const { webhooks, unregister, update, register, testWebhook } = useWebhooks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (wh: WebhookConfig) => {
    setEditing(wh);
    setDialogOpen(true);
  };

  const handleSave = (values: WebhookFormValues) => {
    const headers: Record<string, string> = {};
    for (const h of values.headers) {
      if (h.key.trim()) headers[h.key.trim()] = h.value;
    }

    if (editing) {
      update(editing.id, {
        url: values.url,
        description: values.description,
        events: values.events,
        secret: values.secret,
        isActive: values.isActive,
        headers,
        retryPolicy: {
          maxRetries: values.maxRetries,
          backoffMs: values.backoffMs,
        },
      });
    } else {
      register({
        url: values.url,
        description: values.description,
        events: values.events,
        secret: values.secret,
        isActive: values.isActive,
        headers,
        retryPolicy: {
          maxRetries: values.maxRetries,
          backoffMs: values.backoffMs,
        },
      });
    }
  };

  const handleToggle = (wh: WebhookConfig) => {
    update(wh.id, { isActive: !wh.isActive });
  };

  const handleTest = async (wh: WebhookConfig) => {
    await testWebhook(wh.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No webhooks configured</p>
          <p className="text-sm mt-1">
            Add a webhook endpoint to start receiving event notifications.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm truncate">
                      {wh.url}
                    </span>
                    <Badge variant={wh.isActive ? "default" : "secondary"}>
                      {wh.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{wh.events.length} events</Badge>
                  </div>
                  {wh.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {wh.description}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap mt-2">
                    {wh.events.slice(0, 4).map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">
                        {e}
                      </Badge>
                    ))}
                    {wh.events.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{wh.events.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={wh.isActive}
                    onCheckedChange={() => handleToggle(wh)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(wh)}
                  >
                    <Send className="h-3 w-3 mr-1" /> Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(wh)}
                  >
                    <Settings className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unregister(wh.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <WebhookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery Log Tab
// ---------------------------------------------------------------------------

function DeliveryLogTab() {
  const { deliveries, webhooks, retry } = useWebhooks();
  const [statusFilter, setStatusFilter] = useState<"all" | DeliveryStatus>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const webhookUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of webhooks) map[w.id] = w.url;
    return map;
  }, [webhooks]);

  const filtered = useMemo(() => {
    return deliveries.filter((d) => {
      if (statusFilter !== "all" && getDeliveryStatus(d) !== statusFilter) return false;
      if (eventFilter !== "all" && d.event !== eventFilter) return false;
      return true;
    });
  }, [deliveries, statusFilter, eventFilter]);

  const handleRetry = async (deliveryId: string) => {
    await retry(deliveryId);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | DeliveryStatus)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {ALL_EVENTS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No deliveries found</p>
          <p className="text-sm mt-1">
            Webhook deliveries will appear here after events are dispatched.
          </p>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Event</TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const status = getDeliveryStatus(d);
                const isExpanded = expandedId === d.id;
                return (
                  <React.Fragment key={d.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : d.id)
                      }
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.event}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateUrl(webhookUrlMap[d.webhookId] ?? "unknown")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            status === "delivered" &&
                              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                            status === "failed" &&
                              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
                            status === "pending" &&
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                          )}
                        >
                          {status === "delivered" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {status === "failed" && (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {status === "pending" && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.statusCode ?? "-"}</TableCell>
                      <TableCell>{d.attempts}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(d.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(d.id);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Payload
                              </p>
                              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                                {JSON.stringify(d.payload, null, 2)}
                              </pre>
                            </div>
                            {d.response && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Response
                                </p>
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                                  {d.response}
                                </pre>
                              </div>
                            )}
                            {d.error && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Error
                                </p>
                                <pre className="text-xs bg-destructive/10 text-destructive p-3 rounded-md">
                                  {d.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WebhookManager (exported)
// ---------------------------------------------------------------------------

export default function WebhookManager() {
  return (
    <Tabs defaultValue="endpoints" className="space-y-4">
      <TabsList>
        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        <TabsTrigger value="deliveries">Delivery Log</TabsTrigger>
      </TabsList>
      <TabsContent value="endpoints">
        <EndpointsTab />
      </TabsContent>
      <TabsContent value="deliveries">
        <DeliveryLogTab />
      </TabsContent>
    </Tabs>
  );
}
