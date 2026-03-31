"use client"

import { useState } from "react"
import { Settings, Users, Key, Columns, LayoutGrid, Palette, Save, Plus, Eye, EyeOff, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "users", label: "Users", icon: Users },
  { id: "tokens", label: "API Tokens", icon: Key },
  { id: "fields", label: "Custom Fields", icon: Columns },
  { id: "modules", label: "Modules", icon: LayoutGrid },
  { id: "appearance", label: "Appearance", icon: Palette },
]

const initialUsers = [
  { id: "1", name: "Admin User", email: "admin@enterprise.com", role: "ADMIN", department: "Management", status: "Active", lastLogin: "Today, 9:30 AM" },
  { id: "2", name: "Sarah Johnson", email: "sarah@enterprise.com", role: "MANAGER", department: "Sales", status: "Active", lastLogin: "Today, 8:45 AM" },
  { id: "3", name: "Michael Chen", email: "michael@enterprise.com", role: "MANAGER", department: "HR", status: "Active", lastLogin: "Yesterday" },
  { id: "4", name: "Emily Davis", email: "emily@enterprise.com", role: "EMPLOYEE", department: "Engineering", status: "Active", lastLogin: "Today, 10:00 AM" },
  { id: "5", name: "Robert Wilson", email: "robert@enterprise.com", role: "EMPLOYEE", department: "Support", status: "Inactive", lastLogin: "Mar 15" },
]

const initialTokens = [
  { id: "1", name: "Production API", token: "sk-prod-xxxx-xxxx-xxxx-1234", permissions: ["read", "write"], lastUsed: "5 min ago", expires: "Dec 2024", active: true },
  { id: "2", name: "Analytics Integration", token: "sk-analytics-xxxx-xxxx-5678", permissions: ["read"], lastUsed: "2 hours ago", expires: "Jun 2025", active: true },
  { id: "3", name: "Mobile App", token: "sk-mobile-xxxx-xxxx-9012", permissions: ["read", "write", "admin"], lastUsed: "1 day ago", expires: "Mar 2025", active: false },
]

const customFields = [
  { id: "1", module: "CRM", fieldName: "Customer Tier", fieldType: "SELECT", required: true, options: "Gold, Silver, Bronze" },
  { id: "2", module: "CRM", fieldName: "Industry Code", fieldType: "TEXT", required: false, options: "" },
  { id: "3", module: "ERP", fieldName: "Cost Center", fieldType: "TEXT", required: true, options: "" },
  { id: "4", module: "ATS", fieldName: "Visa Required", fieldType: "BOOLEAN", required: false, options: "" },
  { id: "5", module: "HR", fieldName: "Emergency Contact", fieldType: "TEXT", required: true, options: "" },
]

const allModules = [
  { name: "Finance", desc: "General ledger, invoicing, accounts", category: "ERP", enabled: true },
  { name: "Procurement", desc: "Purchase orders, suppliers, contracts", category: "ERP", enabled: true },
  { name: "Inventory", desc: "Products, warehouses, stock", category: "ERP", enabled: true },
  { name: "Projects", desc: "Project tracking, tasks, time entries", category: "ERP", enabled: true },
  { name: "HR & Payroll", desc: "Employees, leave, payroll", category: "ERP", enabled: true },
  { name: "Assets", desc: "Asset tracking and maintenance", category: "ERP", enabled: true },
  { name: "Manufacturing", desc: "BOM, work orders", category: "ERP", enabled: false },
  { name: "Leads", desc: "Lead management and scoring", category: "CRM", enabled: true },
  { name: "Opportunities", desc: "Sales pipeline and deals", category: "CRM", enabled: true },
  { name: "Accounts", desc: "Customer and partner accounts", category: "CRM", enabled: true },
  { name: "Contacts", desc: "Contact management", category: "CRM", enabled: true },
  { name: "Campaigns", desc: "Marketing campaigns", category: "CRM", enabled: true },
  { name: "Tickets", desc: "Customer support tickets", category: "CRM", enabled: true },
  { name: "GPS Tracking", desc: "Field sales tracking", category: "CRM", enabled: false },
  { name: "Loyalty", desc: "Loyalty programs and rewards", category: "CRM", enabled: false },
  { name: "Jobs", desc: "Job postings and management", category: "ATS", enabled: true },
  { name: "Candidates", desc: "Applicant tracking", category: "ATS", enabled: true },
  { name: "Interviews", desc: "Interview scheduling", category: "ATS", enabled: true },
  { name: "Onboarding", desc: "New hire onboarding", category: "ATS", enabled: true },
  { name: "Training", desc: "Training courses and enrollment", category: "ATS", enabled: false },
]

const roleColor: Record<string, string> = { ADMIN: "bg-red-100 text-red-800", MANAGER: "bg-blue-100 text-blue-800", EMPLOYEE: "bg-gray-100 text-gray-800" }
const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316"]

export default function SettingsPage() {
  const [tab, setTab] = useState("general")
  const [users, setUsers] = useState(initialUsers)
  const [tokens, setTokens] = useState(initialTokens)
  const [modules, setModules] = useState(allModules)
  const [showToken, setShowToken] = useState<string | null>(null)
  const [company, setCompany] = useState({ name: "Enterprise Suite Inc.", email: "admin@enterprise.com", phone: "+1 (555) 000-0000", address: "100 Innovation Drive, San Francisco, CA", timezone: "America/Los_Angeles", currency: "USD" })
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [theme, setTheme] = useState("light")

  const toggleModule = (idx: number) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, enabled: !m.enabled } : m))
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-500">System configuration, customization, and user management</p></div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          )
        })}
      </div>

      {tab === "general" && (
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div><Label>Company Name</Label><Input value={company.name} onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={company.email} onChange={e => setCompany(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} /></div>
              <div><Label>Timezone</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={company.timezone} onChange={e => setCompany(p => ({ ...p, timezone: e.target.value }))}>
                  <option value="America/Los_Angeles">Pacific (UTC-8)</option><option value="America/Chicago">Central (UTC-6)</option><option value="America/New_York">Eastern (UTC-5)</option><option value="Europe/London">London (UTC)</option>
                </select>
              </div>
              <div><Label>Currency</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={company.currency} onChange={e => setCompany(p => ({ ...p, currency: e.target.value }))}>
                  <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
            <Button className="mt-6"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {tab === "users" && (
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>User Management</CardTitle><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add User</Button></div></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Email</th><th className="text-left p-3 font-medium">Role</th><th className="text-left p-3 font-medium">Department</th><th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Last Login</th>
              </tr></thead>
              <tbody>{users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{u.name}</td><td className="p-3 text-gray-500">{u.email}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor[u.role]}`}>{u.role}</span></td>
                  <td className="p-3">{u.department}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{u.status}</span></td>
                  <td className="p-3 text-gray-500">{u.lastLogin}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "tokens" && (
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>API Tokens</CardTitle><Button size="sm"><Key className="h-4 w-4 mr-2" />Generate Token</Button></div></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Token</th><th className="text-left p-3 font-medium">Permissions</th><th className="text-left p-3 font-medium">Last Used</th><th className="text-left p-3 font-medium">Expires</th><th className="text-left p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>{tokens.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      {showToken === t.id ? t.token : t.token.replace(/xxxx/g, "****")}
                      <button onClick={() => setShowToken(showToken === t.id ? null : t.id)} className="text-gray-400 hover:text-gray-600">
                        {showToken === t.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3"><div className="flex gap-1">{t.permissions.map(p => <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{p}</span>)}</div></td>
                  <td className="p-3 text-gray-500">{t.lastUsed}</td>
                  <td className="p-3">{t.expires}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${t.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{t.active ? "Active" : "Revoked"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "fields" && (
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>Custom Fields</CardTitle><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Field</Button></div></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Module</th><th className="text-left p-3 font-medium">Field Name</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">Required</th><th className="text-left p-3 font-medium">Options</th>
              </tr></thead>
              <tbody>{customFields.map(f => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 font-medium">{f.module}</span></td>
                  <td className="p-3 font-medium">{f.fieldName}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{f.fieldType}</span></td>
                  <td className="p-3">{f.required ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="p-3 text-gray-500">{f.options || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "modules" && (
        <div className="space-y-6">
          {["ERP", "CRM", "ATS"].map(cat => (
            <div key={cat}>
              <h3 className="text-lg font-semibold mb-3">{cat} Modules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.filter(m => m.category === cat).map((m, idx) => {
                  const globalIdx = modules.findIndex(mod => mod.name === m.name)
                  return (
                    <Card key={m.name} className={`transition-all ${!m.enabled ? "opacity-50" : ""}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{m.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                          </div>
                          <button onClick={() => toggleModule(globalIdx)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.enabled ? "bg-blue-600" : "bg-gray-300"}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.enabled ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "appearance" && (
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {["light", "dark"].map(t => (
                  <button key={t} onClick={() => setTheme(t)} className={`p-4 rounded-lg border-2 transition-colors ${theme === t ? "border-blue-600" : "border-gray-200"}`}>
                    <div className={`w-24 h-16 rounded ${t === "light" ? "bg-white border" : "bg-gray-900"} mb-2`}>
                      <div className={`h-3 rounded-t ${t === "light" ? "bg-gray-100" : "bg-gray-800"}`} />
                    </div>
                    <p className="text-sm font-medium capitalize">{t}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Primary Color</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {colors.map(c => (
                  <button key={c} onClick={() => setPrimaryColor(c)} className={`w-10 h-10 rounded-full border-2 transition-all ${primaryColor === c ? "border-gray-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Density</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {["Compact", "Default", "Comfortable"].map(d => (
                  <button key={d} className="px-4 py-2 rounded-lg border hover:border-blue-600 hover:text-blue-600 transition-colors text-sm">{d}</button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Button><Save className="h-4 w-4 mr-2" />Save Appearance</Button>
        </div>
      )}
    </div>
  )
}
