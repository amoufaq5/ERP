"use client"

import { useState } from "react"
import { BarChart3, Clock, Star, Calendar, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const revenueData = [
  { month: "Apr", revenue: 380000 }, { month: "May", revenue: 420000 }, { month: "Jun", revenue: 395000 },
  { month: "Jul", revenue: 450000 }, { month: "Aug", revenue: 480000 }, { month: "Sep", revenue: 510000 },
  { month: "Oct", revenue: 475000 }, { month: "Nov", revenue: 520000 }, { month: "Dec", revenue: 560000 },
  { month: "Jan", revenue: 445000 }, { month: "Feb", revenue: 530000 }, { month: "Mar", revenue: 570000 },
]

const reportCategories = [
  {
    title: "Financial Reports",
    color: "border-l-green-500",
    reports: [
      { name: "Profit & Loss Statement", description: "Income and expenses summary", lastRun: "Today" },
      { name: "Balance Sheet", description: "Assets, liabilities, and equity", lastRun: "Yesterday" },
      { name: "Cash Flow Statement", description: "Cash inflows and outflows", lastRun: "Mar 25" },
      { name: "Accounts Receivable Aging", description: "Outstanding customer payments", lastRun: "Mar 24" },
      { name: "Accounts Payable Aging", description: "Outstanding vendor payments", lastRun: "Mar 23" },
    ],
  },
  {
    title: "Sales Reports",
    color: "border-l-blue-500",
    reports: [
      { name: "Pipeline Analysis", description: "Opportunities by stage and value", lastRun: "Today" },
      { name: "Win/Loss Analysis", description: "Deal outcomes and trends", lastRun: "Mar 20" },
      { name: "Revenue by Account", description: "Top accounts by revenue", lastRun: "Mar 18" },
      { name: "Activity Summary", description: "Sales team activities and metrics", lastRun: "Mar 22" },
    ],
  },
  {
    title: "HR Reports",
    color: "border-l-purple-500",
    reports: [
      { name: "Headcount Report", description: "Employee count by department", lastRun: "Mar 21" },
      { name: "Turnover Analysis", description: "Employee retention metrics", lastRun: "Mar 15" },
      { name: "Leave Analysis", description: "Leave patterns and balances", lastRun: "Mar 19" },
      { name: "Payroll Summary", description: "Monthly payroll breakdown", lastRun: "Mar 25" },
    ],
  },
  {
    title: "Recruitment Reports",
    color: "border-l-orange-500",
    reports: [
      { name: "Time to Hire", description: "Average days from posting to hire", lastRun: "Mar 20" },
      { name: "Source Effectiveness", description: "Best performing recruitment channels", lastRun: "Mar 18" },
      { name: "Pipeline Funnel", description: "Candidates by stage breakdown", lastRun: "Mar 22" },
    ],
  },
]

function RevenueAreaChart() {
  const maxVal = Math.max(...revenueData.map(d => d.revenue));
  const minVal = Math.min(...revenueData.map(d => d.revenue));
  const range = maxVal - minVal || 1;

  // Build SVG polyline points for area chart
  const width = 800;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = revenueData.map((d, i) => {
    const x = padding.left + (i / (revenueData.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.revenue - minVal * 0.9) / (maxVal * 1.1 - minVal * 0.9)) * chartH;
    return { x, y, ...d };
  });

  const linePoints = points.map(p => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${padding.top + chartH} ${linePoints} ${points[points.length - 1].x},${padding.top + chartH}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[300px]">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          const val = minVal * 0.9 + (maxVal * 1.1 - minVal * 0.9) * pct;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">${(val / 1000).toFixed(0)}k</text>
            </g>
          );
        })}
        {/* Area fill */}
        <polygon points={areaPoints} fill="#93c5fd" fillOpacity="0.3" />
        {/* Line */}
        <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Dots and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <text x={p.x} y={padding.top + chartH + 20} textAnchor="middle" className="text-[10px] fill-gray-500">{p.month}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1><p className="text-gray-500">Generate and analyze business intelligence reports</p></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><BarChart3 className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Reports</p><p className="text-2xl font-bold">16</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Calendar className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Scheduled</p><p className="text-2xl font-bold">4</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Star className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-gray-500">Favorites</p><p className="text-2xl font-bold">6</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Clock className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Last Generated</p><p className="text-2xl font-bold">Today</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Trend (12 Months)</CardTitle></CardHeader>
        <CardContent>
          <RevenueAreaChart />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {reportCategories.map(cat => (
          <Card key={cat.title} className={`border-l-4 ${cat.color}`}>
            <CardHeader><CardTitle>{cat.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.reports.map(report => (
                  <div key={report.name} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <h4 className="font-medium">{report.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400"><Clock className="h-3 w-3 inline mr-1" />Last: {report.lastRun}</span>
                      <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" />Generate</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
