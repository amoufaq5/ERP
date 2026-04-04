"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowDownUp, CheckCircle2, Clock, Database, Link2, RefreshCw, Server, ShieldCheck, Wifi, WifiOff, XCircle, Zap } from "lucide-react";

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

const connections = [
  { name: "SAP ERP", type: "ERP", status: "connected", latency: "34ms" },
  { name: "Salesforce", type: "CRM", status: "connected", latency: "67ms" },
  { name: "Stripe", type: "Payment", status: "connected", latency: "45ms" },
  { name: "AWS S3", type: "Storage", status: "connected", latency: "12ms" },
  { name: "Slack", type: "Messaging", status: "disconnected", latency: "—" },
  { name: "Jira", type: "Project Mgmt", status: "connected", latency: "89ms" },
  { name: "Snowflake", type: "Data Warehouse", status: "connected", latency: "56ms" },
  { name: "HubSpot", type: "Marketing", status: "error", latency: "—" },
];

const dataFlows = [
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
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Hub</h1>
          <p className="text-muted-foreground">Monitor and manage all system integrations</p>
        </div>
        <Button><RefreshCw className="mr-2 h-4 w-4" /> Refresh All</Button>
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
        <TabsContent value="connections">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {connections.map((c) => (
              <Card key={c.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                  {c.status === "connected" ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
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
            <CardHeader><CardTitle>Data Flows</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Destination</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Frequency</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Last Run</th>
                      <th className="pb-2 font-medium text-right">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataFlows.map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="py-2 font-mono">{f.id}</td>
                        <td className="py-2">{f.source}</td>
                        <td className="py-2">{f.dest}</td>
                        <td className="py-2">{f.type}</td>
                        <td className="py-2">{f.frequency}</td>
                        <td className="py-2">{statusBadge(f.status)}</td>
                        <td className="py-2 text-muted-foreground">{f.lastRun}</td>
                        <td className="py-2 text-right font-mono">{f.records}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Timestamp</th>
                      <th className="pb-2 font-medium">Level</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.ts}</td>
                        <td className="py-2">{levelBadge(log.level)}</td>
                        <td className="py-2 font-medium whitespace-nowrap">{log.source}</td>
                        <td className="py-2 text-muted-foreground">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
