"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  Briefcase,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  FileText,
  UserPlus,
  ShoppingCart,
  MessageSquare,
  ClipboardList,
  Pill,
  FlaskConical,
  Thermometer,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Stethoscope,
  Target,
  Activity,
  Package,
  Receipt,
  Landmark,
  GraduationCap,
  Calendar,
  PackageCheck,
  Microscope,
  Star,
  Navigation,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Printer,
  StickyNote,
  Route,
  Bell,
  XCircle,
  Eye,
  Zap,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import { useAppConfig } from "@/lib/config-context";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { BUYING_LADDER_STAGES, type BuyingLadderStage, type SampleGiven } from "@/lib/data-store";
import { useTranslation } from "@/lib/i18n/i18n-context";

function safeArr<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

const fmtEGP = (n: number) => `EGP ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtM = (n: number) =>
  n >= 1_000_000
    ? `EGP ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `EGP ${(n / 1_000).toFixed(0)}K`
      : fmtEGP(n);

// ─── Shared primitives ───────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  color: string;
}

function KpiCard({ label, value, delta, trend = "flat", icon: Icon, color }: KpiCardProps) {
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {delta && (
              <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                {delta}
              </span>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickLinkItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

function QuickActions({ items }: { items: QuickLinkItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={i} href={action.href}>
                <div className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-4 text-sm font-medium text-foreground shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 cursor-pointer">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs text-center">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Pill className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Badge variant="success" className="ml-2">{badge}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

// ─── Command Center Widgets ─────────────────────────────────────────────────

const LEAD_STORAGE_KEY = "pharma.leads";

interface StoredLead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  value: number;
  status: string;
  score: number;
}

const EXPENSE_STORAGE_KEY = "pharma.expenses";

interface StoredExpense {
  id: string;
  description: string;
  amount: number;
  status: string;
  submittedAt: string;
}

function useLocalStorageData<T>(key: string): T[] {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setData(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);
  return data;
}

function ModuleQuickStatsRow() {
  const store = useApiDataStore();
  const leads = useLocalStorageData<StoredLead>(LEAD_STORAGE_KEY);

  const invoices = safeArr<any>(store.invoices);
  const customers = safeArr<any>(store.customers);
  const bankAccounts = safeArr<any>(store.bankAccounts);
  const products = safeArr<any>(store.products);
  const purchaseOrders = safeArr<any>(store.purchaseOrders);
  const shipments = safeArr<any>(store.shipments);
  const employees = safeArr<any>(store.employees);
  const jobs = safeArr<any>(store.jobs);

  // Finance stats
  const totalRevenue = invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total || 0), 0);
  const arOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);
  const cashBalance = bankAccounts
    .filter((b) => b.currency === "EGP" && b.status === "ACTIVE")
    .reduce((s, b) => s + (b.balance || 0), 0);

  // CRM stats
  const activeLeads = leads.filter((l) => l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST").length;
  const pipelineValue = leads.filter((l) => l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST").reduce((s, l) => s + (l.value || 0), 0);
  const wonLeads = leads.filter((l) => l.status === "CLOSED_WON").length;
  const totalClosedLeads = leads.filter((l) => l.status === "CLOSED_WON" || l.status === "CLOSED_LOST").length;
  const winRate = totalClosedLeads > 0 ? Math.round((wonLeads / totalClosedLeads) * 100) : 0;

  // Supply Chain stats
  const lowStockItems = products.filter((p) => (p.stockQty || 0) <= (p.reorderLevel || 0)).length;
  const pendingPOs = purchaseOrders.filter((po) => po.status === "DRAFT" || po.status === "APPROVED" || po.status === "ORDERED").length;
  const deliveredShipments = shipments.filter((s) => s.status === "DELIVERED").length;
  const totalShipments = shipments.length;
  const onTimeDelivery = totalShipments > 0 ? Math.round((deliveredShipments / totalShipments) * 100) : 0;

  // HR stats
  const totalEmployees = employees.length;
  const openPositions = jobs.filter((j) => j.status === "OPEN").length;
  const upcomingLeaves = safeArr<any>(store.employees).filter((e) => e.status === "ON_LEAVE").length;

  const modules = [
    {
      title: "Finance",
      color: "border-l-green-500",
      stats: [
        { label: "Total Revenue", value: fmtM(totalRevenue) },
        { label: "Outstanding AR", value: fmtM(arOutstanding) },
        { label: "Cash Balance", value: fmtM(cashBalance) },
      ],
    },
    {
      title: "CRM",
      color: "border-l-blue-500",
      stats: [
        { label: "Active Leads", value: String(activeLeads) },
        { label: "Pipeline Value", value: fmtM(pipelineValue) },
        { label: "Win Rate", value: `${winRate}%` },
      ],
    },
    {
      title: "Supply Chain",
      color: "border-l-amber-500",
      stats: [
        { label: "Low Stock Items", value: String(lowStockItems) },
        { label: "Pending POs", value: String(pendingPOs) },
        { label: "On-time Delivery", value: `${onTimeDelivery}%` },
      ],
    },
    {
      title: "HR",
      color: "border-l-purple-500",
      stats: [
        { label: "Total Employees", value: String(totalEmployees) },
        { label: "Open Positions", value: String(openPositions) },
        { label: "Upcoming Leaves", value: String(upcomingLeaves) },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {modules.map((mod) => (
        <Card key={mod.title} className={`border-l-4 ${mod.color}`}>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{mod.title}</div>
            <div className="space-y-2">
              {mod.stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OperationalAlertsBanner() {
  const store = useApiDataStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const overdueInvoices = safeArr<any>(store.invoices).filter((i) => i.status === "OVERDUE").length;
  const lowStockProducts = safeArr<any>(store.products).filter((p) => (p.stockQty || 0) <= (p.reorderLevel || 0)).length;
  const pendingEscalations = safeArr<any>(store.weeklyPlans).filter((wp) => wp.status === "SUBMITTED" && wp.approvalLevel && wp.approvalLevel > 1).length;
  const slaBreaches = safeArr<any>(store.visits).filter((v) => {
    if (v.status !== "LOGGED") return false;
    const visitDate = new Date(v.dateTime);
    const daysSince = (Date.now() - visitDate.getTime()) / 86400000;
    return daysSince > 3;
  }).length;

  const alerts = [
    { id: "sla", label: "SLA Breaches", count: slaBreaches, icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200", href: "/crm/gps-tracking" },
    { id: "overdue", label: "Overdue Invoices", count: overdueInvoices, icon: Receipt, color: "text-amber-600 bg-amber-50 border-amber-200", href: "/erp/accounting" },
    { id: "stock", label: "Low Stock Products", count: lowStockProducts, icon: Package, color: "text-orange-600 bg-orange-50 border-orange-200", href: "/erp/inventory" },
    { id: "escalation", label: "Pending Escalations", count: pendingEscalations, icon: Bell, color: "text-purple-600 bg-purple-50 border-purple-200", href: "/crm/weekly-plan" },
  ].filter((a) => a.count > 0 && !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div key={alert.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${alert.color}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <Link href={alert.href} className="font-medium hover:underline">
              {alert.count} {alert.label}
            </Link>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
              className="ml-1 rounded-full p-0.5 hover:bg-black/10 transition"
              title="Dismiss"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ApprovalQueueWidget() {
  const store = useApiDataStore();

  const pendingExpenses = useLocalStorageData<StoredExpense>(EXPENSE_STORAGE_KEY).filter((e) => e.status === "PENDING");
  const pendingPlans = safeArr<any>(store.weeklyPlans).filter((wp) => wp.status === "SUBMITTED");
  const pendingMarketRequests = safeArr<any>(store.marketRequests).filter((mr) => mr.status === "PENDING");
  const pendingVisits = safeArr<any>(store.visits).filter((v) => v.status === "LOGGED");

  const totalPending = pendingExpenses.length + pendingPlans.length + pendingMarketRequests.length + pendingVisits.length;

  // Identify urgent items (overdue > 3 days)
  const urgentExpenses = pendingExpenses.filter((e) => {
    const daysSince = (Date.now() - new Date(e.submittedAt).getTime()) / 86400000;
    return daysSince > 3;
  }).length;
  const urgentPlans = pendingPlans.filter((wp) => {
    const submitted = wp.submittedAt ? new Date(wp.submittedAt) : new Date(wp.createdAt);
    return (Date.now() - submitted.getTime()) / 86400000 > 3;
  }).length;
  const urgentMRs = pendingMarketRequests.filter((mr) => {
    return (Date.now() - new Date(mr.createdAt).getTime()) / 86400000 > 5;
  }).length;
  const totalUrgent = urgentExpenses + urgentPlans + urgentMRs;

  if (totalPending === 0) return null;

  const items = [
    { label: "Expenses", count: pendingExpenses.length, urgent: urgentExpenses, href: "/crm/expenses", icon: Receipt },
    { label: "Weekly Plans", count: pendingPlans.length, urgent: urgentPlans, href: "/crm/weekly-plan", icon: Calendar },
    { label: "Market Requests", count: pendingMarketRequests.length, urgent: urgentMRs, href: "/crm/market-requests", icon: ClipboardList },
    { label: "Visit Approvals", count: pendingVisits.length, urgent: 0, href: "/crm/gps-tracking", icon: CheckCircle },
  ].filter((it) => it.count > 0);

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            Approval Queue
            <Badge className="bg-amber-100 text-amber-800 ml-1">{totalPending} pending</Badge>
            {totalUrgent > 0 && (
              <Badge className="bg-red-100 text-red-700">{totalUrgent} urgent</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-3 rounded-lg border bg-white p-3 hover:border-amber-400 hover:shadow-sm cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-lg">{item.count}</span>
                      {item.urgent > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-[9px]">{item.urgent} overdue</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  message: string;
  module: string;
  moduleColor: string;
  timestamp: string;
}

function ActivityFeedWidget() {
  const store = useApiDataStore();

  const visits = safeArr<any>(store.visits);
  const doctors = safeArr<any>(store.doctors);
  const invoicesArr = safeArr<any>(store.invoices);
  const productsArr = safeArr<any>(store.products);
  const marketRequestsArr = safeArr<any>(store.marketRequests);
  const purchaseOrdersArr = safeArr<any>(store.purchaseOrders);
  const vendorsArr = safeArr<any>(store.vendors);
  const candidatesArr = safeArr<any>(store.candidates);

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    visits
      .filter((v) => v.status === "APPROVED")
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 3)
      .forEach((v) => {
        const doc = doctors.find((d) => d.id === v.doctorId);
        items.push({
          id: `vis-${v.id}`,
          message: `Visit approved: ${doc?.name ?? "Doctor"} — ${(v.productIds || []).length} products discussed`,
          module: "CRM",
          moduleColor: "bg-blue-100 text-blue-700",
          timestamp: v.dateTime,
        });
      });

    invoicesArr
      .filter((i) => i.status === "OVERDUE")
      .slice(0, 2)
      .forEach((inv) => {
        const daysDue = Math.round((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
        items.push({
          id: `inv-${inv.id}`,
          message: `Invoice ${inv.number || inv.invoiceNumber || inv.id} overdue by ${daysDue} days`,
          module: "Finance",
          moduleColor: "bg-red-100 text-red-700",
          timestamp: inv.dueDate,
        });
      });

    productsArr
      .filter((p) => (p.stockQty || 0) <= (p.reorderLevel || 0) && (p.stockQty || 0) > 0)
      .slice(0, 2)
      .forEach((p) => {
        items.push({
          id: `stock-${p.id}`,
          message: `Low stock alert: ${p.name} ${p.strength || ""} — ${p.stockQty} remaining`,
          module: "Supply Chain",
          moduleColor: "bg-amber-100 text-amber-700",
          timestamp: new Date().toISOString(),
        });
      });

    marketRequestsArr
      .filter((mr) => mr.status === "APPROVED" && mr.approvedAt)
      .sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime())
      .slice(0, 2)
      .forEach((mr) => {
        items.push({
          id: `mr-${mr.id}`,
          message: `Market request approved: ${mr.type} — ${(mr.description || "").slice(0, 50)}`,
          module: "CRM",
          moduleColor: "bg-blue-100 text-blue-700",
          timestamp: mr.approvedAt!,
        });
      });

    purchaseOrdersArr
      .filter((po) => po.status === "ORDERED" || po.status === "RECEIVED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .forEach((po) => {
        const vendor = vendorsArr.find((v) => v.id === po.vendorId);
        items.push({
          id: `po-${po.id}`,
          message: `PO ${po.number} ${po.status.toLowerCase()}: ${vendor?.name ?? "Vendor"} — ${fmtEGP(po.total || 0)}`,
          module: "Supply Chain",
          moduleColor: "bg-amber-100 text-amber-700",
          timestamp: po.createdAt,
        });
      });

    candidatesArr
      .filter((c) => c.status === "INTERVIEW" || c.status === "OFFER")
      .slice(0, 1)
      .forEach((c) => {
        items.push({
          id: `cand-${c.id}`,
          message: `Candidate ${c.name} moved to ${c.status.toLowerCase()} stage for ${c.appliedFor}`,
          module: "HR",
          moduleColor: "bg-purple-100 text-purple-700",
          timestamp: c.appliedDate,
        });
      });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [visits, doctors, invoicesArr, productsArr, marketRequestsArr, purchaseOrdersArr, vendorsArr, candidatesArr]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Activity Feed
          </CardTitle>
          <Link href="/messages">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Eye className="h-3 w-3 mr-1" /> View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <Badge className={`text-[10px] shrink-0 mt-0.5 ${a.moduleColor}`}>{a.module}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                    {new Date(a.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueAndSalesCharts() {
  const store = useApiDataStore();
  const storeInvoices = safeArr<any>(store.invoices);
  const storeProducts = safeArr<any>(store.products);
  const storeTerritories = safeArr<any>(store.territories);
  const storeVisits = safeArr<any>(store.visits);
  const storeDoctors = safeArr<any>(store.doctors);

  // Monthly revenue trend (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const revenue = storeInvoices
        .filter((inv) => (inv.status === "PAID" || inv.status === "PARTIAL") && (inv.date || "").startsWith(monthStr))
        .reduce((s, inv) => s + (inv.total || 0), 0);
      months.push({ label, revenue });
    }
    return months;
  }, [storeInvoices]);

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  // Top 5 products by revenue
  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; revenue: number }> = {};
    storeInvoices
      .filter((inv) => inv.status === "PAID" || inv.status === "PARTIAL")
      .forEach((inv) => {
        (inv.items || []).forEach((item: any) => {
          const prod = storeProducts.find((p) => p.id === item.productId);
          const name = prod ? `${prod.name} ${prod.strength || ""}` : (item.description || "Unknown");
          if (!productMap[item.productId]) productMap[item.productId] = { name, revenue: 0 };
          productMap[item.productId].revenue += (item.total || 0);
        });
      });
    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [storeInvoices, storeProducts]);

  const maxProductRevenue = topProducts[0]?.revenue || 1;

  // Pipeline funnel from local leads
  const leads = useLocalStorageData<StoredLead>(LEAD_STORAGE_KEY);
  const funnelStages = [
    { label: "Prospecting", statuses: ["NEW"], color: "bg-blue-400" },
    { label: "Qualification", statuses: ["CONTACTED", "QUALIFIED"], color: "bg-blue-500" },
    { label: "Proposal", statuses: ["PROPOSAL"], color: "bg-indigo-500" },
    { label: "Negotiation", statuses: ["NEGOTIATION"], color: "bg-purple-500" },
    { label: "Won", statuses: ["CLOSED_WON"], color: "bg-green-500" },
  ];
  const funnelData = funnelStages.map((stage) => ({
    ...stage,
    count: leads.filter((l) => stage.statuses.includes(l.status)).length,
  }));
  const maxFunnelCount = Math.max(...funnelData.map((f) => f.count), 1);

  // Sales by territory from visits
  const territoryBreakdown = useMemo(() => {
    const tMap: Record<string, { name: string; visits: number; doctors: number }> = {};
    storeTerritories
      .filter((t) => t.level === "district" || t.level === "region")
      .forEach((t) => {
        const repIds = t.assignedRepIds || [];
        const tVisits = storeVisits.filter((v) => {
          const doc = storeDoctors.find((d) => d.id === v.doctorId);
          return doc && repIds.some((rid: string) => rid === v.repId);
        }).length;
        const tDocs = storeDoctors.filter((d) => d.assignedRepId && repIds.includes(d.assignedRepId)).length;
        if (tVisits > 0 || tDocs > 0) {
          tMap[t.id] = { name: t.name, visits: tVisits, doctors: tDocs };
        }
      });
    return Object.values(tMap).sort((a, b) => b.visits - a.visits).slice(0, 5);
  }, [storeTerritories, storeVisits, storeDoctors]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5 text-green-600" /> Monthly Revenue (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {monthlyRevenue.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground">{m.revenue > 0 ? fmtM(m.revenue) : "—"}</span>
                <div className="w-full bg-green-100 rounded-t relative" style={{ height: `${Math.max((m.revenue / maxMonthlyRevenue) * 100, 4)}%` }}>
                  <div className="absolute inset-0 bg-green-500 rounded-t" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Products */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" /> Top 5 Products by Revenue</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground">No product revenue data yet.</p>
          ) : topProducts.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <span className="truncate mr-2">{p.name}</span>
                <span className="font-semibold shrink-0">{fmtM(p.revenue)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((p.revenue / maxProductRevenue) * 100)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-indigo-600" /> Pipeline Stage Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const widthPct = maxFunnelCount > 0 ? Math.max((stage.count / maxFunnelCount) * 100, 8) : 8;
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{stage.label}</span>
                  <div className="flex-1 h-7 bg-muted/50 rounded relative">
                    <div
                      className={`h-full ${stage.color} rounded flex items-center justify-end pr-2 transition-all`}
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-[11px] font-bold text-white">{stage.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sales by Territory */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-5 w-5 text-purple-600" /> Sales by Territory</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {territoryBreakdown.length === 0 ? (
            <p className="text-muted-foreground">No territory data available.</p>
          ) : territoryBreakdown.map((t) => (
            <div key={t.name} className="flex items-center justify-between">
              <div>
                <span className="font-medium">{t.name}</span>
                <div className="text-xs text-muted-foreground">{t.doctors} doctors</div>
              </div>
              <Badge variant="secondary">{t.visits} visits</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EnhancedQuickActionsPanel() {
  const actionItems: QuickLinkItem[] = [
    { label: "Create Invoice", icon: Receipt, href: "/erp/accounting" },
    { label: "New Lead", icon: UserPlus, href: "/crm/leads" },
    { label: "Submit Expense", icon: DollarSign, href: "/crm/expenses" },
    { label: "Log Visit", icon: MapPin, href: "/crm/medical-rep" },
    { label: "New PO", icon: ShoppingCart, href: "/erp/procurement" },
    { label: "Add Product", icon: Package, href: "/industry" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {actionItems.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={i} href={action.href}>
                <div className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-4 text-sm font-medium text-foreground shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 cursor-pointer">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs text-center">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quiz types & storage keys ──────────────────────────────────────────────

const STORAGE_QUIZZES = "pharma.quizzes";
const STORAGE_ATTEMPTS = "pharma.quizAttempts";

interface QuizInfo {
  id: string;
  title: string;
  passingScore: number;
}

interface QuizAttemptInfo {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

function useQuizData() {
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptInfo[]>([]);

  useEffect(() => {
    try {
      const q = localStorage.getItem(STORAGE_QUIZZES);
      if (q) setQuizzes(JSON.parse(q));
    } catch { /* ignore */ }
    try {
      const a = localStorage.getItem(STORAGE_ATTEMPTS);
      if (a) setAttempts(JSON.parse(a));
    } catch { /* ignore */ }
  }, []);

  return { quizzes, attempts };
}

function MyQuizResultsCard({ userId }: { userId: string }) {
  const { quizzes, attempts } = useQuizData();
  const myAttempts = attempts.filter((a) => a.userId === userId);
  const avgScore = myAttempts.length > 0 ? Math.round(myAttempts.reduce((s, a) => s + a.score, 0) / myAttempts.length) : 0;
  const passRate = myAttempts.length > 0 ? Math.round((myAttempts.filter((a) => a.passed).length / myAttempts.length) * 100) : 0;
  const quizIds = new Set(myAttempts.map((a) => a.quizId));
  const lastThree = [...myAttempts].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
          My Quiz Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-indigo-600">{avgScore}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{quizIds.size}</div>
                <div className="text-xs text-muted-foreground">Quizzes Taken</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{passRate}%</div>
                <div className="text-xs text-muted-foreground">Pass Rate</div>
              </div>
            </div>
            {lastThree.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Results</div>
                {lastThree.map((a) => {
                  const quiz = quizzes.find((q) => q.id === a.quizId);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <div className="font-medium">{quiz?.title ?? "Unknown Quiz"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(a.completedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.score}%</span>
                        <Badge variant={a.passed ? "success" : "destructive"} className="text-[10px]">
                          {a.passed ? "PASS" : "FAIL"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamQuizResultsCard({ getReportsOf, userId }: { getReportsOf: (id: string) => { id: string; name: string; role: string }[]; userId: string }) {
  const { quizzes, attempts } = useQuizData();
  const subordinates = getReportsOf(userId);

  const teamData = subordinates.map((sub) => {
    const subAttempts = attempts.filter((a) => a.userId === sub.id);
    const avgScore = subAttempts.length > 0 ? Math.round(subAttempts.reduce((s, a) => s + a.score, 0) / subAttempts.length) : 0;
    const passRate = subAttempts.length > 0 ? Math.round((subAttempts.filter((a) => a.passed).length / subAttempts.length) * 100) : 0;
    return { id: sub.id, name: sub.name, quizzesTaken: subAttempts.length, avgScore, passRate };
  }).filter((d) => d.quizzesTaken > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          Team Quiz Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team quiz attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1.5 font-medium">Name</th>
                  <th className="text-center py-1.5 font-medium">Taken</th>
                  <th className="text-center py-1.5 font-medium">Avg Score</th>
                  <th className="text-center py-1.5 font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {teamData.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{d.name}</td>
                    <td className="text-center py-1.5">{d.quizzesTaken}</td>
                    <td className="text-center py-1.5">
                      <span className={d.avgScore >= 70 ? "text-green-600 font-semibold" : d.avgScore >= 50 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>
                        {d.avgScore}%
                      </span>
                    </td>
                    <td className="text-center py-1.5">
                      <span className={d.passRate >= 70 ? "text-green-600 font-semibold" : d.passRate >= 50 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>
                        {d.passRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Role-specific dashboards ────────────────────────────────────────────────

function AdminDashboard() {
  const { user } = useCurrentUser();
  const store = useApiDataStore();
  const totalRevenue = safeArr<any>(store.invoices)
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total || 0), 0);
  const totalCustomers = safeArr<any>(store.customers).length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Full pharmaceutical enterprise overview — all modules, all users"
        badge="ADMINISTRATOR"
      />

      {/* Operational Alerts Banner */}
      <OperationalAlertsBanner />

      {/* Module Quick Stats Row */}
      <ModuleQuickStatsRow />

      {/* Approval Queue Widget */}
      <ApprovalQueueWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue (YTD)" value={fmtM(totalRevenue)} delta="+14.2%" trend="up" icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Customers" value={totalCustomers} delta="+8.3%" trend="up" icon={Users} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Employees" value={safeArr<any>(store.employees).length} icon={Users} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Open Positions" value={safeArr<any>(store.jobs).filter(j => j.status === "OPEN").length} delta={`${safeArr<any>(store.candidates).length} applicants`} trend="up" icon={Briefcase} color="bg-orange-100 text-orange-600" />
      </div>

      {/* Revenue & Sales Chart Area */}
      <RevenueAndSalesCharts />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeedWidget />
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Module Health</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: "Accounting", status: "Healthy", color: "bg-green-500" },
              { name: "Inventory & Batches", status: "Healthy", color: "bg-green-500" },
              { name: "Field Force CRM", status: "Healthy", color: "bg-green-500" },
              { name: "Cold Chain", status: "2 alerts", color: "bg-amber-500" },
              { name: "Regulatory (EDA)", status: "1 pending", color: "bg-amber-500" },
              { name: "HR & Payroll", status: "Healthy", color: "bg-green-500" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span>{m.name}</span>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${m.color}`} />
                  <span className="text-xs text-muted-foreground">{m.status}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Critical Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>12 batches expiring within 90 days</div>
            </div>
            <div className="flex items-start gap-2">
              <Thermometer className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>Cold chain excursion: Warehouse B (2-8°C)</div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>EDA submission deadline: 7 days</div>
            </div>
            <div className="flex items-start gap-2">
              <Microscope className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>8 products pending QC release</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">User Activity (24h)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total logins</span><span className="font-semibold">127</span></div>
            <div className="flex justify-between"><span>Field force GPS check-ins</span><span className="font-semibold">84</span></div>
            <div className="flex justify-between"><span>Visits logged</span><span className="font-semibold">316</span></div>
            <div className="flex justify-between"><span>Invoices created</span><span className="font-semibold">42</span></div>
            <div className="flex justify-between"><span>Stock movements</span><span className="font-semibold">58</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions Panel */}
      <EnhancedQuickActionsPanel />

      <QuickActions items={[
        { label: "Settings", icon: ShieldCheck, href: "/settings" },
        { label: "Industry", icon: Pill, href: "/industry" },
        { label: "Accounting", icon: Receipt, href: "/erp/accounting" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "HR", icon: Users, href: "/erp/hr" },
      ]} />
    </div>
  );
}

function BUMDashboard() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useApiDataStore();

  // All people under BUM
  const allSubordinates = getReportsOf(user.id);
  const dms = allSubordinates.filter((u) => u.role === "DISTRICT_MANAGER");
  const reps = allSubordinates.filter((u) => u.role === "MEDICAL_REP");
  const repIds = new Set(reps.map((r) => r.id));

  const allInvoices = safeArr<any>(store.invoices);
  const allDoctorsRaw = safeArr<any>(store.doctors);
  const allVisitsRaw = safeArr<any>(store.visits);
  const allTerritoriesRaw = safeArr<any>(store.territories);
  const allMR = safeArr<any>(store.marketRequests);
  const allWP = safeArr<any>(store.weeklyPlans);
  const allProductsRaw = safeArr<any>(store.products);
  const allKpis = safeArr<any>(store.kpis);

  // BUM should only see their own BU(s)
  const allBUs = safeArr<any>(store.businessUnits).filter((bu: any) => bu.managerId === user.id);
  const myBuIds = new Set(allBUs.map((bu: any) => bu.id));

  // Scope products, doctors, visits, and territories to BUM's BU(s)
  const allProducts = allProductsRaw.filter((p: any) => myBuIds.has(p.buId));
  const allDoctors = allDoctorsRaw.filter((d: any) => (d.assignedRepId && repIds.has(d.assignedRepId)) || myBuIds.has(d.buId));
  const allVisits = allVisitsRaw.filter((v: any) => repIds.has(v.repId) || myBuIds.has(v.buId));
  const allTerritories = allTerritoriesRaw.filter((t: any) => myBuIds.has(t.buId));

  // Revenue from invoices
  const buRevenue = allInvoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total || 0), 0);

  // Doctor & visit counts scoped to my reps
  const myDoctors = allDoctors.filter((d) => d.assignedRepId && repIds.has(d.assignedRepId));
  const myVisits = allVisits.filter((v) => repIds.has(v.repId));
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeRepsToday = new Set(
    myVisits.filter((v) => (v.dateTime || "").slice(0, 10) === todayStr).map((v) => v.repId)
  ).size;

  // Coverage: territories with assigned reps / total territories (brick level)
  const totalTerritories = allTerritories.filter((t) => t.level === "brick").length;
  const coveredTerritories = allTerritories.filter(
    (t) => t.level === "brick" && (t.assignedRepIds || []).some((rid: string) => repIds.has(rid))
  ).length;
  const coveragePct = totalTerritories > 0 ? Math.round((coveredTerritories / totalTerritories) * 100) : 0;

  // Compliance: approved visits / total visits
  const approvedVisits = myVisits.filter((v) => v.status === "APPROVED").length;
  const compliancePct = myVisits.length > 0 ? Math.round((approvedVisits / myVisits.length) * 100) : 0;

  // Pending items needing BUM attention
  const pendingMarketRequests = allMR.filter((mr) => mr.status === "PENDING");
  const pendingVisitApprovals = allVisits.filter((v) => v.status === "LOGGED");
  const pendingPlans = allWP.filter((wp) => wp.status === "SUBMITTED");

  // Product performance sorted by invoice sales
  const productSales = allProducts.map((p) => {
    const sales = allInvoices
      .filter((inv) => inv.status === "PAID" || inv.status === "PARTIAL")
      .reduce((sum, inv) => {
        const lineTotal = (inv.items || [])
          .filter((it: any) => it.productId === p.id)
          .reduce((ls: number, it: any) => ls + (it.total || 0), 0);
        return sum + lineTotal;
      }, 0);
    return { ...p, sales };
  }).sort((a, b) => b.sales - a.sales);

  // District Manager performance from KPIs
  const dmPerf = dms.map((dm) => {
    const kpis = allKpis.filter((k) => k.userId === dm.id);
    const totalTarget = kpis.reduce((s, k) => s + (k.target || 0), 0);
    const totalActual = kpis.reduce((s, k) => s + (k.actual || 0), 0);
    const achievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    const dmReports = getReportsOf(dm.id);
    return {
      id: dm.id,
      name: `${dm.name} — ${dm.territory ?? "All"}`,
      achievement,
      repCount: dmReports.filter((u) => u.role === "MEDICAL_REP").length,
    };
  });

  // BU breakdown
  const buBreakdown = allBUs.map((bu) => {
    const buProds = allProducts.filter((p) => p.buId === bu.id);
    const buDocs = allDoctors.filter((d) => d.buId === bu.id);
    const buReps = reps.filter((r) => (bu.memberIds || []).includes(r.id));
    const buVis = allVisits.filter((v) => v.buId === bu.id);
    const buSales = allInvoices
      .filter((inv) => inv.status === "PAID" || inv.status === "PARTIAL")
      .reduce((sum, inv) => {
        return sum + (inv.items || [])
          .filter((it: any) => buProds.some((p) => p.id === it.productId))
          .reduce((ls: number, it: any) => ls + (it.total || 0), 0);
      }, 0);
    return { id: bu.id, name: bu.name, code: bu.code, color: bu.color, sales: buSales, doctorCount: buDocs.length, repCount: buReps.length, visitCount: buVis.length, productCount: buProds.length };
  });

  const maxBuSales = Math.max(...buBreakdown.map((b) => b.sales), 1);

  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Your business units, teams, and field performance"
        badge="BUSINESS UNIT MANAGER"
      />

      {/* Operational Alerts Banner */}
      <OperationalAlertsBanner />

      {/* Approval Queue Widget */}
      <ApprovalQueueWidget />

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="BU Revenue (YTD)" value={fmtM(buRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Business Units" value={allBUs.length} delta={`${allProducts.length} products`} icon={Target} color="bg-blue-100 text-blue-600" />
        <KpiCard label="National Coverage" value={`${coveragePct}%`} delta={`${coveredTerritories}/${totalTerritories} bricks`} icon={MapPin} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Field Force" value={reps.length} delta={`${activeRepsToday} active today`} trend={activeRepsToday > 0 ? "up" : "flat"} icon={Users} color="bg-orange-100 text-orange-600" />
      </div>

      {/* Pending Actions */}
      {(pendingMarketRequests.length > 0 || pendingVisitApprovals.length > 0 || pendingPlans.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pending Your Attention</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/crm/market-requests">
                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{pendingMarketRequests.length}</div>
                    <div className="text-xs text-muted-foreground">Market Requests</div>
                  </div>
                </div>
              </Link>
              <Link href="/crm/gps-tracking">
                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{pendingVisitApprovals.length}</div>
                    <div className="text-xs text-muted-foreground">Visit Approvals</div>
                  </div>
                </div>
              </Link>
              <Link href="/crm/weekly-plan">
                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{pendingPlans.length}</div>
                    <div className="text-xs text-muted-foreground">Plan Approvals</div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BU Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Business Unit Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {buBreakdown.map((bu) => (
            <div key={bu.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: bu.color }} />
                  <span className="font-medium">{bu.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{bu.code}</Badge>
                </div>
                <span className="font-semibold">{fmtM(bu.sales)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((bu.sales / maxBuSales) * 100)}%` }} />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{bu.doctorCount} doctors</span>
                <span>{bu.repCount} reps</span>
                <span>{bu.visitCount} visits</span>
                <span>{bu.productCount} products</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* District Manager Performance */}
        <Card>
          <CardHeader><CardTitle className="text-base">District Manager Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dmPerf.length === 0 ? (
              <p className="text-muted-foreground">No district managers assigned yet.</p>
            ) : dmPerf.map((dm) => (
              <div key={dm.id} className="space-y-1">
                <div className="flex justify-between"><span>{dm.name}</span><span className="font-semibold">{dm.achievement}%</span></div>
                <div className="h-2 bg-muted rounded-full">
                  <div className={`h-full rounded-full ${dm.achievement >= 100 ? "bg-green-500" : dm.achievement >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(dm.achievement, 100)}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{dm.repCount} reps</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Products by Sales */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Sales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {productSales.slice(0, 5).map((p) => {
              const buName = safeArr<any>(store.businessUnits).find((b) => b.id === p.buId)?.code ?? "---";
              const maxSales = productSales[0]?.sales || 1;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between">
                    <span>{p.name} {p.strength} <Badge variant="secondary" className="text-[10px] ml-1">{buName}</Badge></span>
                    <span className="font-semibold">{fmtM(p.sales)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round((p.sales / maxSales) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Field Force Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Field Force Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total Reps</span><span className="font-semibold">{reps.length}</span></div>
            <div className="flex justify-between"><span>Active Today</span><span className="font-semibold">{activeRepsToday}</span></div>
            <div className="flex justify-between"><span>Total Visits (All Time)</span><span className="font-semibold">{myVisits.length}</span></div>
            <div className="flex justify-between"><span>Compliance %</span><span className={`font-semibold ${compliancePct >= 80 ? "text-green-600" : "text-amber-600"}`}>{compliancePct}%</span></div>
            <div className="flex justify-between"><span>Doctors Covered</span><span className="font-semibold">{myDoctors.length}</span></div>
            <div className="flex justify-between"><span>District Managers</span><span className="font-semibold">{dms.length}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Samples Distributed</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const samplesByProduct: Record<string, number> = {};
              myVisits.forEach((v) => {
                (v.samplesGiven || []).forEach((sg: any) => {
                  samplesByProduct[sg.productId] = (samplesByProduct[sg.productId] || 0) + (sg.quantity || 0);
                });
              });
              const entries = Object.entries(samplesByProduct).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) return <p className="text-muted-foreground">No samples distributed yet.</p>;
              return entries.map(([pid, qty]) => {
                const prod = safeArr<any>(store.products).find((p) => p.id === pid);
                return (
                  <div key={pid} className="flex justify-between">
                    <span>{prod?.name ?? pid} {prod?.strength ?? ""}</span>
                    <span className="font-semibold">{qty} units</span>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <ActivityFeedWidget />

      {/* Quiz Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyQuizResultsCard userId={user.id} />
        <TeamQuizResultsCard getReportsOf={getReportsOf} userId={user.id} />
      </div>

      {/* My Weekly Plan */}
      <Card>
        <CardHeader><CardTitle className="text-base">My Weekly Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Weekly Plans</div>
                <div className="text-xs text-muted-foreground">
                  {pendingPlans.length > 0 ? `${pendingPlans.length} plan(s) pending your review` : "No plans pending review"}
                </div>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/crm/weekly-plan">View Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuickActions items={[
        { label: "Weekly Plan", icon: Calendar, href: "/crm/weekly-plan" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "KPIs", icon: Target, href: "/crm/kpis" },
        { label: "Accounting", icon: Receipt, href: "/erp/accounting" },
        { label: "BUM View", icon: Target, href: "/crm/bum" },
        { label: "Market Requests", icon: ClipboardList, href: "/crm/market-requests" },
      ]} />
    </div>
  );
}

function MarketeerDashboard() {
  const { user, getReportsOf } = useCurrentUser();
  const store = useApiDataStore();

  // My DMs and their reps
  const myReports = getReportsOf(user.id);
  const myDMs = myReports.filter((u) => u.role === "DISTRICT_MANAGER");
  const myReps = myReports.filter((u) => u.role === "MEDICAL_REP");
  const repIds = new Set(myReps.map((r) => r.id));

  // Revenue
  const regionRevenue = safeArr<any>(store.invoices)
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total || 0), 0);

  // Visits scoped to my reps
  const teamVisits = safeArr<any>(store.visits).filter((v) => repIds.has(v.repId));
  const totalSamplesDistributed = teamVisits.reduce((s, v) => s + (v.samplesDistributed || 0), 0);

  // Coverage
  const totalBricks = safeArr<any>(store.territories).filter((t) => t.level === "brick").length;
  const coveredBricks = safeArr<any>(store.territories).filter(
    (t) => t.level === "brick" && (t.assignedRepIds || []).some((rid: string) => repIds.has(rid))
  ).length;
  const coveragePct = totalBricks > 0 ? Math.round((coveredBricks / totalBricks) * 100) : 0;

  // Doctors in scope
  const teamDoctors = safeArr<any>(store.doctors).filter((d) => d.assignedRepId && repIds.has(d.assignedRepId));
  const uniqueDoctorsVisited = new Set(teamVisits.map((v) => v.doctorId)).size;

  // Market requests
  const teamMarketRequests = safeArr<any>(store.marketRequests).filter(
    (mr) => repIds.has(mr.requestedById) || mr.requestedById === user.id || myDMs.some((dm) => dm.id === mr.requestedById)
  );
  const pendingMRs = teamMarketRequests.filter((mr) => mr.status === "PENDING");
  const eventRequests = teamMarketRequests.filter((mr) => mr.type === "EVENT");
  const sampleRequests = teamMarketRequests.filter((mr) => mr.type === "SAMPLE");

  // DM performance
  const dmPerf = myDMs.map((dm) => {
    const dmKpis = safeArr<any>(store.kpis).filter((k) => k.userId === dm.id);
    const totalTarget = dmKpis.reduce((s, k) => s + (k.target || 0), 0);
    const totalActual = dmKpis.reduce((s, k) => s + (k.actual || 0), 0);
    const achievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    const dmReps = getReportsOf(dm.id);
    const dmRepIds = new Set(dmReps.map((r) => r.id));
    const dmVisits = safeArr<any>(store.visits).filter((v) => dmRepIds.has(v.repId));
    return {
      id: dm.id,
      name: `${dm.name} — ${dm.territory ?? "District"}`,
      achievement,
      visitCount: dmVisits.length,
      repCount: dmReps.length,
    };
  });

  // Product performance within BUs
  const productPerf = safeArr<any>(store.products).map((p) => {
    const sales = safeArr<any>(store.invoices)
      .filter((inv) => inv.status === "PAID" || inv.status === "PARTIAL")
      .reduce((sum, inv) => sum + (inv.items || []).filter((it: any) => it.productId === p.id).reduce((ls: number, it: any) => ls + (it.total || 0), 0), 0);
    const samples = teamVisits.reduce((s, v) => s + (v.samplesGiven || []).filter((sg: any) => sg.productId === p.id).reduce((ss: number, sg: any) => ss + (sg.quantity || 0), 0), 0);
    return { ...p, sales, samples };
  }).sort((a, b) => b.sales - a.sales);

  // ─── Doctor Coverage Heatmap by Classification ─────────────────────────────
  const classificationCoverage = (["A", "B", "C", "D"] as const).map((cls) => {
    const docsInClass = teamDoctors.filter((d: any) => d.classification === cls);
    const total = docsInClass.length;
    const visitedDocIds = new Set(teamVisits.map((v: any) => v.doctorId));
    const visited = docsInClass.filter((d: any) => visitedDocIds.has(d.id)).length;
    const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
    return { cls, total, visited, pct };
  });

  const classColors: Record<string, { bar: string; bg: string; label: string }> = {
    A: { bar: "bg-red-500", bg: "bg-red-100", label: "text-red-700" },
    B: { bar: "bg-amber-500", bg: "bg-amber-100", label: "text-amber-700" },
    C: { bar: "bg-blue-500", bg: "bg-blue-100", label: "text-blue-700" },
    D: { bar: "bg-gray-400", bg: "bg-gray-100", label: "text-gray-600" },
  };

  // ─── Buying Ladder Progression ─────────────────────────────────────────────
  const buyingLadderCounts = BUYING_LADDER_STAGES.map((stage) => {
    const count = teamDoctors.filter((d: any) => d.buyingLadderStage === stage).length;
    return { stage, count };
  });
  const maxLadderCount = Math.max(...buyingLadderCounts.map((b) => b.count), 1);
  const ladderColors: Record<string, string> = {
    Unaware: "bg-gray-400",
    Aware: "bg-blue-400",
    Trial: "bg-amber-400",
    Regular: "bg-green-500",
    Champion: "bg-emerald-600",
  };

  // ─── Pending Approvals Summary ─────────────────────────────────────────────
  const pendingWeeklyPlans = safeArr<any>(store.weeklyPlans).filter(
    (wp) => wp.status === "SUBMITTED" && repIds.has(wp.repId)
  );
  const pendingMarketRequests = teamMarketRequests.filter((mr: any) => mr.status === "PENDING");
  const pendingVisitApprovals = safeArr<any>(store.visits).filter(
    (v) => v.status === "LOGGED" && repIds.has(v.repId)
  );

  // ─── Top Performing Reps ───────────────────────────────────────────────────
  const repPerformance = myReps.map((rep) => {
    const repVisits = safeArr<any>(store.visits).filter((v: any) => v.repId === rep.id);
    const repDoctors = safeArr<any>(store.doctors).filter((d: any) => d.assignedRepId === rep.id);
    const visitedDocIds = new Set(repVisits.map((v: any) => v.doctorId));
    const coverageCount = repDoctors.filter((d: any) => visitedDocIds.has(d.id)).length;
    const coveragePctRep = repDoctors.length > 0 ? Math.round((coverageCount / repDoctors.length) * 100) : 0;
    const repKpis = safeArr<any>(store.kpis).filter((k: any) => k.userId === rep.id);
    const totalTarget = repKpis.reduce((s: number, k: any) => s + ((k.target as number) ?? 0), 0);
    const totalActual = repKpis.reduce((s: number, k: any) => s + ((k.actual as number) ?? 0), 0);
    const achievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    return { id: rep.id, name: rep.name, achievement, coveragePct: coveragePctRep, visitCount: repVisits.length };
  }).sort((a, b) => b.achievement - a.achievement).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Regional marketing performance — ${user.territory ?? "All Territories"}`}
        badge="MARKETEER"
      />

      {/* Operational Alerts */}
      <OperationalAlertsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Region Revenue" value={fmtM(regionRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Coverage" value={`${coveragePct}%`} delta={`${coveredBricks}/${totalBricks} bricks`} icon={MapPin} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Doctors" value={teamDoctors.length} delta={`${uniqueDoctorsVisited} visited`} icon={Stethoscope} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Medical Reps" value={myReps.length} delta={`${myDMs.length} DMs`} icon={Users} color="bg-orange-100 text-orange-600" />
      </div>

      {/* DM Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">District Manager Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dmPerf.length === 0 ? (
              <p className="text-muted-foreground">No district managers assigned yet.</p>
            ) : dmPerf.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="flex justify-between"><span>{d.name}</span><span className="font-semibold">{d.achievement}%</span></div>
                <div className="h-2 bg-muted rounded-full">
                  <div className={`h-full rounded-full ${d.achievement >= 100 ? "bg-green-500" : d.achievement >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(d.achievement, 100)}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{d.repCount} reps &middot; {d.visitCount} visits</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Market Activities */}
        <Card>
          <CardHeader><CardTitle className="text-base">Market Activities</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Doctor visits (all time)</span><span className="font-semibold">{teamVisits.length}</span></div>
            <div className="flex justify-between"><span>Unique doctors visited</span><span className="font-semibold">{uniqueDoctorsVisited}</span></div>
            <div className="flex justify-between"><span>Samples distributed</span><span className="font-semibold">{totalSamplesDistributed.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Market requests raised</span><span className="font-semibold">{teamMarketRequests.length}</span></div>
            <div className="flex justify-between"><span>Pending market requests</span><span className={`font-semibold ${pendingMRs.length > 0 ? "text-amber-600" : ""}`}>{pendingMRs.length}</span></div>
            <div className="flex justify-between"><span>Event requests</span><span className="font-semibold">{eventRequests.length}</span></div>
            <div className="flex justify-between"><span>Sample requests</span><span className="font-semibold">{sampleRequests.length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Product Performance</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {productPerf.slice(0, 6).map((p) => {
            const buLabel = safeArr<any>(store.businessUnits).find((b) => b.id === p.buId)?.code ?? "---";
            const maxSales = productPerf[0]?.sales || 1;
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex justify-between">
                  <span>{p.name} {p.strength} <Badge variant="secondary" className="text-[10px] ml-1">{buLabel}</Badge></span>
                  <span className="font-semibold">{fmtM(p.sales)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.sales > 0 ? Math.round((p.sales / maxSales) * 100) : 0}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{p.samples} samples distributed</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quiz Results */}
      <MyQuizResultsCard userId={user.id} />

      {/* ─── Doctor Coverage Heatmap & Buying Ladder ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Doctor Coverage Heatmap */}
        <Card>
          <CardHeader><CardTitle className="text-base">Doctor Coverage by Classification</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {classificationCoverage.map((row) => {
              const colors = classColors[row.cls];
              const isLow = row.cls === "A" && row.pct < 80;
              return (
                <div key={row.cls} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs font-bold ${colors.bg} ${colors.label}`}>Class {row.cls}</Badge>
                      <span className="text-muted-foreground">{row.visited}/{row.total} doctors visited</span>
                    </div>
                    <span className={`font-semibold ${isLow ? "text-red-600" : ""}`}>{row.pct}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full">
                    <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.min(row.pct, 100)}%` }} />
                  </div>
                  {isLow && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      Low coverage — prioritize Class A doctors
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Total: {teamDoctors.length} doctors assigned &middot; {new Set(teamVisits.map((v: any) => v.doctorId)).size} unique visited
            </div>
          </CardContent>
        </Card>

        {/* Buying Ladder Progression */}
        <Card>
          <CardHeader><CardTitle className="text-base">Buying Ladder Progression</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {buyingLadderCounts.map((row, idx) => (
              <div key={row.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx > 0 && <span className="text-muted-foreground text-xs">&#8594;</span>}
                    <span className="font-medium">{row.stage}</span>
                  </div>
                  <span className="font-semibold">{row.count} doctors</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full">
                  <div className={`h-full rounded-full ${ladderColors[row.stage] ?? "bg-gray-400"}`} style={{ width: `${maxLadderCount > 0 ? Math.round((row.count / maxLadderCount) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Goal: Move doctors from Unaware &#8594; Champion to increase prescriptions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Pending Approvals & Top Performing Reps ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Approvals Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-600" />
                <span>Weekly Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pendingWeeklyPlans.length > 0 ? "destructive" : "secondary"} className="text-xs">
                  {pendingWeeklyPlans.length}
                </Badge>
                <Link href="/crm/weekly-plans" className="text-xs text-blue-600 hover:underline">Review</Link>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>Market Requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pendingMarketRequests.length > 0 ? "destructive" : "secondary"} className="text-xs">
                  {pendingMarketRequests.length}
                </Badge>
                <Link href="/crm/market-requests" className="text-xs text-blue-600 hover:underline">Review</Link>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                <span>Visit Approvals</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pendingVisitApprovals.length > 0 ? "destructive" : "secondary"} className="text-xs">
                  {pendingVisitApprovals.length}
                </Badge>
                <Link href="/crm/visits" className="text-xs text-blue-600 hover:underline">Review</Link>
              </div>
            </div>
            {(pendingWeeklyPlans.length + pendingMarketRequests.length + pendingVisitApprovals.length) === 0 && (
              <div className="flex items-center gap-2 text-green-600 pt-1">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-medium">All caught up — no pending approvals</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Reps */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Performing Reps</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {repPerformance.length === 0 ? (
              <p className="text-muted-foreground">No medical reps assigned yet.</p>
            ) : repPerformance.map((rep, idx) => {
              const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
              return (
                <div key={rep.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs w-5 text-center ${idx < 3 ? (medalColors[idx] ?? "text-muted-foreground") : "text-muted-foreground"}`}>
                        #{idx + 1}
                      </span>
                      <span>{rep.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{rep.coveragePct}% cov.</span>
                      <span className="font-semibold">{rep.achievement}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full ml-7">
                    <div className={`h-full rounded-full ${rep.achievement >= 100 ? "bg-green-500" : rep.achievement >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(rep.achievement, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <QuickActions items={[
        { label: "My Region", icon: MapPin, href: "/crm/marketeer" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "KPIs", icon: Target, href: "/crm/kpis" },
        { label: "Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Market Requests", icon: ClipboardList, href: "/crm/market-requests" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
      ]} />
    </div>
  );
}

function DistrictManagerDashboard() {
  const { user, getReportsOf } = useCurrentUser();
  const store = useApiDataStore();

  // My reps
  const myReps = getReportsOf(user.id);
  const repIds = new Set(myReps.map((r) => r.id));

  // Visits scoped to my reps
  const teamVisits = safeArr<any>(store.visits).filter((v) => repIds.has(v.repId));
  const todayStr = new Date().toISOString().slice(0, 10);
  const visitsToday = teamVisits.filter((v) => (v.dateTime || "").slice(0, 10) === todayStr);
  const uniqueDoctorsVisited = new Set(teamVisits.map((v) => v.doctorId)).size;
  const totalSamples = teamVisits.reduce((s, v) => s + (v.samplesDistributed || 0), 0);

  // Revenue
  const districtRevenue = safeArr<any>(store.invoices)
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + (i.total || 0), 0);

  // Coverage
  const totalBricks = safeArr<any>(store.territories).filter((t) => t.level === "brick").length;
  const coveredBricks = safeArr<any>(store.territories).filter(
    (t) => t.level === "brick" && (t.assignedRepIds || []).some((rid: string) => repIds.has(rid))
  ).length;
  const coveragePct = totalBricks > 0 ? Math.round((coveredBricks / totalBricks) * 100) : 0;

  // Pending visit approvals for my reps
  const pendingVisitApprovals = safeArr<any>(store.visits).filter(
    (v) => v.status === "LOGGED" && repIds.has(v.repId)
  );

  // Pending market requests from my reps
  const pendingMRs = safeArr<any>(store.marketRequests).filter(
    (mr) => mr.status === "PENDING" && repIds.has(mr.requestedById)
  );

  // District KPIs
  const districtKpis = safeArr<any>(store.kpis).filter((k) => k.userId === user.id);

  // Rep performance
  const repPerf = myReps.map((rep) => {
    const repVisits = safeArr<any>(store.visits).filter((v) => v.repId === rep.id);
    const repVisitsToday = repVisits.filter((v) => (v.dateTime || "").slice(0, 10) === todayStr).length;
    const repDoctors = safeArr<any>(store.doctors).filter((d) => d.assignedRepId === rep.id);
    const repDoctorsVisited = new Set(repVisits.map((v) => v.doctorId)).size;
    const repCoverage = repDoctors.length > 0 ? Math.round((repDoctorsVisited / repDoctors.length) * 100) : 0;
    const repApproved = repVisits.filter((v) => v.status === "APPROVED").length;
    const repCompliance = repVisits.length > 0 ? Math.round((repApproved / repVisits.length) * 100) : 0;
    const repKpis = safeArr<any>(store.kpis).filter((k) => k.userId === rep.id);
    const kpiTarget = repKpis.find((k) => k.metric === "Visits")?.target ?? 0;
    const repPendingApprovals = safeArr<any>(store.visits).filter((v) => v.status === "LOGGED" && v.repId === rep.id).length;

    return {
      id: rep.id,
      name: rep.name,
      territory: rep.territory ?? "---",
      visitsToday: repVisitsToday,
      visitsMTD: repVisits.length,
      visitTarget: kpiTarget,
      doctorsCovered: repDoctorsVisited,
      totalDoctors: repDoctors.length,
      coverage: repCoverage,
      compliance: repCompliance,
      pendingApprovals: repPendingApprovals,
    };
  });

  // Coaching: reps below target or low coverage
  const repsNeedingCoaching = repPerf.filter(
    (r) => (r.visitTarget > 0 && r.visitsMTD < r.visitTarget * 0.8) || r.coverage < 70
  );

  // Territories assigned to reps
  const assignedTerritories = safeArr<any>(store.territories).filter(
    (t) => t.level === "brick" && (t.assignedRepIds || []).some((rid: string) => repIds.has(rid))
  );

  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`District team performance — ${user.territory ?? "District"}`}
        badge="DISTRICT MANAGER"
      />

      {/* Operational Alerts */}
      <OperationalAlertsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="District Revenue (MTD)" value={fmtM(districtRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Team Coverage" value={`${coveragePct}%`} delta={`${coveredBricks}/${totalBricks} bricks`} icon={MapPin} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Medical Reps" value={myReps.length} delta={`${visitsToday.length} visits today`} icon={Users} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Total Visits" value={teamVisits.length} delta={`${uniqueDoctorsVisited} doctors`} icon={Calendar} color="bg-orange-100 text-orange-600" />
      </div>

      {/* Pending Approvals */}
      {(pendingVisitApprovals.length > 0 || pendingMRs.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/crm/gps-tracking">
                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{pendingVisitApprovals.length}</div>
                    <div className="text-xs text-muted-foreground">Visit Approvals</div>
                  </div>
                </div>
              </Link>
              <Link href="/crm/market-requests">
                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{pendingMRs.length}</div>
                    <div className="text-xs text-muted-foreground">Market Requests</div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Medical Rep Team */}
        <Card>
          <CardHeader><CardTitle className="text-base">Medical Rep Team</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {repPerf.length === 0 ? (
              <p className="text-muted-foreground">No medical reps assigned yet.</p>
            ) : repPerf.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Coverage: {r.coverage}% &middot; Compliance: {r.compliance}%
                    {r.pendingApprovals > 0 && <span className="text-amber-600"> &middot; {r.pendingApprovals} pending</span>}
                  </div>
                </div>
                <Badge variant={r.visitTarget > 0 && r.visitsMTD >= r.visitTarget ? "success" : "secondary"}>
                  {r.visitsMTD}{r.visitTarget > 0 ? `/${r.visitTarget}` : ""} visits
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* District KPIs */}
        <Card>
          <CardHeader><CardTitle className="text-base">District KPIs</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total visits</span><span className="font-semibold">{teamVisits.length}</span></div>
            <div className="flex justify-between"><span>Unique doctors visited</span><span className="font-semibold">{uniqueDoctorsVisited}</span></div>
            <div className="flex justify-between"><span>Samples distributed</span><span className="font-semibold">{totalSamples.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Market requests</span><span className="font-semibold">{safeArr<any>(store.marketRequests).filter((mr) => repIds.has(mr.requestedById)).length}</span></div>
            {districtKpis.map((kpi) => (
              <div key={kpi.id} className="flex justify-between">
                <span>{kpi.metric}</span>
                <span className={`font-semibold ${kpi.actual >= kpi.target ? "text-green-600" : kpi.actual >= kpi.target * 0.8 ? "text-amber-600" : "text-red-600"}`}>
                  {kpi.actual}/{kpi.target}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Coverage & Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Territory Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {assignedTerritories.length === 0 ? (
              <p className="text-muted-foreground">No territories assigned to your reps.</p>
            ) : assignedTerritories.slice(0, 8).map((t) => (
              <div key={t.id} className="flex justify-between">
                <span>{t.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{t.imsCode}</Badge>
                  <span className="text-xs text-muted-foreground">{(t.assignedRepIds || []).filter((rid: string) => repIds.has(rid)).length} reps</span>
                </div>
              </div>
            ))}
            {assignedTerritories.length > 8 && (
              <p className="text-xs text-muted-foreground">+{assignedTerritories.length - 8} more territories</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Coaching Indicators</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {repsNeedingCoaching.length === 0 ? (
              <p className="text-green-600 font-medium">All reps are on track.</p>
            ) : repsNeedingCoaching.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.visitTarget > 0 && r.visitsMTD < r.visitTarget * 0.8 && (
                      <span className="text-red-600">Below visit target ({r.visitsMTD}/{r.visitTarget})</span>
                    )}
                    {r.coverage < 70 && (
                      <span className="text-amber-600">{r.visitTarget > 0 && r.visitsMTD < r.visitTarget * 0.8 ? " | " : ""}Low coverage ({r.coverage}%)</span>
                    )}
                  </div>
                </div>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quiz Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyQuizResultsCard userId={user.id} />
        <TeamQuizResultsCard getReportsOf={getReportsOf} userId={user.id} />
      </div>

      <QuickActions items={[
        { label: "My Team", icon: Users, href: "/crm/district-manager" },
        { label: "KPIs", icon: Target, href: "/crm/kpis" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Market Requests", icon: ClipboardList, href: "/crm/market-requests" },
      ]} />
    </div>
  );
}

function MedicalRepDashboard() {
  const { user } = useCurrentUser();
  const store = useApiDataStore();

  const myVisits = safeArr<any>(store.visits).filter((v) => v.repId === user.id);
  const myDoctors = safeArr<any>(store.doctors).filter((d) => d.assignedRepId === user.id);
  const myTasks = safeArr<any>(store.tasks).filter((t) => t.assignedToId === user.id && t.status !== "DONE");
  const myRequests = safeArr<any>(store.marketRequests).filter((r) => r.requestedById === user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().split("T")[0];
  const mtdVisits = myVisits.filter((v) => new Date(v.dateTime) >= monthStart);
  const todayVisits = myVisits.filter((v) => (v.dateTime || "").startsWith(todayStr));
  const uniqueDoctorsVisited = new Set(mtdVisits.map((v) => v.doctorId)).size;
  const totalSamplesGiven = mtdVisits.reduce((s, v) => s + v.samplesDistributed, 0);
  const coveragePct = myDoctors.length > 0 ? Math.round((uniqueDoctorsVisited / myDoctors.length) * 100) : 0;
  const approvedVisits = mtdVisits.filter((v) => v.status === "APPROVED").length;
  const callRate = mtdVisits.length > 0 ? (mtdVisits.length / Math.max(1, Math.ceil(now.getDate() * 0.8))).toFixed(1) : "0";

  const todayPlanned = useMemo(() => {
    const plans = safeArr<any>(store.weeklyPlans).filter((p) => p.repId === user.id && p.status === "APPROVED");
    const visits: { doctorId: string; doctorName: string; specialty: string; hospital: string; time: string; isKOL: boolean }[] = [];
    for (const plan of plans) {
      const dayPlan = plan.days.find((d: any) => d.date === todayStr);
      if (!dayPlan) continue;
      for (const pv of dayPlan.visits) {
        const doc = pv.doctorId ? safeArr<any>(store.doctors).find((d) => d.id === pv.doctorId) : null;
        if (doc) visits.push({ doctorId: doc.id, doctorName: doc.name, specialty: doc.specialty, hospital: doc.hospital, time: pv.timeSlot || "—", isKOL: doc.isKOL });
      }
    }
    return visits;
  }, [store.weeklyPlans, store.doctors, user.id, todayStr]);

  const samplesByProduct = useMemo(() => {
    const map: Record<string, { name: string; given: number }> = {};
    for (const v of mtdVisits) {
      for (const s of (v.samplesGiven || [])) {
        const prod = safeArr<any>(store.products).find((p) => p.id === s.productId);
        const name = prod ? `${prod.name} ${prod.strength}` : s.productId;
        if (!map[s.productId]) map[s.productId] = { name, given: 0 };
        map[s.productId].given += s.quantity;
      }
    }
    return Object.entries(map).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.given - a.given);
  }, [mtdVisits, store.products]);
  const maxSamples = samplesByProduct[0]?.given || 1;

  const myBUs = safeArr<any>(store.businessUnits).filter((bu) => (bu.memberIds || []).includes(user.id));
  const myProducts = safeArr<any>(store.products).filter((p) => myBUs.some((bu) => bu.id === p.buId));
  const kolDoctors = myDoctors.filter((d) => d.isKOL);

  const [notes, setNotes] = useState("");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinDoctor, setCheckinDoctor] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinProducts, setCheckinProducts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pharma.mr-notes." + user.id);
      if (saved) setNotes(saved);
    } catch { /* ignore */ }
  }, [user.id]);

  function saveNote(text: string) {
    setNotes(text);
    try { localStorage.setItem("pharma.mr-notes." + user.id, text); } catch { /* ignore */ }
  }

  function handleCheckin() {
    if (!checkinDoctor) return;
    const doc = safeArr<any>(store.doctors).find((d) => d.id === checkinDoctor);
    store.add("visits", {
      id: store.genId("vis"),
      repId: user.id,
      doctorId: checkinDoctor,
      dateTime: new Date().toISOString(),
      type: "SINGLE" as const,
      durationMin: 20,
      productIds: checkinProducts,
      samplesGiven: [],
      samplesDistributed: 0,
      buyingLadderBefore: (doc?.buyingLadderStage ?? "Aware") as "Unaware" | "Aware" | "Trial" | "Regular" | "Champion",
      buyingLadderAfter: (doc?.buyingLadderStage ?? "Aware") as "Unaware" | "Aware" | "Trial" | "Regular" | "Champion",
      activityRequests: [],
      notes: checkinNotes,
      gpsVerified: true,
      lat: 30.05 + Math.random() * 0.05,
      lng: 31.23 + Math.random() * 0.05,
      status: "LOGGED" as const,
      buId: doc?.buId ?? "",
      session: new Date().getHours() < 12 ? "AM" as const : "PM" as const,
    });
    setCheckinOpen(false);
    setCheckinDoctor("");
    setCheckinNotes("");
    setCheckinProducts([]);
  }

  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Daily field operations — ${user.territory ?? "Territory"} · ${todayStr}`}
        badge="MEDICAL REP"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Visits MTD" value={mtdVisits.length} delta={`${todayVisits.length} today`} trend="up" icon={Calendar} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Call Rate" value={`${callRate}/day`} delta={`${approvedVisits} approved`} trend="up" icon={Target} color="bg-green-100 text-green-600" />
        <KpiCard label="Coverage" value={`${coveragePct}%`} delta={`${uniqueDoctorsVisited}/${myDoctors.length}`} trend={coveragePct >= 80 ? "up" : "down"} icon={MapPin} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Samples Given" value={totalSamplesGiven} delta={`${samplesByProduct.length} products`} icon={Package} color="bg-orange-100 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Today&apos;s Route &amp; Plan</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckinOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Check-in Visit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todayPlanned.length === 0 && myDoctors.length > 0 ? (
              <>
                <p className="text-muted-foreground text-xs mb-2">No approved plan for today. Showing assigned doctors:</p>
                {myDoctors.slice(0, 6).map((doc) => {
                  const visited = todayVisits.some((v) => v.doctorId === doc.id);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {doc.name}
                          {doc.isKOL && <Badge className="bg-yellow-100 text-yellow-800 text-[9px]">KOL</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{doc.specialty} · {doc.hospital}</div>
                      </div>
                      <Badge variant={visited ? "success" : "secondary"}>{visited ? "Visited" : "Planned"}</Badge>
                    </div>
                  );
                })}
              </>
            ) : todayPlanned.length === 0 ? (
              <p className="text-muted-foreground">No doctors assigned yet.</p>
            ) : todayPlanned.map((pv, i) => {
              const visited = todayVisits.some((v) => v.doctorId === pv.doctorId);
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{i + 1}</span>
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {pv.doctorName}
                        {pv.isKOL && <Badge className="bg-yellow-100 text-yellow-800 text-[9px]">KOL</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{pv.specialty} · {pv.hospital} · {pv.time}</div>
                    </div>
                  </div>
                  <Badge variant={visited ? "success" : "secondary"}>{visited ? "Done" : "Pending"}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Performance (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Visits completed</span><span className="font-semibold">{mtdVisits.length}</span></div>
            <div className="flex justify-between"><span>Unique doctors visited</span><span className="font-semibold">{uniqueDoctorsVisited}</span></div>
            <div className="flex justify-between"><span>Coverage %</span><span className={`font-semibold ${coveragePct >= 80 ? "text-green-600" : "text-amber-600"}`}>{coveragePct}%</span></div>
            <div className="flex justify-between"><span>Samples distributed</span><span className="font-semibold">{totalSamplesGiven}</span></div>
            <div className="flex justify-between"><span>Open tasks</span><span className="font-semibold">{myTasks.length}</span></div>
            <div className="flex justify-between"><span>Market requests</span><span className="font-semibold">{myRequests.length}</span></div>
            <div className="flex justify-between"><span>Pending requests</span><span className="font-semibold text-amber-600">{myRequests.filter((r) => r.status === "PENDING").length}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Samples Distribution (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {samplesByProduct.length === 0 ? (
              <p className="text-muted-foreground">No samples distributed this month.</p>
            ) : samplesByProduct.map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex justify-between"><span>{s.name}</span><span className="font-semibold">{s.given} units</span></div>
                <div className="h-2 bg-muted rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((s.given / maxSamples) * 100)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Product Knowledge</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.print()}>
              <Save className="h-3 w-3 mr-1" /> Print PDF
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(myProducts.length > 0 ? myProducts : safeArr<any>(store.products).slice(0, 5)).map((p) => (
              <div key={p.id} className="p-2 rounded border">
                <div className="flex justify-between">
                  <span className="font-medium">{p.name} {p.strength}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.form}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.therapeuticArea} · {p.code} · EGP {p.pricePerUnit}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Key Opinion Leaders</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {kolDoctors.length === 0 ? (
              <p className="text-muted-foreground text-xs">No KOLs in your territory.</p>
            ) : kolDoctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-1.5 rounded border">
                <div>
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.specialty} · {doc.hospital}</div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">{doc.classification}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Market Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {myRequests.length === 0 ? (
              <p className="text-muted-foreground text-xs">No market requests.</p>
            ) : myRequests.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-1.5 rounded border">
                <div>
                  <div className="font-medium text-xs">{r.type}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">{r.description}</div>
                </div>
                <Badge className={r.status === "APPROVED" ? "bg-green-100 text-green-800" : r.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-1"><StickyNote className="h-4 w-4" /> Quick Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => saveNote(e.target.value)} placeholder="Daily notes, reminders..." className="text-sm min-h-[120px] resize-none" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-1"><Navigation className="h-4 w-4" /> Today&apos;s Trip Points</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {todayVisits.length === 0 && todayPlanned.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visit points recorded today.</p>
            ) : (todayVisits.length > 0 ? todayVisits : todayPlanned.slice(0, 6)).map((v, i, arr) => {
              const docId = "doctorId" in v ? (v as { doctorId: string }).doctorId : "";
              const doc = safeArr<any>(store.doctors).find((d) => d.id === docId);
              return (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-[10px] text-muted-foreground mt-1 max-w-[70px] truncate text-center">{doc?.name?.split(" ").pop() ?? "Point"}</span>
                  </div>
                  {i < arr.length - 1 && <div className="w-8 h-0.5 bg-blue-300 shrink-0 mb-4" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quiz Results */}
      <MyQuizResultsCard userId={user.id} />

      <QuickActions items={[
        { label: "Check-in", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "My Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Log Visit", icon: ClipboardList, href: "/crm/medical-rep" },
        { label: "Expenses", icon: Receipt, href: "/crm/expenses" },
        { label: "Market Requests", icon: FileText, href: "/crm/market-requests" },
        { label: "Weekly Plan", icon: Calendar, href: "/crm/weekly-plan" },
      ]} />

      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quick Visit Check-in</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Doctor</Label>
              <Select value={checkinDoctor} onValueChange={setCheckinDoctor}>
                <SelectTrigger><SelectValue placeholder="Select doctor..." /></SelectTrigger>
                <SelectContent>
                  {myDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Products Discussed</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {safeArr<any>(store.products).slice(0, 8).map((p) => (
                  <button key={p.id} type="button" onClick={() => setCheckinProducts((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${checkinProducts.includes(p.id) ? "bg-blue-100 border-blue-400 text-blue-700" : "bg-muted border-border"}`}>
                    {p.name} {p.strength}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} placeholder="Visit notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckin} disabled={!checkinDoctor}>Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountantDashboard() {
  const { user } = useCurrentUser();
  const { config } = useAppConfig();
  const store = useApiDataStore();
  const arOutstanding = safeArr<any>(store.customers).reduce((s, c) => s + (c.outstanding || 0), 0);
  const apOutstanding = safeArr<any>(store.vendors).reduce((s, v) => s + (v.outstanding || 0), 0);
  const bankBalance = safeArr<any>(store.bankAccounts)
    .filter((b) => b.currency === "EGP" && b.status === "ACTIVE")
    .reduce((s, b) => s + (b.balance || 0), 0);
  const chequesPending = safeArr<any>(store.cheques).filter((c) => c.status === "PENDING").length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Financial operations — ${config.accounting.chartType} Chart of Accounts`}
        badge="ACCOUNTANT"
      />

      {/* Operational Alerts */}
      <OperationalAlertsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="AR Outstanding" value={fmtM(arOutstanding)} delta="-5.2%" trend="down" icon={Receipt} color="bg-amber-100 text-amber-600" />
        <KpiCard label="AP Outstanding" value={fmtM(apOutstanding)} icon={FileText} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Bank Balance" value={fmtM(bankBalance)} delta="+3.1%" trend="up" icon={Landmark} color="bg-green-100 text-green-600" />
        <KpiCard label="Cheques Pending" value={chequesPending} icon={FileText} color="bg-purple-100 text-purple-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">AR Aging</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { bucket: "0-30 days", amount: "6.2M", pct: 50, color: "bg-green-500" },
              { bucket: "31-60 days", amount: "3.4M", pct: 27, color: "bg-blue-500" },
              { bucket: "61-90 days", amount: "1.8M", pct: 15, color: "bg-amber-500" },
              { bucket: "91+ days", amount: "1.0M", pct: 8, color: "bg-red-500" },
            ].map((b) => (
              <div key={b.bucket} className="space-y-1">
                <div className="flex justify-between"><span>{b.bucket}</span><span className="font-semibold">{config.finance.currency} {b.amount}</span></div>
                <div className="h-2 bg-muted rounded-full"><div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers Outstanding</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[...safeArr<any>(store.customers)]
              .filter((c) => (c.outstanding || 0) > 0)
              .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0))
              .slice(0, 5)
              .map((c) => (
              <div key={c.id} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-semibold">{fmtM(c.outstanding)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Activity Feed */}
      <ActivityFeedWidget />

      <QuickActions items={[
        { label: "Accounting", icon: Receipt, href: "/erp/accounting" },
        { label: "Finance", icon: DollarSign, href: "/erp/finance" },
        { label: "Collections", icon: Landmark, href: "/erp/collections" },
        { label: "Returns", icon: ArrowDownRight, href: "/erp/returns" },
        { label: "Reports", icon: FileText, href: "/reports" },
        { label: "Tasks", icon: ClipboardList, href: "/tasks" },
      ]} />
    </div>
  );
}

function WarehouseDashboard() {
  const { user } = useCurrentUser();
  const { config } = useAppConfig();
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Warehouse, batch tracking, and cold chain operations"
        badge="WAREHOUSE MANAGER"
      />

      {/* Operational Alerts */}
      <OperationalAlertsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Batches" value={24} icon={FlaskConical} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Expiring < 90d" value={12} delta="2 new" trend="down" icon={AlertTriangle} color="bg-amber-100 text-amber-600" />
        <KpiCard label="Pending QC" value={8} icon={Microscope} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Pending GRN" value={5} icon={PackageCheck} color="bg-green-100 text-green-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cold Chain Status ({config.inventory.enableColdChain ? "Enabled" : "Disabled"})</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { wh: "Warehouse A — Cairo", temp: "4.2°C", status: "OK" },
              { wh: "Warehouse B — Alex", temp: "7.8°C", status: "Alert" },
              { wh: "Warehouse C — Delta", temp: "3.1°C", status: "OK" },
              { wh: "Hub — Giza", temp: "5.6°C", status: "OK" },
            ].map((w) => (
              <div key={w.wh} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className={`h-4 w-4 ${w.status === "OK" ? "text-green-600" : "text-amber-600"}`} />
                  <span>{w.wh}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{w.temp}</span>
                  <Badge variant={w.status === "OK" ? "success" : "destructive"}>{w.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Low-Stock & Expiring Batches</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { product: "Cardioprex 500mg", batch: "B-24-088", exp: "45 days", issue: "Expiring" },
              { product: "Diabetex XR 1000mg", batch: "B-24-112", exp: "72 days", issue: "Expiring" },
              { product: "Nervocalm 10mg", batch: "B-25-001", qty: "12% of reorder", issue: "Low Stock" },
              { product: "Antibio-Z 1g", batch: "B-24-067", exp: "28 days", issue: "Critical" },
            ].map((b, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.product}</div>
                  <div className="text-xs text-muted-foreground">{b.batch} · {b.exp ?? b.qty}</div>
                </div>
                <Badge variant={b.issue === "Critical" ? "destructive" : "secondary"}>{b.issue}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "Inventory", icon: Package, href: "/erp/inventory" },
        { label: "Procurement", icon: ShoppingCart, href: "/erp/procurement" },
        { label: "Returns", icon: ArrowDownRight, href: "/erp/returns" },
        { label: "Tasks", icon: ClipboardList, href: "/tasks" },
        { label: "Messages", icon: MessageSquare, href: "/messages" },
        { label: "Profile", icon: Users, href: "/settings/profile" },
      ]} />
    </div>
  );
}

function HRDashboard() {
  const { user } = useCurrentUser();
  const store = useApiDataStore();
  const openTasks = safeArr<any>(store.tasks).filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="People operations, recruitment, and GMP training"
        badge="HR MANAGER"
      />

      {/* Operational Alerts */}
      <OperationalAlertsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Headcount" value={safeArr<any>(store.employees).length} delta={`${safeArr<any>(store.employees).filter(e => e.status === "ACTIVE").length} active`} trend="up" icon={Users} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Open Positions" value={safeArr<any>(store.jobs).filter(j => j.status === "OPEN").length} icon={Briefcase} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Total Candidates" value={safeArr<any>(store.candidates).length} delta={`${safeArr<any>(store.candidates).filter(c => c.status === "INTERVIEW").length} interviewing`} trend="up" icon={UserPlus} color="bg-green-100 text-green-600" />
        <KpiCard label="Active Projects" value={safeArr<any>(store.projects).filter(p => p.status === "In Progress").length} icon={Calendar} color="bg-amber-100 text-amber-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recruiting Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const).map((stage) => (
              <div key={stage} className="flex items-center justify-between">
                <span>{stage.charAt(0) + stage.slice(1).toLowerCase()}</span>
                <Badge variant="secondary">{safeArr<any>(store.candidates).filter(c => c.status === stage).length}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming Trainings</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { title: "GMP Refresher", date: "Apr 15", attendees: 24 },
              { title: "GDP Cold Chain", date: "Apr 18", attendees: 12 },
              { title: "Pharmacovigilance 101", date: "Apr 22", attendees: 18 },
              { title: "ALCOA+ Data Integrity", date: "Apr 29", attendees: 32 },
            ].map((t) => (
              <div key={t.title} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                </div>
                <Badge variant="secondary">{t.attendees} attendees</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "Employees", icon: Users, href: "/erp/hr" },
        { label: "Jobs", icon: Briefcase, href: "/ats/jobs" },
        { label: "Candidates", icon: UserPlus, href: "/ats/candidates" },
        { label: "Interviews", icon: Calendar, href: "/ats/interviews" },
        { label: "Onboarding", icon: CheckCircle, href: "/ats/onboarding" },
        { label: "Training", icon: GraduationCap, href: "/ats/training" },
      ]} />
    </div>
  );
}

// ─── Router ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useCurrentUser();
  switch (user.role) {
    case "ADMIN": return <AdminDashboard />;
    case "BUM": return <BUMDashboard />;
    case "MARKETEER": return <MarketeerDashboard />;
    case "DISTRICT_MANAGER": return <DistrictManagerDashboard />;
    case "MEDICAL_REP": return <MedicalRepDashboard />;
    case "ACCOUNTANT": return <AccountantDashboard />;
    case "WAREHOUSE": return <WarehouseDashboard />;
    case "HR": return <HRDashboard />;
    default:
      return (
        <div className="p-6">
          <Card>
            <CardHeader><CardTitle>Welcome</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Role: {ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role}</p>
              <Button asChild className="mt-4"><Link href="/settings/profile">Go to profile</Link></Button>
            </CardContent>
          </Card>
        </div>
      );
  }
}
