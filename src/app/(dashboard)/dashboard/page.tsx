"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Database,
} from "lucide-react";
import Link from "next/link";

const revenueData = [
  { month: "Oct", revenue: 420000, expenses: 310000 },
  { month: "Nov", revenue: 480000, expenses: 340000 },
  { month: "Dec", revenue: 510000, expenses: 360000 },
  { month: "Jan", revenue: 445000, expenses: 320000 },
  { month: "Feb", revenue: 520000, expenses: 350000 },
  { month: "Mar", revenue: 570000, expenses: 380000 },
];

const pipelineData = [
  { name: "Prospecting", value: 12, color: "bg-blue-500" },
  { name: "Qualification", value: 8, color: "bg-purple-500" },
  { name: "Proposal", value: 6, color: "bg-amber-500" },
  { name: "Negotiation", value: 4, color: "bg-emerald-500" },
  { name: "Closed Won", value: 15, color: "bg-green-500" },
];

const activities = [
  { icon: FileText, iconColor: "text-blue-600", iconBg: "bg-blue-100", description: "New invoice #INV-2024-089 created", time: "5 min ago" },
  { icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-100", description: "Lead converted: Acme Corp", time: "15 min ago" },
  { icon: CheckCircle, iconColor: "text-green-600", iconBg: "bg-green-100", description: "Ticket #TK-445 resolved", time: "1 hour ago" },
  { icon: UserPlus, iconColor: "text-orange-600", iconBg: "bg-orange-100", description: "New candidate applied: Senior Dev", time: "2 hours ago" },
  { icon: ShoppingCart, iconColor: "text-teal-600", iconBg: "bg-teal-100", description: "PO #PO-2024-034 approved", time: "3 hours ago" },
  { icon: Briefcase, iconColor: "text-indigo-600", iconBg: "bg-indigo-100", description: "Employee onboarding: Lisa Park", time: "4 hours ago" },
];

const tickets = [
  { priority: "CRITICAL", priorityColor: "bg-red-500", subject: "Payment gateway down", account: "Global Retail Inc.", time: "10 min ago" },
  { priority: "HIGH", priorityColor: "bg-orange-500", subject: "Data sync failure on CRM", account: "TechVision Ltd.", time: "45 min ago" },
  { priority: "MEDIUM", priorityColor: "bg-blue-500", subject: "Report generation slow", account: "Pinnacle Solutions", time: "2 hours ago" },
  { priority: "HIGH", priorityColor: "bg-orange-500", subject: "Invoice not sending emails", account: "Brightway Co.", time: "3 hours ago" },
  { priority: "LOW", priorityColor: "bg-gray-400", subject: "UI alignment issue", account: "Nova Enterprises", time: "5 hours ago" },
];

const interviews = [
  { candidate: "Jordan Mitchell", position: "Senior Frontend Engineer", date: "Apr 1, 2026 – 10:00 AM", type: "VIDEO", typeBg: "bg-blue-100 text-blue-700" },
  { candidate: "Priya Nair", position: "Product Manager", date: "Apr 2, 2026 – 2:00 PM", type: "ONSITE", typeBg: "bg-green-100 text-green-700" },
  { candidate: "Marcus Chen", position: "DevOps Engineer", date: "Apr 3, 2026 – 11:30 AM", type: "PHONE", typeBg: "bg-gray-100 text-gray-700" },
  { candidate: "Amara Osei", position: "UX Designer", date: "Apr 4, 2026 – 9:00 AM", type: "VIDEO", typeBg: "bg-blue-100 text-blue-700" },
];

const quickActions = [
  { label: "New Invoice", icon: FileText, href: "/erp/finance" },
  { label: "New Lead", icon: Users, href: "/crm/leads" },
  { label: "Post Job", icon: Briefcase, href: "/ats/jobs" },
  { label: "Create PO", icon: ShoppingCart, href: "/erp/procurement" },
  { label: "Messages", icon: MessageSquare, href: "/messages" },
  { label: "My Tasks", icon: ClipboardList, href: "/tasks" },
  { label: "Add Employee", icon: UserPlus, href: "/erp/hr" },
  { label: "Import Data", icon: Database, href: "/data-upload" },
];

function RevenueChart() {
  const maxVal = Math.max(...revenueData.flatMap(d => [d.revenue, d.expenses]));
  return (
    <div className="h-[300px] flex items-end gap-3 px-2 pt-4 pb-8 relative">
      <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 w-10">
        <span>${(maxVal / 1000).toFixed(0)}k</span>
        <span>${(maxVal / 2000).toFixed(0)}k</span>
        <span>$0</span>
      </div>
      <div className="flex-1 flex items-end gap-2 ml-10">
        {revenueData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end justify-center" style={{ height: "220px" }}>
              <div className="flex-1 max-w-[24px] bg-blue-500 rounded-t transition-all hover:bg-blue-600" style={{ height: `${(d.revenue / maxVal) * 100}%` }} title={`Revenue: $${d.revenue.toLocaleString()}`} />
              <div className="flex-1 max-w-[24px] bg-slate-300 rounded-t transition-all hover:bg-slate-400" style={{ height: `${(d.expenses / maxVal) * 100}%` }} title={`Expenses: $${d.expenses.toLocaleString()}`} />
            </div>
            <span className="text-[11px] text-gray-500 mt-1">{d.month}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" />Revenue</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-slate-300" />Expenses</span>
      </div>
    </div>
  );
}

function PipelineChart() {
  const total = pipelineData.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-[300px] flex flex-col justify-center gap-3 px-4">
      {pipelineData.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-24 text-right truncate">{d.name}</span>
          <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${d.color} rounded-full flex items-center justify-end pr-3 transition-all`} style={{ width: `${(d.value / total) * 100}%` }}>
              <span className="text-[11px] font-semibold text-white">{d.value}</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 w-10">{Math.round((d.value / total) * 100)}%</span>
        </div>
      ))}
      <div className="text-center text-xs text-gray-400 mt-2">Total: {total} deals in pipeline</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Unified overview of your ERP, CRM, and ATS systems</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-500">Total Revenue</span><span className="text-2xl font-bold text-gray-900">$2,845,000</span><span className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+12.5%</span></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100"><DollarSign className="h-6 w-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-500">Active Customers</span><span className="text-2xl font-bold text-gray-900">1,247</span><span className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+8.3%</span></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"><Users className="h-6 w-6 text-blue-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-500">Open Positions</span><span className="text-2xl font-bold text-gray-900">23</span><span className="flex items-center gap-1 text-sm font-medium text-red-600"><ArrowDownRight className="h-4 w-4" />-2.1%</span></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100"><Briefcase className="h-6 w-6 text-purple-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-500">Employee Count</span><span className="text-2xl font-bold text-gray-900">156</span><span className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+4.7%</span></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100"><TrendingUp className="h-6 w-6 text-orange-600" /></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base font-semibold">Revenue Overview</CardTitle></CardHeader><CardContent><RevenueChart /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold">Sales Pipeline</CardTitle></CardHeader><CardContent><PipelineChart /></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Recent Activities</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {activities.map((a, i) => { const Icon = a.icon; return (
              <div key={i} className="flex items-start gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg}`}><Icon className={`h-4 w-4 ${a.iconColor}`} /></div><div className="flex-1 min-w-0"><p className="text-sm text-gray-800 leading-snug">{a.description}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{a.time}</p></div></div>
            ); })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Open Tickets</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {tickets.map((t, i) => (
              <div key={i} className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.priorityColor}`} /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 leading-snug truncate">{t.subject}</p><p className="text-xs text-gray-500 truncate">{t.account}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{t.time}<span className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase bg-gray-100 text-gray-600">{t.priority}</span></p></div></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {interviews.map((iv, i) => (
              <div key={i} className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100"><Users className="h-4 w-4 text-indigo-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 leading-snug">{iv.candidate}</p><p className="text-xs text-gray-500 truncate">{iv.position}</p><div className="mt-1 flex items-center gap-2"><p className="flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{iv.date}</p><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${iv.typeBg}`}>{iv.type}</span></div></div></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickActions.map((action, i) => { const Icon = action.icon; return (
              <Link key={i} href={action.href}><div className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"><Icon className="h-5 w-5" /><span className="text-xs">{action.label}</span></div></Link>
            ); })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
