"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
  AlertCircle,
  FileText,
  UserPlus,
  ShoppingCart,
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
  { name: "Prospecting", value: 12, color: "#3b82f6" },
  { name: "Qualification", value: 8, color: "#8b5cf6" },
  { name: "Proposal", value: 6, color: "#f59e0b" },
  { name: "Negotiation", value: 4, color: "#10b981" },
  { name: "Closed Won", value: 15, color: "#22c55e" },
];

const activities = [
  {
    icon: <FileText className="h-4 w-4 text-blue-600" />,
    iconBg: "bg-blue-100",
    description: "New invoice #INV-2024-089 created",
    time: "5 min ago",
  },
  {
    icon: <Users className="h-4 w-4 text-purple-600" />,
    iconBg: "bg-purple-100",
    description: "Lead converted: Acme Corp",
    time: "15 min ago",
  },
  {
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    iconBg: "bg-green-100",
    description: "Ticket #TK-445 resolved",
    time: "1 hour ago",
  },
  {
    icon: <UserPlus className="h-4 w-4 text-orange-600" />,
    iconBg: "bg-orange-100",
    description: "New candidate applied: Senior Dev",
    time: "2 hours ago",
  },
  {
    icon: <ShoppingCart className="h-4 w-4 text-teal-600" />,
    iconBg: "bg-teal-100",
    description: "PO #PO-2024-034 approved",
    time: "3 hours ago",
  },
  {
    icon: <Briefcase className="h-4 w-4 text-indigo-600" />,
    iconBg: "bg-indigo-100",
    description: "Employee onboarding: Lisa Park",
    time: "4 hours ago",
  },
];

const tickets = [
  {
    priority: "CRITICAL",
    priorityColor: "bg-red-500",
    subject: "Payment gateway down",
    account: "Global Retail Inc.",
    time: "10 min ago",
  },
  {
    priority: "HIGH",
    priorityColor: "bg-orange-500",
    subject: "Data sync failure on CRM",
    account: "TechVision Ltd.",
    time: "45 min ago",
  },
  {
    priority: "MEDIUM",
    priorityColor: "bg-blue-500",
    subject: "Report generation slow",
    account: "Pinnacle Solutions",
    time: "2 hours ago",
  },
  {
    priority: "HIGH",
    priorityColor: "bg-orange-500",
    subject: "Invoice not sending emails",
    account: "Brightway Co.",
    time: "3 hours ago",
  },
  {
    priority: "LOW",
    priorityColor: "bg-gray-400",
    subject: "UI alignment issue on dashboard",
    account: "Nova Enterprises",
    time: "5 hours ago",
  },
];

const interviews = [
  {
    candidate: "Jordan Mitchell",
    position: "Senior Frontend Engineer",
    date: "Apr 1, 2026 – 10:00 AM",
    type: "VIDEO",
    typeBg: "bg-blue-100 text-blue-700",
  },
  {
    candidate: "Priya Nair",
    position: "Product Manager",
    date: "Apr 2, 2026 – 2:00 PM",
    type: "ONSITE",
    typeBg: "bg-green-100 text-green-700",
  },
  {
    candidate: "Marcus Chen",
    position: "DevOps Engineer",
    date: "Apr 3, 2026 – 11:30 AM",
    type: "PHONE",
    typeBg: "bg-gray-100 text-gray-700",
  },
  {
    candidate: "Amara Osei",
    position: "UX Designer",
    date: "Apr 4, 2026 – 9:00 AM",
    type: "VIDEO",
    typeBg: "bg-blue-100 text-blue-700",
  },
];

const quickActions = [
  {
    label: "New Invoice",
    icon: <FileText className="h-5 w-5" />,
    href: "/erp",
  },
  {
    label: "New Lead",
    icon: <Users className="h-5 w-5" />,
    href: "/crm",
  },
  {
    label: "Post Job",
    icon: <Briefcase className="h-5 w-5" />,
    href: "/ats",
  },
  {
    label: "Create PO",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/erp",
  },
  {
    label: "Add Employee",
    icon: <UserPlus className="h-5 w-5" />,
    href: "/erp",
  },
  {
    label: "Generate Report",
    icon: <TrendingUp className="h-5 w-5" />,
    href: "/reports",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Unified overview of your ERP, CRM, and ATS systems
        </p>
      </div>

      {/* Row 1 – KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">
                  Total Revenue
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  $2,845,000
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +12.5%
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">
                  Active Customers
                </span>
                <span className="text-2xl font-bold text-gray-900">1,247</span>
                <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +8.3%
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Positions */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">
                  Open Positions
                </span>
                <span className="text-2xl font-bold text-gray-900">23</span>
                <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                  <ArrowDownRight className="h-4 w-4" />
                  -2.1%
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Count */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">
                  Employee Count
                </span>
                <span className="text-2xl font-bold text-gray-900">156</span>
                <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +4.7%
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 – Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Overview BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={revenueData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) =>
                    `$${Number(value).toLocaleString()}`
                  }
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Pipeline PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Sales Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} deals`, ""]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 – Activities / Tickets / Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activity.iconBg}`}
                >
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    {activity.description}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Open Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tickets.map((ticket, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ticket.priorityColor}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {ticket.account}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {ticket.time}
                    <span className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase bg-gray-100 text-gray-600">
                      {ticket.priority}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interviews.map((interview, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">
                    {interview.candidate}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {interview.position}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {interview.date}
                    </p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${interview.typeBg}`}
                    >
                      {interview.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 – Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href}>
                <button className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
