"use client"

import { useState } from "react"
import {
  Download,
  ExternalLink,
  Check,
  X,
  Plus,
  Settings,
  Play,
  Copy,
  Shield,
  Users,
  Puzzle,
  Code,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Zap,
  Store,
  Layers,
  Lock,
  Workflow,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"

const marketplaceApps = [
  { id: 1, name: "Slack", category: "Communication", description: "Team messaging and notifications for real-time collaboration.", installs: "12.4k", rating: 4.8, installed: true, icon: "💬" },
  { id: 2, name: "Stripe", category: "Payments", description: "Payment processing, subscriptions, and billing management.", installs: "9.8k", rating: 4.9, installed: true, icon: "💳" },
  { id: 3, name: "Mailchimp", category: "Marketing", description: "Email marketing campaigns and audience analytics.", installs: "7.2k", rating: 4.5, installed: false, icon: "📧" },
  { id: 4, name: "Salesforce", category: "CRM", description: "Advanced CRM sync for leads, contacts, and opportunities.", installs: "11.1k", rating: 4.7, installed: true, icon: "☁️" },
  { id: 5, name: "Jira", category: "Project Management", description: "Issue tracking and agile project management integration.", installs: "8.6k", rating: 4.6, installed: false, icon: "📋" },
  { id: 6, name: "QuickBooks", category: "Accounting", description: "Accounting sync for invoices, expenses, and reconciliation.", installs: "10.3k", rating: 4.4, installed: true, icon: "📊" },
  { id: 7, name: "HubSpot", category: "Marketing", description: "Inbound marketing, sales, and service platform connector.", installs: "6.9k", rating: 4.5, installed: false, icon: "🔶" },
  { id: 8, name: "Twilio", category: "Communication", description: "SMS, voice, and video communication APIs.", installs: "5.4k", rating: 4.3, installed: false, icon: "📞" },
  { id: 9, name: "Google Workspace", category: "Productivity", description: "Gmail, Calendar, Drive, and Docs integration.", installs: "14.2k", rating: 4.8, installed: true, icon: "🔷" },
  { id: 10, name: "Zapier", category: "Automation", description: "Connect with 5,000+ apps via automated workflows.", installs: "8.1k", rating: 4.6, installed: true, icon: "⚡" },
  { id: 11, name: "DocuSign", category: "Documents", description: "Electronic signature and agreement management.", installs: "6.3k", rating: 4.7, installed: false, icon: "✍️" },
  { id: 12, name: "Shopify", category: "E-Commerce", description: "Sync products, orders, and inventory with your storefront.", installs: "7.8k", rating: 4.5, installed: false, icon: "🛍️" },
  { id: 13, name: "Zendesk", category: "Support", description: "Customer support ticketing and knowledge base sync.", installs: "5.9k", rating: 4.4, installed: true, icon: "🎫" },
  { id: 14, name: "Power BI", category: "Analytics", description: "Business intelligence dashboards and advanced reporting.", installs: "4.7k", rating: 4.6, installed: false, icon: "📈" },
  { id: 15, name: "AWS S3", category: "Storage", description: "Cloud storage for documents, backups, and media files.", installs: "6.1k", rating: 4.7, installed: true, icon: "🪣" },
  { id: 16, name: "Okta", category: "Security", description: "Single sign-on, MFA, and identity management.", installs: "4.2k", rating: 4.8, installed: false, icon: "🔐" },
]

const activeIntegrations = [
  { id: 1, name: "Slack", status: "Connected", lastSync: "2 min ago", records: "24,310", direction: "Bidirectional", health: "Healthy", apiCalls: "1,240/day" },
  { id: 2, name: "Stripe", status: "Connected", lastSync: "5 min ago", records: "18,472", direction: "Inbound", health: "Healthy", apiCalls: "890/day" },
  { id: 3, name: "Salesforce", status: "Connected", lastSync: "12 min ago", records: "42,105", direction: "Bidirectional", health: "Healthy", apiCalls: "2,100/day" },
  { id: 4, name: "QuickBooks", status: "Connected", lastSync: "1 hr ago", records: "31,890", direction: "Outbound", health: "Warning", apiCalls: "560/day" },
  { id: 5, name: "Google Workspace", status: "Connected", lastSync: "8 min ago", records: "15,620", direction: "Bidirectional", health: "Healthy", apiCalls: "3,400/day" },
  { id: 6, name: "Zapier", status: "Connected", lastSync: "30 min ago", records: "8,930", direction: "Outbound", health: "Healthy", apiCalls: "720/day" },
  { id: 7, name: "Zendesk", status: "Connected", lastSync: "45 min ago", records: "12,450", direction: "Inbound", health: "Healthy", apiCalls: "340/day" },
  { id: 8, name: "AWS S3", status: "Connected", lastSync: "3 min ago", records: "5,210", direction: "Outbound", health: "Healthy", apiCalls: "180/day" },
  { id: 9, name: "Jira", status: "Disconnected", lastSync: "3 days ago", records: "6,780", direction: "Bidirectional", health: "Error", apiCalls: "0/day" },
  { id: 10, name: "HubSpot", status: "Paused", lastSync: "1 day ago", records: "9,320", direction: "Inbound", health: "Paused", apiCalls: "0/day" },
]

const initialCustomFields = [
  { id: 1, module: "CRM", name: "Customer Tier", type: "Select", required: true, options: "Gold, Silver, Bronze, Platinum" },
  { id: 2, module: "CRM", name: "Annual Revenue", type: "Currency", required: false, options: "" },
  { id: 3, module: "HR", name: "Emergency Contact", type: "Text", required: true, options: "" },
  { id: 4, module: "HR", name: "Visa Status", type: "Select", required: false, options: "Citizen, Permanent Resident, Work Visa, Student Visa" },
  { id: 5, module: "Finance", name: "Cost Center", type: "Text", required: true, options: "" },
  { id: 6, module: "Inventory", name: "Hazmat Class", type: "Select", required: false, options: "Class 1-9, None" },
  { id: 7, module: "Projects", name: "Priority Score", type: "Number", required: false, options: "1-100" },
  { id: 8, module: "Sales", name: "Lead Source", type: "Select", required: true, options: "Web, Referral, Cold Call, Trade Show, Partner" },
]

const initialWorkflows = [
  { id: 1, name: "New Lead Assignment", trigger: "Lead Created", actions: 4, status: "Active", lastRun: "10 min ago", runs: 1240 },
  { id: 2, name: "Invoice Overdue Reminder", trigger: "Invoice Past Due", actions: 3, status: "Active", lastRun: "1 hr ago", runs: 890 },
  { id: 3, name: "Employee Onboarding", trigger: "Employee Added", actions: 8, status: "Active", lastRun: "2 days ago", runs: 156 },
  { id: 4, name: "Low Stock Alert", trigger: "Stock Below Threshold", actions: 2, status: "Active", lastRun: "30 min ago", runs: 2310 },
  { id: 5, name: "Contract Renewal", trigger: "90 Days Before Expiry", actions: 5, status: "Paused", lastRun: "1 week ago", runs: 432 },
  { id: 6, name: "Support Escalation", trigger: "Ticket Unresolved 24h", actions: 3, status: "Active", lastRun: "4 hr ago", runs: 678 },
]

const modules = [
  { id: 1, name: "Finance & Accounting", description: "General ledger, AP/AR, budgets, and financial reporting.", status: "Active", users: 48, category: "Core" },
  { id: 2, name: "Human Resources", description: "Employee records, leave management, and performance reviews.", status: "Active", users: 35, category: "Core" },
  { id: 3, name: "Inventory Management", description: "Stock tracking, warehousing, and purchase orders.", status: "Active", users: 22, category: "Core" },
  { id: 4, name: "Sales & CRM", description: "Pipeline management, contacts, and deal tracking.", status: "Active", users: 41, category: "Core" },
  { id: 5, name: "Project Management", description: "Task boards, time tracking, milestones, and Gantt charts.", status: "Active", users: 53, category: "Core" },
  { id: 6, name: "Manufacturing", description: "BOM, work orders, production planning, and quality control.", status: "Inactive", users: 0, category: "Industry" },
  { id: 7, name: "Procurement", description: "Vendor management, RFQs, and purchase approvals.", status: "Active", users: 18, category: "Core" },
  { id: 8, name: "Asset Management", description: "Track equipment, maintenance schedules, and depreciation.", status: "Active", users: 12, category: "Operations" },
  { id: 9, name: "E-Commerce", description: "Online storefront, cart management, and order fulfillment.", status: "Inactive", users: 0, category: "Industry" },
  { id: 10, name: "Fleet Management", description: "Vehicle tracking, maintenance logs, and route optimization.", status: "Inactive", users: 0, category: "Industry" },
  { id: 11, name: "Quality Assurance", description: "Inspections, non-conformance reports, and compliance audits.", status: "Active", users: 9, category: "Operations" },
  { id: 12, name: "Business Intelligence", description: "Advanced analytics, dashboards, and custom report builder.", status: "Active", users: 27, category: "Analytics" },
]

const apiEndpoints = [
  { method: "GET", path: "/api/v2/contacts", description: "List all contacts with pagination", rateLimit: "100/min", auth: "Bearer Token", status: "Stable" },
  { method: "POST", path: "/api/v2/contacts", description: "Create a new contact record", rateLimit: "50/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/invoices", description: "List invoices with filters", rateLimit: "100/min", auth: "Bearer Token", status: "Stable" },
  { method: "POST", path: "/api/v2/invoices", description: "Generate a new invoice", rateLimit: "30/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/inventory/items", description: "List inventory items and stock levels", rateLimit: "100/min", auth: "Bearer Token", status: "Stable" },
  { method: "PUT", path: "/api/v2/inventory/items/:id", description: "Update an inventory item", rateLimit: "50/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/employees", description: "List employee records", rateLimit: "60/min", auth: "API Key", status: "Stable" },
  { method: "POST", path: "/api/v2/projects", description: "Create a new project", rateLimit: "30/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/reports/financial", description: "Generate financial report data", rateLimit: "10/min", auth: "API Key", status: "Beta" },
  { method: "POST", path: "/api/v2/webhooks", description: "Register a new webhook endpoint", rateLimit: "20/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/audit-log", description: "Retrieve audit log entries", rateLimit: "30/min", auth: "API Key", status: "Stable" },
  { method: "DELETE", path: "/api/v2/contacts/:id", description: "Delete a contact by ID", rateLimit: "30/min", auth: "Bearer Token", status: "Stable" },
  { method: "GET", path: "/api/v2/analytics/pipeline", description: "Sales pipeline analytics", rateLimit: "20/min", auth: "API Key", status: "Beta" },
  { method: "POST", path: "/api/v2/bulk/import", description: "Bulk import records via CSV/JSON", rateLimit: "5/min", auth: "Bearer Token", status: "Beta" },
  { method: "GET", path: "/api/v2/settings/fields", description: "List all custom field definitions", rateLimit: "60/min", auth: "API Key", status: "Stable" },
]

const templates = [
  { id: 1, name: "Sales Invoice", category: "Finance", type: "Document", downloads: "3.2k", rating: 4.8 },
  { id: 2, name: "Employee Onboarding Checklist", category: "HR", type: "Workflow", downloads: "2.1k", rating: 4.7 },
  { id: 3, name: "Monthly Financial Report", category: "Finance", type: "Report", downloads: "4.5k", rating: 4.9 },
  { id: 4, name: "Purchase Order Form", category: "Procurement", type: "Document", downloads: "2.8k", rating: 4.6 },
  { id: 5, name: "Customer Feedback Survey", category: "CRM", type: "Form", downloads: "1.9k", rating: 4.4 },
  { id: 6, name: "Project Status Dashboard", category: "Projects", type: "Dashboard", downloads: "3.7k", rating: 4.8 },
  { id: 7, name: "Inventory Reorder Workflow", category: "Inventory", type: "Workflow", downloads: "1.6k", rating: 4.5 },
  { id: 8, name: "Leave Request Form", category: "HR", type: "Form", downloads: "2.4k", rating: 4.3 },
  { id: 9, name: "Quarterly Sales Report", category: "Sales", type: "Report", downloads: "3.1k", rating: 4.7 },
  { id: 10, name: "Vendor Evaluation Matrix", category: "Procurement", type: "Document", downloads: "1.3k", rating: 4.5 },
  { id: 11, name: "IT Asset Tracker", category: "Operations", type: "Dashboard", downloads: "1.8k", rating: 4.6 },
  { id: 12, name: "Compliance Audit Checklist", category: "Compliance", type: "Workflow", downloads: "2.0k", rating: 4.9 },
]

const initialRoles = [
  { id: 1, name: "Super Admin", users: 2, permissions: "Full Access", description: "Unrestricted access to all modules, settings, and data.", editable: false },
  { id: 2, name: "Admin", users: 5, permissions: "All Modules", description: "Full module access with restricted system settings.", editable: true },
  { id: 3, name: "Manager", users: 14, permissions: "Department-Scoped", description: "CRUD access within assigned department and reports.", editable: true },
  { id: 4, name: "Team Lead", users: 22, permissions: "Team-Scoped", description: "Manage team members, approve requests, view team reports.", editable: true },
  { id: 5, name: "Employee", users: 128, permissions: "Self-Service", description: "Access own records, submit requests, view assigned tasks.", editable: true },
  { id: 6, name: "Finance Officer", users: 8, permissions: "Finance Module", description: "Full access to finance, AP/AR, budgets, and reporting.", editable: true },
  { id: 7, name: "HR Specialist", users: 6, permissions: "HR Module", description: "Employee records, leave, payroll, and recruitment access.", editable: true },
  { id: 8, name: "External Auditor", users: 3, permissions: "Read-Only", description: "View-only access to financial records and audit logs.", editable: true },
]

const fieldFormFields: EntityField[] = [
  { name: "entity", label: "Entity", type: "select", options: [
    { label: "CRM Contact", value: "CRM" },
    { label: "CRM Lead", value: "Sales" },
    { label: "HR Employee", value: "HR" },
    { label: "Finance Invoice", value: "Finance" },
    { label: "Inventory Product", value: "Inventory" },
  ]},
  { name: "fieldName", label: "Field Name", type: "text", required: true },
  { name: "fieldType", label: "Field Type", type: "select", options: [
    { label: "Text", value: "Text" },
    { label: "Number", value: "Number" },
    { label: "Date", value: "Date" },
    { label: "Dropdown", value: "Select" },
    { label: "Boolean", value: "Boolean" },
    { label: "Formula", value: "Formula" },
  ]},
  { name: "required", label: "Required", type: "select", options: [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ]},
  { name: "defaultValue", label: "Default Value", type: "text" },
]

const workflowFormFields: EntityField[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "trigger", label: "Trigger", type: "select", options: [
    { label: "Record Created", value: "Record Created" },
    { label: "Record Updated", value: "Record Updated" },
    { label: "Field Changed", value: "Field Changed" },
    { label: "Scheduled", value: "Scheduled" },
    { label: "Manual", value: "Manual" },
  ]},
  { name: "conditions", label: "Conditions", type: "text" },
  { name: "actions", label: "Actions", type: "textarea", required: true },
]

const roleFormFields: EntityField[] = [
  { name: "roleName", label: "Role Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "permissions", label: "Permissions", type: "text" },
]

type EcoModalMode =
  | { kind: "field"; editing: typeof initialCustomFields[0] | null }
  | { kind: "workflow"; editing: typeof initialWorkflows[0] | null }
  | { kind: "role"; editing: typeof initialRoles[0] | null }
  | null;

export default function EcosystemPage() {
  const [customFields, setCustomFields] = useState(initialCustomFields)
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [roles, setRoles] = useState(initialRoles)
  const [modal, setModal] = useState<EcoModalMode>(null)
  const [mpFilters, setMpFilters] = useState<FilterState>({ _search: "", category: "" })
  const [tplFilters, setTplFilters] = useState<FilterState>({ _search: "", type: "" })
  const [mpApps, setMpApps] = useState(marketplaceApps)
  const [viewItem, setViewItem] = useState<any>(null)

  const filteredApps = mpApps.filter((app) => {
    if (mpFilters.category && app.category !== mpFilters.category) return false;
    if (mpFilters._search) {
      const q = mpFilters._search.toLowerCase();
      return app.name.toLowerCase().includes(q) || app.category.toLowerCase().includes(q);
    }
    return true;
  })

  const filteredTemplates = templates.filter((t) => {
    if (tplFilters.type && t.type !== tplFilters.type) return false;
    if (tplFilters._search) {
      const q = tplFilters._search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  })

  const methodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "POST": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "PUT": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ecosystem & Customization</h1>
          <p className="text-muted-foreground mt-1">
            Manage integrations, modules, APIs, templates, and access control in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Integration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Installed Apps</CardDescription>
            <CardTitle className="text-2xl">8</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">of 16 available in marketplace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Integrations</CardDescription>
            <CardTitle className="text-2xl">8</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">2 require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API Calls Today</CardDescription>
            <CardTitle className="text-2xl">9,430</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">74% of daily limit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Workflows</CardDescription>
            <CardTitle className="text-2xl">5</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">5,706 total runs this month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="marketplace" className="gap-1.5"><Store className="h-4 w-4" />Marketplace</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5"><Puzzle className="h-4 w-4" />Integrations</TabsTrigger>
          <TabsTrigger value="customization" className="gap-1.5"><Settings className="h-4 w-4" />Customization</TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5"><Layers className="h-4 w-4" />Modules</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5"><Code className="h-4 w-4" />API Console</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" />Roles</TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <FilterBar
            searchValue={mpFilters._search}
            onSearchChange={(v) => setMpFilters((f) => ({ ...f, _search: v }))}
            fields={[{ key: "category", label: "Category", type: "select", options: [...new Set(marketplaceApps.map((a) => a.category))].map((c) => ({ label: c, value: c })) }]}
            values={mpFilters}
            onChange={(k, v) => setMpFilters((f) => ({ ...f, [k]: v }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredApps.map((app) => (
              <Card key={app.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{app.icon}</span>
                    {app.installed ? (
                      <Badge variant="secondary">Installed</Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{app.name}</CardTitle>
                  <CardDescription className="text-xs">{app.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{app.installs} installs</span>
                    <span>{"★".repeat(Math.floor(app.rating))} {app.rating}</span>
                  </div>
                  <Badge variant="outline" className="text-xs mr-1">{app.category}</Badge>
                  <div className="mt-3">
                    {app.installed ? (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setMpApps(prev => prev.map(a => a.id === app.id ? { ...a, installed: false } : a))}>
                        <Settings className="mr-2 h-3 w-3" />
                        Configure
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => setMpApps(prev => prev.map(a => a.id === app.id ? { ...a, installed: true } : a))}>
                        <Download className="mr-2 h-3 w-3" />
                        Install
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Integrations</CardTitle>
              <CardDescription>Monitor and manage all connected services and their sync status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "name", label: "Service", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "status", label: "Status", render: (v) => (
                    <Badge variant={v === "Connected" ? "default" : v === "Paused" ? "secondary" : "destructive"}>
                      {v}
                    </Badge>
                  )},
                  { key: "health", label: "Health", render: (v) => (
                    <Badge variant={v === "Healthy" ? "outline" : v === "Warning" ? "secondary" : v === "Error" ? "destructive" : "outline"}>
                      {v}
                    </Badge>
                  )},
                  { key: "direction", label: "Direction" },
                  { key: "records", label: "Records" },
                  { key: "apiCalls", label: "API Calls" },
                  { key: "lastSync", label: "Last Sync" },
                  { key: "actions", label: "Actions", render: (_v, row) => {
                    const integration = row as unknown as typeof activeIntegrations[0];
                    return (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewItem({ _kind: "integration", ...integration })}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm"><RefreshCw className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm"><Settings className="h-3 w-3" /></Button>
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={activeIntegrations as unknown as Record<string, unknown>[]}
                exportable exportFilename="ecosystem.csv" emptyMessage="No active integrations."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>Extend modules with additional data fields.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({ kind: "field", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Field</Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "module", label: "Module", render: (v) => <Badge variant="outline">{v}</Badge> },
                  { key: "name", label: "Field Name", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type" },
                  { key: "required", label: "Required", render: (v) => (
                    v ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />
                  )},
                  { key: "options", label: "Options / Range", render: (v) => <span className="text-xs max-w-[200px] truncate block">{v || "—"}</span> },
                  { key: "actions", label: "", render: (_v, row) => {
                    const field = row as unknown as typeof customFields[0];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewItem({ _kind: "field", ...field })}
                        onEdit={() => setModal({ kind: "field", editing: field })}
                        onDelete={() => setCustomFields((prev) => prev.filter((f) => f.id !== field.id))}
                        itemLabel={field.name}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={customFields as unknown as Record<string, unknown>[]}
                exportable exportFilename="ecosystem.csv" emptyMessage="No custom fields defined."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Automated Workflows</CardTitle>
                <CardDescription>Event-driven automations that run across modules.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({ kind: "workflow", editing: null })}><Plus className="mr-2 h-4 w-4" />New Workflow</Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "name", label: "Workflow", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "trigger", label: "Trigger" },
                  { key: "actions", label: "Actions", render: (v) => <>{v} steps</> },
                  { key: "status", label: "Status", render: (v) => (
                    <Badge variant={v === "Active" ? "default" : "secondary"}>
                      {v}
                    </Badge>
                  )},
                  { key: "runs", label: "Total Runs", render: (v) => <>{Number(v).toLocaleString()}</> },
                  { key: "lastRun", label: "Last Run" },
                  { key: "wfActions", label: "", render: (_v, row) => {
                    const wf = row as unknown as typeof workflows[0];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewItem({ _kind: "workflow", ...wf })}
                        onEdit={() => setModal({ kind: "workflow", editing: wf })}
                        onDelete={() => setWorkflows((prev) => prev.filter((w) => w.id !== wf.id))}
                        itemLabel={wf.name}
                        extraItems={[{
                          label: wf.status === "Active" ? "Pause" : "Activate",
                          onClick: () => setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, status: w.status === "Active" ? "Paused" : "Active" } : w)),
                        }]}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={workflows as unknown as Record<string, unknown>[]}
                exportable exportFilename="ecosystem.csv" emptyMessage="No workflows defined."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <Card key={mod.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">{mod.category}</Badge>
                    <Badge variant={mod.status === "Active" ? "default" : "secondary"}>
                      {mod.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{mod.name}</CardTitle>
                  <CardDescription className="text-xs">{mod.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{mod.users} users</span>
                  </div>
                  {mod.status === "Active" ? (
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="mr-2 h-3 w-3" />
                      Configure
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full">
                      <Zap className="mr-2 h-3 w-3" />
                      Activate
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API Console Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>RESTful API v2 reference for all available endpoints.</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Full Documentation
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "method", label: "Method", render: (v) => (
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${methodColor(v)}`}>
                      {v}
                    </span>
                  )},
                  { key: "path", label: "Endpoint", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "description", label: "Description" },
                  { key: "rateLimit", label: "Rate Limit" },
                  { key: "auth", label: "Auth", render: (v) => <Badge variant="outline">{v}</Badge> },
                  { key: "status", label: "Status", render: (v) => (
                    <Badge variant={v === "Stable" ? "default" : "secondary"}>
                      {v}
                    </Badge>
                  )},
                  { key: "action", label: "Action", render: () => (
                    <Button variant="ghost" size="sm"><Copy className="h-3 w-3" /></Button>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={apiEndpoints as unknown as Record<string, unknown>[]}
                pagination={true}
                exportable exportFilename="ecosystem.csv" emptyMessage="No API endpoints available."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <FilterBar
            searchValue={tplFilters._search}
            onSearchChange={(v) => setTplFilters((f) => ({ ...f, _search: v }))}
            fields={[{ key: "type", label: "Type", type: "select", options: [...new Set(templates.map((t) => t.type))].map((t) => ({ label: t, value: t })) }]}
            values={tplFilters}
            onChange={(k, v) => setTplFilters((f) => ({ ...f, [k]: v }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((tpl) => (
              <Card key={tpl.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">{tpl.type}</Badge>
                    <span className="text-xs text-muted-foreground">{"★".repeat(Math.floor(tpl.rating))} {tpl.rating}</span>
                  </div>
                  <CardTitle className="text-base mt-2">{tpl.name}</CardTitle>
                  <CardDescription className="text-xs">{tpl.category}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{tpl.downloads} downloads</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Define access levels and permission scopes for your organization.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({ kind: "role", editing: null })}><Plus className="mr-2 h-4 w-4" />Create Role</Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "name", label: "Role", render: (_v, row) => {
                    const role = row as unknown as typeof roles[0];
                    return (
                      <span className="font-medium flex items-center gap-2">
                        {!role.editable && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {role.name}
                      </span>
                    );
                  }},
                  { key: "description", label: "Description", className: "max-w-[260px]" },
                  { key: "permissions", label: "Permissions", render: (v) => <Badge variant="secondary">{v}</Badge> },
                  { key: "users", label: "Users" },
                  { key: "roleActions", label: "Actions", render: (_v, row) => {
                    const role = row as unknown as typeof roles[0];
                    return role.editable ? (
                      <EditDeleteMenu
                        onView={() => setViewItem({ _kind: "role", ...role })}
                        onEdit={() => setModal({ kind: "role", editing: role })}
                        onDelete={() => setRoles((prev) => prev.filter((r) => r.id !== role.id))}
                        itemLabel={role.name}
                      />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={roles as unknown as Record<string, unknown>[]}
                exportable exportFilename="ecosystem.csv" emptyMessage="No roles defined."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={modal?.kind === "field"}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.kind === "field" && modal.editing ? "Edit Custom Field" : "Add Custom Field"}
        fields={fieldFormFields}
        initialData={modal?.kind === "field" && modal.editing ? { entity: modal.editing.module, fieldName: modal.editing.name, fieldType: modal.editing.type, required: modal.editing.required ? "Yes" : "No", defaultValue: modal.editing.options } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "field" && modal.editing) {
            setCustomFields((prev) => prev.map((f) => f.id === modal.editing!.id ? { ...f, module: (data.entity as string) || f.module, name: data.fieldName as string, type: (data.fieldType as string) || f.type, required: data.required === "Yes", options: (data.defaultValue as string) || "" } : f));
          } else {
            setCustomFields((prev) => [{ id: Date.now(), module: (data.entity as string) || "CRM", name: data.fieldName as string, type: (data.fieldType as string) || "Text", required: data.required === "Yes", options: (data.defaultValue as string) || "" }, ...prev]);
          }
          setModal(null);
        }}
      />

      <EntityFormModal
        open={modal?.kind === "workflow"}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.kind === "workflow" && modal.editing ? "Edit Workflow" : "New Workflow"}
        fields={workflowFormFields}
        initialData={modal?.kind === "workflow" && modal.editing ? { name: modal.editing.name, trigger: modal.editing.trigger, conditions: "", actions: "" } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "workflow" && modal.editing) {
            setWorkflows((prev) => prev.map((w) => w.id === modal.editing!.id ? { ...w, name: data.name as string, trigger: (data.trigger as string) || w.trigger } : w));
          } else {
            setWorkflows((prev) => [{ id: Date.now(), name: data.name as string, trigger: (data.trigger as string) || "Manual", actions: 1, status: "Active", lastRun: "Never", runs: 0 }, ...prev]);
          }
          setModal(null);
        }}
      />

      <EntityFormModal
        open={modal?.kind === "role"}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.kind === "role" && modal.editing ? "Edit Role" : "Create Role"}
        fields={roleFormFields}
        initialData={modal?.kind === "role" && modal.editing ? { roleName: modal.editing.name, description: modal.editing.description, permissions: modal.editing.permissions } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "role" && modal.editing) {
            setRoles((prev) => prev.map((r) => r.id === modal.editing!.id ? { ...r, name: data.roleName as string, description: data.description as string, permissions: (data.permissions as string) || r.permissions } : r));
          } else {
            setRoles((prev) => [{ id: Date.now(), name: data.roleName as string, users: 0, permissions: (data.permissions as string) || "Custom", description: data.description as string, editable: true }, ...prev]);
          }
          setModal(null);
        }}
      />

      {/* Detail View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
          </DialogHeader>
          {viewItem?._kind === "field" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Module</span><p className="font-medium">{viewItem.module}</p></div>
              <div><span className="text-sm text-muted-foreground">Field Name</span><p className="font-medium">{viewItem.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewItem.type}</p></div>
              <div><span className="text-sm text-muted-foreground">Required</span><p className="font-medium">{viewItem.required ? "Yes" : "No"}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Options / Range</span><p className="font-medium">{viewItem.options || "—"}</p></div>
            </div>
          )}
          {viewItem?._kind === "workflow" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Workflow Name</span><p className="font-medium">{viewItem.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Trigger</span><p className="font-medium">{viewItem.trigger}</p></div>
              <div><span className="text-sm text-muted-foreground">Actions</span><p className="font-medium">{viewItem.actions} steps</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewItem.status}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Runs</span><p className="font-medium">{Number(viewItem.runs).toLocaleString()}</p></div>
              <div><span className="text-sm text-muted-foreground">Last Run</span><p className="font-medium">{viewItem.lastRun}</p></div>
            </div>
          )}
          {viewItem?._kind === "role" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Role Name</span><p className="font-medium">{viewItem.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Users</span><p className="font-medium">{viewItem.users}</p></div>
              <div><span className="text-sm text-muted-foreground">Permissions</span><p className="font-medium">{viewItem.permissions}</p></div>
              <div><span className="text-sm text-muted-foreground">Editable</span><p className="font-medium">{viewItem.editable ? "Yes" : "No"}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Description</span><p className="font-medium">{viewItem.description}</p></div>
            </div>
          )}
          {viewItem?._kind === "integration" && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Service</span><p className="font-medium">{viewItem.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewItem.status}</p></div>
              <div><span className="text-sm text-muted-foreground">Health</span><p className="font-medium">{viewItem.health}</p></div>
              <div><span className="text-sm text-muted-foreground">Direction</span><p className="font-medium">{viewItem.direction}</p></div>
              <div><span className="text-sm text-muted-foreground">Records</span><p className="font-medium">{viewItem.records}</p></div>
              <div><span className="text-sm text-muted-foreground">API Calls</span><p className="font-medium">{viewItem.apiCalls}</p></div>
              <div><span className="text-sm text-muted-foreground">Last Sync</span><p className="font-medium">{viewItem.lastSync}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
