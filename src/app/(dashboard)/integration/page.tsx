"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, ArrowDownUp, CheckCircle2, Clock, Database, Link2, Plus, RefreshCw, Server, ShieldCheck, Wifi, WifiOff, XCircle, Zap } from "lucide-react";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

interface Connection {
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  latency: string;
}

interface DataFlow {
  id: string;
  source: string;
  dest: string;
  type: string;
  frequency: string;
  status: "active" | "paused" | "error";
  lastRun: string;
  records: string;
}

const connectionFields: EntityField[] = [
  { name: "name", label: "Connection Name", type: "text", required: true },
  { name: "type", label: "Type", type: "select", required: true, options: [
    { label: "ERP", value: "ERP" }, { label: "CRM", value: "CRM" },
    { label: "Payment", value: "Payment" }, { label: "Storage", value: "Storage" },
    { label: "Messaging", value: "Messaging" }, { label: "Project Mgmt", value: "Project Mgmt" },
    { label: "Data Warehouse", value: "Data Warehouse" }, { label: "Marketing", value: "Marketing" },
  ]},
  { name: "latency", label: "Expected Latency (ms)", type: "text" },
];

const MODULE_OPTIONS = [
  { label: "Finance Module", value: "Finance Module" },
  { label: "HR & Payroll", value: "HR & Payroll" },
  { label: "Inventory", value: "Inventory" },
  { label: "CRM Gateway", value: "CRM Gateway" },
  { label: "Supply Chain", value: "Supply Chain" },
  { label: "Analytics Engine", value: "Analytics Engine" },
  { label: "SAP ERP", value: "SAP ERP" },
  { label: "Salesforce", value: "Salesforce" },
  { label: "Stripe", value: "Stripe" },
  { label: "AWS S3", value: "AWS S3" },
  { label: "Snowflake", value: "Snowflake" },
  { label: "HubSpot", value: "HubSpot" },
  { label: "Jira", value: "Jira" },
  { label: "Slack", value: "Slack" },
];

const dataFlowFields: EntityField[] = [
  { name: "source", label: "Source", type: "select", required: true, options: MODULE_OPTIONS },
  { name: "dest", label: "Destination", type: "select", required: true, options: MODULE_OPTIONS },
  { name: "type", label: "Type", type: "select", required: true, options: [
    { label: "Batch", value: "Batch" }, { label: "Real-time", value: "Real-time" }, { label: "Webhook", value: "Webhook" },
  ]},
  { name: "frequency", label: "Frequency", type: "select", required: true, options: [
    { label: "Streaming", value: "Streaming" }, { label: "On event", value: "On event" },
    { label: "Every 5m", value: "Every 5m" }, { label: "Every 15m", value: "Every 15m" },
    { label: "Every 30m", value: "Every 30m" }, { label: "Hourly", value: "Hourly" },
    { label: "Daily", value: "Daily" }, { label: "Weekly", value: "Weekly" },
  ]},
];

type ModalMode =
  | { kind: "connection"; editing: Connection | null }
  | { kind: "flow"; editing: DataFlow | null }
  | null;

const kpis = [
  { title: "Active Connections", value: "24", icon: Link2, change: "+3 this week" },
  { title: "Data Syncs Today", value: "1,847", icon: RefreshCw, change: "+12% vs avg" },
  { title: "Avg Latency", value: "42ms", icon: Clock, change: "-8ms improved" },
  { title: "Uptime", value: "99.97%", icon: ShieldCheck, change: "Last 30 days" },
  { title: "Failed Syncs", value: "3", icon: XCircle, change: "Last 24h" },
  { title: "Data Throughput", value: "2.4 GB", icon: Database, change: "Today" },
  { title: "Active Flows", value: "18", icon: ArrowDownUp, change: "Of 22 total" },
  { title: "API Calls", value: "48.2K", icon: Zap, change: "Last 24h" },
];

const moduleHealth = [
  { name: "Finance Module", status: "healthy", lastSync: "2 min ago" },
  { name: "HR & Payroll", status: "healthy", lastSync: "5 min ago" },
  { name: "Inventory", status: "degraded", lastSync: "18 min ago" },
  { name: "CRM Gateway", status: "healthy", lastSync: "1 min ago" },
  { name: "Supply Chain", status: "down", lastSync: "47 min ago" },
  { name: "Analytics Engine", status: "healthy", lastSync: "3 min ago" },
];

const initialConnections: Connection[] = [
  { name: "SAP ERP", type: "ERP", status: "connected", latency: "34ms" },
  { name: "Salesforce", type: "CRM", status: "connected", latency: "67ms" },
  { name: "Stripe", type: "Payment", status: "connected", latency: "45ms" },
  { name: "AWS S3", type: "Storage", status: "connected", latency: "12ms" },
  { name: "Slack", type: "Messaging", status: "disconnected", latency: "—" },
  { name: "Jira", type: "Project Mgmt", status: "connected", latency: "89ms" },
  { name: "Snowflake", type: "Data Warehouse", status: "connected", latency: "56ms" },
  { name: "HubSpot", type: "Marketing", status: "error", latency: "—" },
];

const initialDataFlows: DataFlow[] = [
  { id: "DF-001", source: "SAP ERP", dest: "Snowflake", type: "Batch", frequency: "Every 15m", status: "active", lastRun: "2 min ago", records: "12,450" },
  { id: "DF-002", source: "Salesforce", dest: "SAP ERP", type: "Real-time", frequency: "Streaming", status: "active", lastRun: "Just now", records: "342" },
  { id: "DF-003", source: "Stripe", dest: "SAP ERP", type: "Webhook", frequency: "On event", status: "active", lastRun: "8 min ago", records: "89" },
  { id: "DF-004", source: "Inventory DB", dest: "AWS S3", type: "Batch", frequency: "Hourly", status: "paused", lastRun: "1h ago", records: "—" },
  { id: "DF-005", source: "HR System", dest: "Snowflake", type: "Batch", frequency: "Daily", status: "active", lastRun: "6h ago", records: "1,204" },
  { id: "DF-006", source: "Jira", dest: "Snowflake", type: "Batch", frequency: "Every 30m", status: "active", lastRun: "14 min ago", records: "567" },
  { id: "DF-007", source: "HubSpot", dest: "Salesforce", type: "Real-time", frequency: "Streaming", status: "error", lastRun: "47 min ago", records: "—" },
  { id: "DF-008", source: "CRM Gateway", dest: "Analytics", type: "Batch", frequency: "Every 5m", status: "active", lastRun: "1 min ago", records: "3,891" },
];

const logs = [
  { ts: "2026-04-03 14:32:01", level: "INFO", source: "SAP ERP", message: "Batch sync completed successfully — 12,450 records processed" },
  { ts: "2026-04-03 14:31:45", level: "ERROR", source: "HubSpot", message: "Connection refused: authentication token expired" },
  { ts: "2026-04-03 14:30:22", level: "WARN", source: "Inventory DB", message: "Sync paused — source database lock detected" },
  { ts: "2026-04-03 14:28:10", level: "INFO", source: "Salesforce", message: "Real-time stream reconnected after brief interruption" },
  { ts: "2026-04-03 14:25:33", level: "INFO", source: "Stripe", message: "Webhook payload received and queued for processing" },
  { ts: "2026-04-03 14:22:17", level: "WARN", source: "Supply Chain", message: "Response time exceeding threshold — latency at 420ms" },
  { ts: "2026-04-03 14:20:05", level: "ERROR", source: "Slack", message: "API rate limit exceeded — retrying in 60 seconds" },
  { ts: "2026-04-03 14:18:44", level: "INFO", source: "Snowflake", message: "Data warehouse ingestion pipeline healthy" },
  { ts: "2026-04-03 14:15:30", level: "INFO", source: "Jira", message: "Incremental sync completed — 567 issues updated" },
  { ts: "2026-04-03 14:12:08", level: "WARN", source: "CRM Gateway", message: "Duplicate record detection triggered for 3 entries" },
];

const statusBadge = (status: string) => {
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    healthy: { variant: "default", label: "Healthy" },
    connected: { variant: "default", label: "Connected" },
    active: { variant: "default", label: "Active" },
    degraded: { variant: "secondary", label: "Degraded" },
    paused: { variant: "secondary", label: "Paused" },
    disconnected: { variant: "outline", label: "Disconnected" },
    down: { variant: "destructive", label: "Down" },
    error: { variant: "destructive", label: "Error" },
  };
  const entry = map[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
};

const levelBadge = (level: string) => {
  const v = level === "ERROR" ? "destructive" : level === "WARN" ? "secondary" : "outline";
  return <Badge variant={v}>{level}</Badge>;
};

export default function IntegrationPage() {
  const [connections, setConnections] = useState(initialConnections);
  const [flows, setFlows] = useState(initialDataFlows);
  const [modal, setModal] = useState<ModalMode>(null);
  const [connFilters, setConnFilters] = useState<FilterState>({ _search: "", status: "" });
  const [flowFilters, setFlowFilters] = useState<FilterState>({ _search: "", status: "" });
  const [viewItem, setViewItem] = useState<any>(null);

  const filteredConns = connections.filter((c) => {
    if (connFilters.status && c.status !== connFilters.status) return false;
    if (connFilters._search) {
      const q = connFilters._search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredFlows = flows.filter((f) => {
    if (flowFilters.status && f.status !== flowFilters.status) return false;
    if (flowFilters._search) {
      const q = flowFilters._search.toLowerCase();
      return f.source.toLowerCase().includes(q) || f.dest.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Hub</h1>
          <p className="text-muted-foreground">Monitor and manage all system integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh All</Button>
          <Button onClick={() => setModal({ kind: "connection", editing: null })}><Plus className="mr-2 h-4 w-4" /> Add Connection</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="data-flows">Data Flows</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Module Health</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {moduleHealth.map((m) => (
                  <div key={m.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{m.lastSync}</span>
                      {statusBadge(m.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <FilterBar
            searchValue={connFilters._search}
            onSearchChange={(v) => setConnFilters((f) => ({ ...f, _search: v }))}
            fields={[{ key: "status", label: "Status", type: "select", options: [
              { label: "Connected", value: "connected" }, { label: "Disconnected", value: "disconnected" }, { label: "Error", value: "error" },
            ]}]}
            values={connFilters}
            onChange={(k, v) => setConnFilters((f) => ({ ...f, [k]: v }))}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredConns.map((c) => (
              <Card key={c.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {c.status === "connected" ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                    <EditDeleteMenu
                      onView={() => setViewItem({ _kind: "connection", ...c })}
                      onEdit={() => setModal({ kind: "connection", editing: c })}
                      onDelete={() => setConnections((prev) => prev.filter((x) => x.name !== c.name))}
                      itemLabel={c.name}
                      extraItems={[{
                        label: c.status === "connected" ? "Disconnect" : "Connect",
                        onClick: () => setConnections((prev) => prev.map((x) => x.name === c.name ? { ...x, status: x.status === "connected" ? "disconnected" : "connected", latency: x.status === "connected" ? "—" : x.latency } : x)),
                      }]}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-sm">{c.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Latency</span>
                    <span className="text-sm">{c.latency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    {statusBadge(c.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Flows Tab */}
        <TabsContent value="data-flows">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Data Flows</CardTitle>
              <Button size="sm" onClick={() => setModal({ kind: "flow", editing: null })}><Plus className="mr-2 h-4 w-4" /> Add Flow</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar
                searchValue={flowFilters._search}
                onSearchChange={(v) => setFlowFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "status", label: "Status", type: "select", options: [
                  { label: "Active", value: "active" }, { label: "Paused", value: "paused" }, { label: "Error", value: "error" },
                ]}]}
                values={flowFilters}
                onChange={(k, v) => setFlowFilters((f) => ({ ...f, [k]: v }))}
              />
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: unknown) => <span className="font-mono">{String(v)}</span> },
                  { key: "source", label: "Source" },
                  { key: "dest", label: "Destination" },
                  { key: "type", label: "Type" },
                  { key: "frequency", label: "Frequency" },
                  { key: "status", label: "Status", render: (v: unknown) => statusBadge(String(v)) },
                  { key: "lastRun", label: "Last Run", render: (v: unknown) => <span className="text-muted-foreground">{String(v)}</span> },
                  { key: "records", label: "Records", className: "text-right", render: (v: unknown) => <span className="font-mono">{String(v)}</span> },
                  {
                    key: "_actions",
                    label: "",
                    render: (_v: unknown, row: Record<string, unknown>) => {
                      const f = row as unknown as DataFlow;
                      return (
                        <EditDeleteMenu
                          onView={() => setViewItem({ _kind: "flow", ...f })}
                          onEdit={() => setModal({ kind: "flow", editing: f })}
                          onDelete={() => setFlows((prev) => prev.filter((x) => x.id !== f.id))}
                          itemLabel={f.id}
                          extraItems={(() => {
                            const flow: Record<string, { label: string; status: DataFlow["status"] }> = {
                              active: { label: "Pause Flow", status: "paused" },
                              paused: { label: "Resume Flow", status: "active" },
                              error: { label: "Retry Flow", status: "active" },
                            };
                            const next = flow[f.status];
                            if (!next) return [];
                            return [{ label: next.label, onClick: () => setFlows((prev) => prev.map((x) => x.id === f.id ? { ...x, status: next.status } : x)) }];
                          })()}
                        />
                      );
                    },
                  },
                ] as Column<Record<string, unknown>>[]}
                data={filteredFlows as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="integration.csv" emptyMessage="No data flows found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Integration Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "ts", label: "Timestamp", render: (v: unknown) => <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{String(v)}</span> },
                  { key: "level", label: "Level", render: (v: unknown) => levelBadge(String(v)) },
                  { key: "source", label: "Source", render: (v: unknown) => <span className="font-medium whitespace-nowrap">{String(v)}</span> },
                  { key: "message", label: "Message", render: (v: unknown) => <span className="text-muted-foreground">{String(v)}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={logs as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="integration.csv" emptyMessage="No logs available."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Modal */}
      <EntityFormModal
        open={modal?.kind === "connection"}
        onOpenChange={(open) => { if (!open) setModal(null); }}
        title={modal?.kind === "connection" && modal.editing ? "Edit Connection" : "Add Connection"}
        fields={connectionFields}
        initialData={modal?.kind === "connection" && modal.editing ? {
          name: modal.editing.name, type: modal.editing.type, latency: modal.editing.latency,
        } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "connection" && modal.editing) {
            setConnections((prev) => prev.map((c) => c.name === modal.editing!.name ? { ...c, name: data.name as string, type: data.type as string, latency: (data.latency as string) || c.latency } : c));
          } else {
            setConnections((prev) => [...prev, { name: data.name as string, type: data.type as string, status: "disconnected", latency: (data.latency as string) || "—" }]);
          }
          setModal(null);
        }}
      />

      {/* Data Flow Modal */}
      <EntityFormModal
        open={modal?.kind === "flow"}
        onOpenChange={(open) => { if (!open) setModal(null); }}
        title={modal?.kind === "flow" && modal.editing ? "Edit Data Flow" : "Add Data Flow"}
        fields={dataFlowFields}
        initialData={modal?.kind === "flow" && modal.editing ? {
          source: modal.editing.source, dest: modal.editing.dest, type: modal.editing.type, frequency: modal.editing.frequency,
        } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "flow" && modal.editing) {
            setFlows((prev) => prev.map((f) => f.id === modal.editing!.id ? { ...f, source: data.source as string, dest: data.dest as string, type: data.type as string, frequency: data.frequency as string } : f));
          } else {
            setFlows((prev) => [...prev, { id: `DF-${Date.now().toString(36)}`, source: data.source as string, dest: data.dest as string, type: data.type as string, frequency: data.frequency as string, status: "paused", lastRun: "Never", records: "—" }]);
          }
          setModal(null);
        }}
      />

      {/* Detail View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.name || viewItem?.id}</DialogTitle>
          </DialogHeader>
          {viewItem?._kind === "connection" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Connection Name</span><p className="font-medium">{viewItem.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewItem.type}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewItem.status}</p></div>
              <div><span className="text-sm text-muted-foreground">Latency</span><p className="font-medium">{viewItem.latency}</p></div>
            </div>
          )}
          {viewItem?._kind === "flow" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Flow ID</span><p className="font-medium">{viewItem.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewItem.type}</p></div>
              <div><span className="text-sm text-muted-foreground">Source</span><p className="font-medium">{viewItem.source}</p></div>
              <div><span className="text-sm text-muted-foreground">Destination</span><p className="font-medium">{viewItem.dest}</p></div>
              <div><span className="text-sm text-muted-foreground">Frequency</span><p className="font-medium">{viewItem.frequency}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewItem.status}</p></div>
              <div><span className="text-sm text-muted-foreground">Last Run</span><p className="font-medium">{viewItem.lastRun}</p></div>
              <div><span className="text-sm text-muted-foreground">Records</span><p className="font-medium">{viewItem.records}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
