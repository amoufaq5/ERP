"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import { useAppConfig } from "@/lib/config-context";
import { useDataStore } from "@/lib/data-store";

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

// ─── Role-specific dashboards ────────────────────────────────────────────────

function AdminDashboard() {
  const { user } = useCurrentUser();
  const store = useDataStore();
  const totalRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const totalCustomers = store.customers.length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Full pharmaceutical enterprise overview — all modules, all users"
        badge="ADMINISTRATOR"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue (YTD)" value={fmtM(totalRevenue)} delta="+14.2%" trend="up" icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Customers" value={totalCustomers} delta="+8.3%" trend="up" icon={Users} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Employees" value={store.employees.length} icon={Users} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Open Positions" value={store.jobs.filter(j => j.status === "OPEN").length} delta={`${store.candidates.length} applicants`} trend="up" icon={Briefcase} color="bg-orange-100 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
  const { user } = useCurrentUser();
  const store = useDataStore();
  const buRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const buCount = store.businessUnits.length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="National business unit performance — Pharma Egypt"
        badge="BUSINESS UNIT MANAGER"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="BU Revenue (YTD)" value={fmtM(buRevenue)} delta="+14.2%" trend="up" icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Business Units" value={buCount} delta="+6%" trend="up" icon={Target} color="bg-blue-100 text-blue-600" />
        <KpiCard label="National Coverage" value="87%" delta="+2.1%" trend="up" icon={MapPin} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Field Force" value={64} delta="4 new" trend="up" icon={Users} color="bg-orange-100 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Marketeer Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: "Yasmin Salem — North", achievement: 112, coverage: 91 },
              { name: "Omar Hassan — South", achievement: 98, coverage: 84 },
              { name: "Nour Abdel-Latif — Delta", achievement: 104, coverage: 88 },
            ].map((m) => (
              <div key={m.name} className="space-y-1">
                <div className="flex justify-between"><span>{m.name}</span><span className="font-semibold">{m.achievement}%</span></div>
                <div className="h-2 bg-muted rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(m.achievement, 120)}%` }} /></div>
                <div className="text-xs text-muted-foreground">Coverage: {m.coverage}%</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Sales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: "Cardioprex 500mg", sales: "EGP 8.2M", pct: 92 },
              { name: "Diabetex XR", sales: "EGP 6.4M", pct: 76 },
              { name: "Nervocalm 10mg", sales: "EGP 5.1M", pct: 61 },
              { name: "Antibio-Z 1g", sales: "EGP 4.8M", pct: 58 },
            ].map((p) => (
              <div key={p.name} className="space-y-1">
                <div className="flex justify-between"><span>{p.name}</span><span className="font-semibold">{p.sales}</span></div>
                <div className="h-2 bg-muted rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${p.pct}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "Accounting", icon: Receipt, href: "/erp/accounting" },
        { label: "Collections", icon: Landmark, href: "/erp/collections" },
        { label: "BUM View", icon: Target, href: "/crm/bum" },
        { label: "Reports", icon: FileText, href: "/reports" },
      ]} />
    </div>
  );
}

function MarketeerDashboard() {
  const { user } = useCurrentUser();
  const store = useDataStore();
  const regionRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const doctorCount = store.doctors.length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Regional marketing performance — ${user.territory ?? "All Territories"}`}
        badge="MARKETEER"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Region Revenue" value={fmtM(regionRevenue)} delta="+11.4%" trend="up" icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Coverage" value="91%" delta="+3.2%" trend="up" icon={MapPin} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Doctors" value={doctorCount} icon={Users} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Medical Reps" value={18} delta="2 new" trend="up" icon={Stethoscope} color="bg-orange-100 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">District Manager Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: "Ahmed Mostafa — Cairo North", achievement: 108 },
              { name: "Mariam Fouad — Cairo South", achievement: 95 },
              { name: "Tarek Samir — Giza", achievement: 102 },
              { name: "Rania El-Kady — Alexandria", achievement: 89 },
            ].map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex justify-between"><span>{d.name}</span><span className="font-semibold">{d.achievement}%</span></div>
                <div className="h-2 bg-muted rounded-full"><div className={`h-full rounded-full ${d.achievement >= 100 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${Math.min(d.achievement, 120)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Market Activities</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Doctor visits (MTD)</span><span className="font-semibold">1,284</span></div>
            <div className="flex justify-between"><span>New doctors added</span><span className="font-semibold">34</span></div>
            <div className="flex justify-between"><span>Pharmacy visits</span><span className="font-semibold">412</span></div>
            <div className="flex justify-between"><span>Market requests raised</span><span className="font-semibold">27</span></div>
            <div className="flex justify-between"><span>CME events sponsored</span><span className="font-semibold">3</span></div>
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "My Region", icon: MapPin, href: "/crm/marketeer" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Market Requests", icon: FileText, href: "/crm/market-requests" },
        { label: "Messages", icon: MessageSquare, href: "/messages" },
      ]} />
    </div>
  );
}

function DistrictManagerDashboard() {
  const { user } = useCurrentUser();
  const store = useDataStore();
  const districtRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const totalVisits = store.visits.length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`District team performance — ${user.territory ?? "District"}`}
        badge="DISTRICT MANAGER"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="District Revenue (MTD)" value={fmtM(districtRevenue)} delta="+8.1%" trend="up" icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Team Coverage" value="88%" delta="+1.5%" trend="up" icon={MapPin} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Medical Reps" value={6} icon={Users} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Total Visits" value={totalVisits} delta="+6" trend="up" icon={Calendar} color="bg-orange-100 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Medical Rep Team</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: "Mohamed El-Sayed", visits: 9, target: 8, coverage: 94 },
              { name: "Nadia Hamdy", visits: 8, target: 8, coverage: 88 },
              { name: "Youssef Rashad", visits: 7, target: 8, coverage: 82 },
              { name: "Heba El-Gendy", visits: 10, target: 8, coverage: 96 },
              { name: "Mostafa Kamal", visits: 6, target: 8, coverage: 78 },
            ].map((r) => (
              <div key={r.name} className="flex items-center justify-between">
                <div>
                  <div>{r.name}</div>
                  <div className="text-xs text-muted-foreground">Coverage: {r.coverage}%</div>
                </div>
                <Badge variant={r.visits >= r.target ? "success" : "secondary"}>
                  {r.visits}/{r.target} visits
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">District KPIs (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total visits</span><span className="font-semibold">428</span></div>
            <div className="flex justify-between"><span>Unique doctors visited</span><span className="font-semibold">187</span></div>
            <div className="flex justify-between"><span>New doctor listings</span><span className="font-semibold">12</span></div>
            <div className="flex justify-between"><span>Samples distributed</span><span className="font-semibold">1,240</span></div>
            <div className="flex justify-between"><span>Market requests</span><span className="font-semibold">8</span></div>
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "My Team", icon: Users, href: "/crm/district-manager" },
        { label: "Medical Reps", icon: Stethoscope, href: "/crm/medical-rep" },
        { label: "GPS Tracking", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "CRM Reports", icon: TrendingUp, href: "/crm/reports" },
        { label: "Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Tasks", icon: ClipboardList, href: "/tasks" },
      ]} />
    </div>
  );
}

function MedicalRepDashboard() {
  const { user } = useCurrentUser();
  const store = useDataStore();
  const myVisits = store.visits.filter((v) => v.repId === user.id);
  const myDoctors = store.doctors.filter((d) => d.assignedRepId === user.id);
  const myTasks = store.tasks.filter((t) => t.assignedToId === user.id && t.status !== "DONE");
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Your daily field activity — ${user.territory ?? "Territory"}`}
        badge="MEDICAL REP"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Visits" value={myVisits.length} icon={Calendar} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Open Tasks" value={myTasks.length} delta="+4%" trend="up" icon={Target} color="bg-green-100 text-green-600" />
        <KpiCard label="My Doctors" value={myDoctors.length} icon={Stethoscope} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Samples Left" value={124} icon={Package} color="bg-orange-100 text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Today&apos;s Planned Visits</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { doctor: "Dr. Ahmed El-Gamal", specialty: "Cardiologist", time: "10:00 AM", status: "Completed" },
              { doctor: "Dr. Salma Ibrahim", specialty: "Endocrinologist", time: "11:30 AM", status: "Completed" },
              { doctor: "Dr. Mahmoud Adel", specialty: "GP", time: "1:00 PM", status: "In Progress" },
              { doctor: "Dr. Rania Farouk", specialty: "Pediatrician", time: "2:30 PM", status: "Pending" },
              { doctor: "Dr. Khaled Samy", specialty: "Internist", time: "4:00 PM", status: "Pending" },
            ].map((v) => (
              <div key={v.doctor} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{v.doctor}</div>
                  <div className="text-xs text-muted-foreground">{v.specialty} · {v.time}</div>
                </div>
                <Badge variant={v.status === "Completed" ? "success" : v.status === "In Progress" ? "default" : "secondary"}>
                  {v.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">My Performance (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Visits completed</span><span className="font-semibold">168</span></div>
            <div className="flex justify-between"><span>Unique doctors</span><span className="font-semibold">72</span></div>
            <div className="flex justify-between"><span>New listings</span><span className="font-semibold">4</span></div>
            <div className="flex justify-between"><span>Coverage %</span><span className="font-semibold text-green-600">94%</span></div>
            <div className="flex justify-between"><span>Market requests</span><span className="font-semibold">2</span></div>
            <div className="flex justify-between"><span>CME invites sent</span><span className="font-semibold">9</span></div>
          </CardContent>
        </Card>
      </div>
      <QuickActions items={[
        { label: "Check-in", icon: MapPin, href: "/crm/gps-tracking" },
        { label: "My Doctors", icon: Stethoscope, href: "/crm/doctors" },
        { label: "Log Visit", icon: ClipboardList, href: "/crm/medical-rep" },
        { label: "Market Requests", icon: FileText, href: "/crm/market-requests" },
        { label: "Tasks", icon: ClipboardList, href: "/tasks" },
        { label: "Messages", icon: MessageSquare, href: "/messages" },
      ]} />
    </div>
  );
}

function AccountantDashboard() {
  const { user } = useCurrentUser();
  const { config } = useAppConfig();
  const store = useDataStore();
  const arOutstanding = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const apOutstanding = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const bankBalance = store.bankAccounts
    .filter((b) => b.currency === "EGP" && b.status === "ACTIVE")
    .reduce((s, b) => s + b.balance, 0);
  const chequesPending = store.cheques.filter((c) => c.status === "PENDING").length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={`Financial operations — ${config.accounting.chartType} Chart of Accounts`}
        badge="ACCOUNTANT"
      />
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
            {[...store.customers]
              .filter((c) => c.outstanding > 0)
              .sort((a, b) => b.outstanding - a.outstanding)
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
  const store = useDataStore();
  const openTasks = store.tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").length;
  return (
    <div className="p-6 space-y-6">
      <RoleHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="People operations, recruitment, and GMP training"
        badge="HR MANAGER"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Headcount" value={store.employees.length} delta={`${store.employees.filter(e => e.status === "ACTIVE").length} active`} trend="up" icon={Users} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Open Positions" value={store.jobs.filter(j => j.status === "OPEN").length} icon={Briefcase} color="bg-purple-100 text-purple-600" />
        <KpiCard label="Total Candidates" value={store.candidates.length} delta={`${store.candidates.filter(c => c.status === "INTERVIEW").length} interviewing`} trend="up" icon={UserPlus} color="bg-green-100 text-green-600" />
        <KpiCard label="Active Projects" value={store.projects.filter(p => p.status === "In Progress").length} icon={Calendar} color="bg-amber-100 text-amber-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recruiting Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const).map((stage) => (
              <div key={stage} className="flex items-center justify-between">
                <span>{stage.charAt(0) + stage.slice(1).toLowerCase()}</span>
                <Badge variant="secondary">{store.candidates.filter(c => c.status === stage).length}</Badge>
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
