"use client"

import { useState } from "react"
import {
  Target,
  DollarSign,
  Users,
  Factory,
  TrendingUp,
  Monitor,
  ShieldAlert,
  Boxes,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"

const initialStrategicGoals = [
  { id: "SG-001", goal: "Expand APAC Market Presence", owner: "Sarah Chen", department: "Sales", target: "15% revenue share", progress: 72, status: "On Track", deadline: "2026-12-31" },
  { id: "SG-002", goal: "Launch Digital Transformation Initiative", owner: "James Rivera", department: "IT", target: "80% process automation", progress: 45, status: "At Risk", deadline: "2026-09-30" },
  { id: "SG-003", goal: "Achieve ISO 14001 Certification", owner: "Maria Kowalski", department: "Operations", target: "Full compliance", progress: 88, status: "On Track", deadline: "2026-06-30" },
  { id: "SG-004", goal: "Reduce Customer Churn Rate", owner: "David Park", department: "Customer Success", target: "Below 5%", progress: 63, status: "On Track", deadline: "2026-12-31" },
  { id: "SG-005", goal: "Increase R&D Investment to 12% Revenue", owner: "Elena Vasquez", department: "R&D", target: "12% of revenue", progress: 34, status: "Behind", deadline: "2026-12-31" },
  { id: "SG-006", goal: "Establish Strategic Supplier Partnerships", owner: "Robert Tanaka", department: "Procurement", target: "8 tier-1 partners", progress: 75, status: "On Track", deadline: "2026-08-31" },
  { id: "SG-007", goal: "Deploy Predictive Analytics Platform", owner: "Anika Patel", department: "Data Science", target: "5 use cases live", progress: 52, status: "At Risk", deadline: "2026-10-31" },
  { id: "SG-008", goal: "Improve Employee Engagement Score", owner: "Thomas Müller", department: "HR", target: "Score above 4.2", progress: 81, status: "On Track", deadline: "2026-12-31" },
]

const departmentBudgets = [
  { department: "Engineering", allocated: 4850000, spent: 2945000, committed: 890000, remaining: 1015000, variance: -2.1, fy: "FY2026" },
  { department: "Sales & Marketing", allocated: 3200000, spent: 1890000, committed: 620000, remaining: 690000, variance: 3.4, fy: "FY2026" },
  { department: "Operations", allocated: 2750000, spent: 1620000, committed: 540000, remaining: 590000, variance: -0.8, fy: "FY2026" },
  { department: "Human Resources", allocated: 1450000, spent: 845000, committed: 310000, remaining: 295000, variance: 1.2, fy: "FY2026" },
  { department: "Finance & Accounting", allocated: 980000, spent: 578000, committed: 195000, remaining: 207000, variance: -1.5, fy: "FY2026" },
  { department: "Research & Development", allocated: 3600000, spent: 2105000, committed: 780000, remaining: 715000, variance: 4.7, fy: "FY2026" },
  { department: "Customer Support", allocated: 1250000, spent: 734000, committed: 268000, remaining: 248000, variance: -0.3, fy: "FY2026" },
  { department: "Legal & Compliance", allocated: 870000, spent: 512000, committed: 178000, remaining: 180000, variance: 0.9, fy: "FY2026" },
]

const workforceData = [
  { department: "Engineering", current: 142, planned: 165, openReqs: 12, attrition: 8.2, avgTenure: 3.4, contractors: 18 },
  { department: "Sales & Marketing", current: 98, planned: 110, openReqs: 8, attrition: 12.5, avgTenure: 2.8, contractors: 6 },
  { department: "Operations", current: 76, planned: 82, openReqs: 4, attrition: 6.1, avgTenure: 4.2, contractors: 22 },
  { department: "Human Resources", current: 24, planned: 26, openReqs: 2, attrition: 4.8, avgTenure: 5.1, contractors: 1 },
  { department: "Finance & Accounting", current: 32, planned: 34, openReqs: 1, attrition: 5.3, avgTenure: 4.7, contractors: 3 },
  { department: "Research & Development", current: 58, planned: 72, openReqs: 9, attrition: 7.6, avgTenure: 3.1, contractors: 8 },
  { department: "Customer Support", current: 45, planned: 52, openReqs: 5, attrition: 15.2, avgTenure: 1.9, contractors: 12 },
  { department: "Legal & Compliance", current: 14, planned: 15, openReqs: 1, attrition: 3.2, avgTenure: 6.3, contractors: 2 },
]

const productionOrders = [
  { id: "PO-2026-0451", product: "Hydraulic Actuator Assembly", quantity: 2400, line: "Line A", startDate: "2026-04-07", dueDate: "2026-04-28", status: "Scheduled", priority: "High" },
  { id: "PO-2026-0452", product: "Precision Gear Module v3", quantity: 1800, line: "Line B", startDate: "2026-04-02", dueDate: "2026-04-18", status: "In Progress", priority: "Critical" },
  { id: "PO-2026-0453", product: "Thermal Control Unit", quantity: 950, line: "Line C", startDate: "2026-04-10", dueDate: "2026-05-05", status: "Scheduled", priority: "Medium" },
  { id: "PO-2026-0454", product: "Industrial Sensor Array", quantity: 5200, line: "Line A", startDate: "2026-03-28", dueDate: "2026-04-15", status: "In Progress", priority: "High" },
  { id: "PO-2026-0455", product: "Power Distribution Board", quantity: 3100, line: "Line D", startDate: "2026-04-14", dueDate: "2026-05-02", status: "Pending Approval", priority: "Medium" },
  { id: "PO-2026-0456", product: "Robotic Arm Joint Assembly", quantity: 600, line: "Line B", startDate: "2026-04-05", dueDate: "2026-04-22", status: "In Progress", priority: "Critical" },
  { id: "PO-2026-0457", product: "Composite Housing Unit", quantity: 1500, line: "Line C", startDate: "2026-04-20", dueDate: "2026-05-12", status: "Scheduled", priority: "Low" },
  { id: "PO-2026-0458", product: "Micro-Controller PCB Rev4", quantity: 8000, line: "Line D", startDate: "2026-04-01", dueDate: "2026-04-12", status: "In Progress", priority: "High" },
]

const territoryPlans = [
  { territory: "North America - East", manager: "Katherine Brooks", targetRevenue: 8500000, currentRevenue: 3420000, accounts: 145, pipeline: 12400000, winRate: 32, qoqGrowth: 8.4 },
  { territory: "North America - West", manager: "Michael Santos", targetRevenue: 7200000, currentRevenue: 2980000, accounts: 118, pipeline: 9800000, winRate: 28, qoqGrowth: 5.2 },
  { territory: "EMEA - Northern Europe", manager: "Lars Johansson", targetRevenue: 5400000, currentRevenue: 2150000, accounts: 87, pipeline: 7600000, winRate: 35, qoqGrowth: 12.1 },
  { territory: "EMEA - Central Europe", manager: "Andrea Fischer", targetRevenue: 4800000, currentRevenue: 1890000, accounts: 72, pipeline: 6200000, winRate: 30, qoqGrowth: 6.8 },
  { territory: "APAC - Greater China", manager: "Wei Zhang", targetRevenue: 6100000, currentRevenue: 2340000, accounts: 96, pipeline: 8900000, winRate: 26, qoqGrowth: 18.5 },
  { territory: "APAC - Southeast Asia", manager: "Priya Sharma", targetRevenue: 3200000, currentRevenue: 1280000, accounts: 54, pipeline: 4500000, winRate: 24, qoqGrowth: 22.3 },
  { territory: "Latin America", manager: "Carlos Mendoza", targetRevenue: 2800000, currentRevenue: 1050000, accounts: 41, pipeline: 3800000, winRate: 22, qoqGrowth: 15.7 },
  { territory: "Middle East & Africa", manager: "Fatima Al-Hassan", targetRevenue: 1900000, currentRevenue: 720000, accounts: 28, pipeline: 2600000, winRate: 20, qoqGrowth: 9.3 },
]

const itProjects = [
  { id: "IT-301", project: "ERP System Migration to Cloud", lead: "James Rivera", phase: "Execution", budget: 1200000, spent: 680000, completion: 56, goLive: "2026-08-15", risk: "Medium" },
  { id: "IT-302", project: "Zero Trust Security Framework", lead: "Nina Petrov", phase: "Planning", budget: 450000, spent: 85000, completion: 18, goLive: "2026-11-01", risk: "Low" },
  { id: "IT-303", project: "Customer Data Platform Integration", lead: "Anika Patel", phase: "Execution", budget: 780000, spent: 520000, completion: 72, goLive: "2026-05-30", risk: "High" },
  { id: "IT-304", project: "AI-Powered Chatbot Deployment", lead: "Derek Wong", phase: "Testing", budget: 320000, spent: 275000, completion: 88, goLive: "2026-04-20", risk: "Low" },
  { id: "IT-305", project: "Data Warehouse Modernization", lead: "Samuel Okafor", phase: "Execution", budget: 950000, spent: 410000, completion: 42, goLive: "2026-09-30", risk: "Medium" },
  { id: "IT-306", project: "Mobile App Platform Rebuild", lead: "Lisa Chang", phase: "Design", budget: 560000, spent: 120000, completion: 22, goLive: "2026-12-15", risk: "High" },
  { id: "IT-307", project: "DevOps Pipeline Automation", lead: "Marcus Johnson", phase: "Execution", budget: 280000, spent: 195000, completion: 65, goLive: "2026-06-15", risk: "Low" },
  { id: "IT-308", project: "Disaster Recovery Site Upgrade", lead: "Rachel Kim", phase: "Planning", budget: 680000, spent: 95000, completion: 12, goLive: "2026-10-30", risk: "Medium" },
]

const enterpriseRisks = [
  { id: "ER-101", risk: "Supply Chain Disruption - Critical Components", category: "Operational", likelihood: "High", impact: "Critical", owner: "Robert Tanaka", mitigation: "Dual-source strategy", status: "Monitoring" },
  { id: "ER-102", risk: "Cybersecurity Breach - Customer Data", category: "Technology", likelihood: "Medium", impact: "Critical", owner: "Nina Petrov", mitigation: "Zero trust implementation", status: "Mitigating" },
  { id: "ER-103", risk: "Regulatory Non-Compliance - EU AI Act", category: "Compliance", likelihood: "Medium", impact: "High", owner: "Thomas Müller", mitigation: "Compliance audit program", status: "Monitoring" },
  { id: "ER-104", risk: "Key Talent Attrition - Engineering", category: "People", likelihood: "High", impact: "High", owner: "HR Leadership", mitigation: "Retention bonus program", status: "Active" },
  { id: "ER-105", risk: "Currency Fluctuation - APAC Revenue", category: "Financial", likelihood: "Medium", impact: "Medium", owner: "CFO Office", mitigation: "Hedging strategy", status: "Mitigating" },
  { id: "ER-106", risk: "Product Liability - Actuator Assembly", category: "Legal", likelihood: "Low", impact: "Critical", owner: "Legal Counsel", mitigation: "Enhanced QA protocols", status: "Monitoring" },
  { id: "ER-107", risk: "Market Entry Failure - Latin America", category: "Strategic", likelihood: "Medium", impact: "Medium", owner: "Carlos Mendoza", mitigation: "Phased rollout approach", status: "Active" },
  { id: "ER-108", risk: "IT Infrastructure Downtime", category: "Technology", likelihood: "Low", impact: "High", owner: "James Rivera", mitigation: "DR site upgrade", status: "Mitigating" },
]

const resourceAllocations = [
  { resource: "Senior Cloud Architects", department: "IT", totalFTE: 6, allocated: 5.5, available: 0.5, utilization: 92, topProject: "ERP Cloud Migration" },
  { resource: "Data Engineers", department: "Data Science", totalFTE: 8, allocated: 7.0, available: 1.0, utilization: 88, topProject: "Data Warehouse Modernization" },
  { resource: "Production Line Workers", department: "Operations", totalFTE: 48, allocated: 44, available: 4, utilization: 92, topProject: "Sensor Array Production" },
  { resource: "Sales Engineers", department: "Sales", totalFTE: 12, allocated: 10.5, available: 1.5, utilization: 88, topProject: "APAC Expansion" },
  { resource: "UX/UI Designers", department: "Engineering", totalFTE: 5, allocated: 5.0, available: 0, utilization: 100, topProject: "Mobile App Rebuild" },
  { resource: "QA Automation Engineers", department: "Engineering", totalFTE: 10, allocated: 8.5, available: 1.5, utilization: 85, topProject: "DevOps Pipeline" },
  { resource: "Financial Analysts", department: "Finance", totalFTE: 7, allocated: 6.0, available: 1.0, utilization: 86, topProject: "Budget Forecasting" },
  { resource: "Compliance Officers", department: "Legal", totalFTE: 4, allocated: 3.5, available: 0.5, utilization: 88, topProject: "EU AI Act Readiness" },
  { resource: "Mechanical Engineers", department: "R&D", totalFTE: 14, allocated: 12.5, available: 1.5, utilization: 89, topProject: "Robotic Arm v2" },
  { resource: "Customer Success Managers", department: "Customer Support", totalFTE: 9, allocated: 8.0, available: 1.0, utilization: 89, topProject: "Churn Reduction Program" },
]

function formatCurrency(value: number) {
  return `EGP ${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getStatusBadge(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "On Track": case "In Progress": case "Active": case "Mitigating": return "default"
    case "At Risk": case "High": case "Critical": return "destructive"
    case "Behind": case "Monitoring": return "secondary"
    default: return "outline"
  }
}

function getPriorityBadge(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "Critical": return "destructive"
    case "High": return "default"
    case "Medium": return "secondary"
    default: return "outline"
  }
}

const planFormFields: EntityField[] = [
  { name: "objective", label: "Objective", type: "text", required: true },
  { name: "kpi", label: "KPI / Department", type: "text", required: true },
  { name: "target", label: "Target", type: "text", required: true },
  { name: "owner", label: "Owner", type: "text", required: true },
  { name: "timeline", label: "Timeline", type: "text", required: true },
  { name: "status", label: "Status", type: "select", options: [
    { label: "On Track", value: "On Track" },
    { label: "At Risk", value: "At Risk" },
    { label: "Behind", value: "Behind" },
  ]},
]

export default function PlanningPage() {
  const [strategicGoals, setStrategicGoals] = useState(initialStrategicGoals)
  const [editingGoal, setEditingGoal] = useState<typeof initialStrategicGoals[0] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department Planning</h1>
          <p className="text-muted-foreground mt-1">Enterprise planning, budgets, workforce, and resource management</p>
        </div>
        <Button onClick={() => { setEditingGoal(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Strategic Goals</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">5 on track, 2 at risk, 1 behind</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">$18.95M</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">54.8% spent through Q1</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Headcount</p>
                <p className="text-2xl font-bold">489</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">42 open requisitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">89% average utilization</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="strategic" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="strategic"><Target className="mr-1.5 h-3.5 w-3.5" />Strategic</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="mr-1.5 h-3.5 w-3.5" />Financial</TabsTrigger>
          <TabsTrigger value="workforce"><Users className="mr-1.5 h-3.5 w-3.5" />Workforce</TabsTrigger>
          <TabsTrigger value="production"><Factory className="mr-1.5 h-3.5 w-3.5" />Production</TabsTrigger>
          <TabsTrigger value="sales"><TrendingUp className="mr-1.5 h-3.5 w-3.5" />Sales</TabsTrigger>
          <TabsTrigger value="it"><Monitor className="mr-1.5 h-3.5 w-3.5" />IT</TabsTrigger>
          <TabsTrigger value="risk"><ShieldAlert className="mr-1.5 h-3.5 w-3.5" />Risk</TabsTrigger>
          <TabsTrigger value="resource"><Boxes className="mr-1.5 h-3.5 w-3.5" />Resource</TabsTrigger>
        </TabsList>

        <TabsContent value="strategic">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Goals FY2026</CardTitle>
              <CardDescription>Enterprise-level strategic objectives and progress tracking</CardDescription>
              <FilterBar
                searchValue={filters._search}
                onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "status", label: "Status", type: "select", options: [
                  { label: "On Track", value: "On Track" }, { label: "At Risk", value: "At Risk" }, { label: "Behind", value: "Behind" },
                ]}]}
                values={filters}
                onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {strategicGoals.filter((g) => {
                  if (filters.status && g.status !== filters.status) return false;
                  if (filters._search) {
                    const q = filters._search.toLowerCase();
                    return g.goal.toLowerCase().includes(q) || g.owner.toLowerCase().includes(q) || g.department.toLowerCase().includes(q);
                  }
                  return true;
                }).map((goal) => (
                  <div key={goal.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{goal.id}</span>
                        <Badge variant={getStatusBadge(goal.status)}>{goal.status}</Badge>
                      </div>
                      <p className="font-medium truncate">{goal.goal}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{goal.owner} - {goal.department}</span>
                        <span>Target: {goal.target}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{goal.deadline}</span>
                      </div>
                    </div>
                    <div className="w-48 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${goal.progress >= 75 ? "bg-green-500" : goal.progress >= 50 ? "bg-blue-500" : goal.progress >= 25 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    <EditDeleteMenu
                      onEdit={() => { setEditingGoal(goal); setShowForm(true); }}
                      onDelete={() => setStrategicGoals(prev => prev.filter(g => g.id !== goal.id))}
                      itemLabel={goal.goal}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Department Budgets FY2026</CardTitle>
              <CardDescription>Allocated budgets, spending, and variance analysis by department</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "department", label: "Department", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "allocated", label: "Allocated", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "spent", label: "Spent", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "committed", label: "Committed", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "remaining", label: "Remaining", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "variance", label: "Variance", className: "text-right", render: (v: number) => (
                    <span className={`inline-flex items-center gap-1 ${v >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {v >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(v)}%
                    </span>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={departmentBudgets as unknown as Record<string, unknown>[]}
                
                emptyMessage="No budget data available."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workforce">
          <Card>
            <CardHeader>
              <CardTitle>Workforce Planning</CardTitle>
              <CardDescription>Headcount, hiring pipeline, and attrition metrics by department</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "department", label: "Department", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "current", label: "Current HC", className: "text-right" },
                  { key: "planned", label: "Planned HC", className: "text-right" },
                  { key: "openReqs", label: "Open Reqs", className: "text-right", render: (v: number) => (
                    <Badge variant={v >= 8 ? "destructive" : v >= 4 ? "secondary" : "outline"}>{v}</Badge>
                  )},
                  { key: "attrition", label: "Attrition %", className: "text-right", render: (v: number) => (
                    <span className={v > 10 ? "text-red-600 font-medium" : ""}>{v}%</span>
                  )},
                  { key: "avgTenure", label: "Avg Tenure (yr)", className: "text-right" },
                  { key: "contractors", label: "Contractors", className: "text-right" },
                ] as Column<Record<string, unknown>>[]}
                data={workforceData as unknown as Record<string, unknown>[]}
                
                emptyMessage="No workforce data available."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>Production Planning</CardTitle>
              <CardDescription>Active and scheduled production orders across manufacturing lines</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Order ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "product", label: "Product", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "quantity", label: "Qty", className: "text-right", render: (v: number) => v.toLocaleString() },
                  { key: "line", label: "Line" },
                  { key: "startDate", label: "Start" },
                  { key: "dueDate", label: "Due" },
                  { key: "status", label: "Status", render: (v: string) => <Badge variant={getStatusBadge(v)}>{v}</Badge> },
                  { key: "priority", label: "Priority", render: (v: string) => <Badge variant={getPriorityBadge(v)}>{v}</Badge> },
                ] as Column<Record<string, unknown>>[]}
                data={productionOrders as unknown as Record<string, unknown>[]}
                
                emptyMessage="No production orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Territory Sales Plans</CardTitle>
              <CardDescription>Revenue targets, pipeline, and growth metrics by sales territory</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "territory", label: "Territory", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "manager", label: "Manager" },
                  { key: "targetRevenue", label: "Target", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "currentRevenue", label: "Current", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "pipeline", label: "Pipeline", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "winRate", label: "Win Rate", className: "text-right", render: (v: number) => `${v}%` },
                  { key: "qoqGrowth", label: "QoQ Growth", className: "text-right", render: (v: number) => (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />{v}%
                    </span>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={territoryPlans as unknown as Record<string, unknown>[]}
                
                emptyMessage="No territory plans found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="it">
          <Card>
            <CardHeader>
              <CardTitle>IT Projects Roadmap</CardTitle>
              <CardDescription>Technology initiatives, budget tracking, and delivery timelines</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "project", label: "Project", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "lead", label: "Lead" },
                  { key: "phase", label: "Phase", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "budget", label: "Budget", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "spent", label: "Spent", className: "text-right", render: (v: number) => formatCurrency(v) },
                  { key: "completion", label: "Completion", className: "text-right", render: (v: number) => (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${v}%` }} />
                      </div>
                      <span className="text-xs w-8 text-right">{v}%</span>
                    </div>
                  )},
                  { key: "goLive", label: "Go-Live" },
                  { key: "risk", label: "Risk", render: (v: string) => <Badge variant={getPriorityBadge(v)}>{v}</Badge> },
                ] as Column<Record<string, unknown>>[]}
                data={itProjects as unknown as Record<string, unknown>[]}
                
                emptyMessage="No IT projects found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Risk Register</CardTitle>
              <CardDescription>Identified risks, mitigation strategies, and ownership tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "risk", label: "Risk Description", render: (v: string) => <span className="font-medium max-w-xs truncate block">{v}</span> },
                  { key: "category", label: "Category", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "likelihood", label: "Likelihood", render: (v: string) => <Badge variant={getStatusBadge(v)}>{v}</Badge> },
                  { key: "impact", label: "Impact", render: (v: string) => <Badge variant={getStatusBadge(v)}>{v}</Badge> },
                  { key: "owner", label: "Owner" },
                  { key: "mitigation", label: "Mitigation", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => <Badge variant={getStatusBadge(v)}>{v}</Badge> },
                ] as Column<Record<string, unknown>>[]}
                data={enterpriseRisks as unknown as Record<string, unknown>[]}
                
                emptyMessage="No enterprise risks found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resource">
          <Card>
            <CardHeader>
              <CardTitle>Resource Allocation Matrix</CardTitle>
              <CardDescription>FTE allocation, utilization rates, and availability across resource pools</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "resource", label: "Resource Pool", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "department", label: "Department" },
                  { key: "totalFTE", label: "Total FTE", className: "text-right" },
                  { key: "allocated", label: "Allocated", className: "text-right" },
                  { key: "available", label: "Available", className: "text-right", render: (v: number) => (
                    <span className={v === 0 ? "text-red-600 font-medium" : ""}>{v}</span>
                  )},
                  { key: "utilization", label: "Utilization", className: "text-right", render: (v: number) => (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${v >= 95 ? "bg-red-500" : v >= 85 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${v}%` }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right">{v}%</span>
                    </div>
                  )},
                  { key: "topProject", label: "Top Project", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={resourceAllocations as unknown as Record<string, unknown>[]}
                
                emptyMessage="No resource allocations found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showForm}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingGoal(null); } }}
        title={editingGoal ? "Edit Strategic Goal" : "New Strategic Plan"}
        fields={planFormFields}
        initialData={editingGoal ? { objective: editingGoal.goal, kpi: editingGoal.department, target: editingGoal.target, owner: editingGoal.owner, timeline: editingGoal.deadline, status: editingGoal.status } : undefined}
        onSubmit={(data) => {
          if (editingGoal) {
            setStrategicGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...g, goal: data.objective as string, owner: data.owner as string, department: data.kpi as string, target: data.target as string, status: (data.status as string) || g.status, deadline: data.timeline as string } : g));
          } else {
            const id = `SG-${Date.now().toString(36)}`;
            setStrategicGoals(prev => [{ id, goal: data.objective as string, owner: data.owner as string, department: data.kpi as string, target: data.target as string, progress: 0, status: (data.status as string) || "On Track", deadline: data.timeline as string }, ...prev]);
          }
          setShowForm(false);
          setEditingGoal(null);
        }}
      />
    </div>
  )
}
