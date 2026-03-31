"use client"

import { useState } from "react"
import { Users, UserCheck, Calendar, DollarSign, Plus, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_LEAVE: "bg-yellow-100 text-yellow-800",
  TERMINATED: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-800",
  PROCESSED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  PRESENT: "bg-green-100 text-green-800",
  ABSENT: "bg-red-100 text-red-800",
  LATE: "bg-orange-100 text-orange-800",
}

const initialEmployees = [
  { id: "1", employeeNumber: "EMP001", firstName: "John", lastName: "Smith", email: "john.smith@company.com", phone: "(555) 100-1001", department: "Engineering", position: "Senior Developer", hireDate: "2022-03-15", salary: 95000, status: "ACTIVE" },
  { id: "2", employeeNumber: "EMP002", firstName: "Sarah", lastName: "Johnson", email: "sarah.j@company.com", phone: "(555) 100-1002", department: "Marketing", position: "Marketing Manager", hireDate: "2021-06-01", salary: 85000, status: "ACTIVE" },
  { id: "3", employeeNumber: "EMP003", firstName: "Michael", lastName: "Chen", email: "m.chen@company.com", phone: "(555) 100-1003", department: "Finance", position: "Financial Analyst", hireDate: "2023-01-10", salary: 75000, status: "ACTIVE" },
  { id: "4", employeeNumber: "EMP004", firstName: "Emily", lastName: "Davis", email: "e.davis@company.com", phone: "(555) 100-1004", department: "HR", position: "HR Specialist", hireDate: "2022-08-20", salary: 70000, status: "ON_LEAVE" },
  { id: "5", employeeNumber: "EMP005", firstName: "Robert", lastName: "Wilson", email: "r.wilson@company.com", phone: "(555) 100-1005", department: "Sales", position: "Sales Rep", hireDate: "2023-04-12", salary: 65000, status: "ACTIVE" },
  { id: "6", employeeNumber: "EMP006", firstName: "Lisa", lastName: "Anderson", email: "l.anderson@company.com", phone: "(555) 100-1006", department: "Engineering", position: "QA Engineer", hireDate: "2022-11-05", salary: 80000, status: "ACTIVE" },
  { id: "7", employeeNumber: "EMP007", firstName: "David", lastName: "Martinez", email: "d.martinez@company.com", phone: "(555) 100-1007", department: "Operations", position: "Operations Lead", hireDate: "2021-02-28", salary: 90000, status: "ACTIVE" },
  { id: "8", employeeNumber: "EMP008", firstName: "Jennifer", lastName: "Taylor", email: "j.taylor@company.com", phone: "(555) 100-1008", department: "Finance", position: "Controller", hireDate: "2020-09-14", salary: 110000, status: "ACTIVE" },
]

const departments = [
  { id: "1", name: "Engineering", manager: "John Smith", employees: 24, budget: 2400000 },
  { id: "2", name: "Marketing", manager: "Sarah Johnson", employees: 12, budget: 800000 },
  { id: "3", name: "Finance", manager: "Jennifer Taylor", employees: 8, budget: 600000 },
  { id: "4", name: "HR", manager: "Emily Davis", employees: 6, budget: 400000 },
  { id: "5", name: "Sales", manager: "Robert Wilson", employees: 18, budget: 1200000 },
  { id: "6", name: "Operations", manager: "David Martinez", employees: 15, budget: 900000 },
]

const initialLeaves = [
  { id: "1", employee: "Emily Davis", type: "ANNUAL", startDate: "2024-03-25", endDate: "2024-03-29", days: 5, status: "APPROVED", reason: "Family vacation" },
  { id: "2", employee: "John Smith", type: "SICK", startDate: "2024-03-20", endDate: "2024-03-21", days: 2, status: "APPROVED", reason: "Medical appointment" },
  { id: "3", employee: "Lisa Anderson", type: "PERSONAL", startDate: "2024-04-05", endDate: "2024-04-05", days: 1, status: "PENDING", reason: "Personal matter" },
  { id: "4", employee: "Robert Wilson", type: "ANNUAL", startDate: "2024-04-15", endDate: "2024-04-19", days: 5, status: "PENDING", reason: "Spring break travel" },
  { id: "5", employee: "Michael Chen", type: "SICK", startDate: "2024-03-18", endDate: "2024-03-18", days: 1, status: "REJECTED", reason: "Not enough sick leave balance" },
]

const payrollData = [
  { id: "1", employee: "John Smith", period: "Mar 2024", basicSalary: 7916.67, overtime: 450, deductions: 890, bonuses: 500, tax: 1785, netPay: 6191.67, status: "PAID" },
  { id: "2", employee: "Sarah Johnson", period: "Mar 2024", basicSalary: 7083.33, overtime: 0, deductions: 780, bonuses: 300, tax: 1520, netPay: 5083.33, status: "PAID" },
  { id: "3", employee: "Michael Chen", period: "Mar 2024", basicSalary: 6250.00, overtime: 200, deductions: 650, bonuses: 0, tax: 1310, netPay: 4490.00, status: "PROCESSED" },
  { id: "4", employee: "Emily Davis", period: "Mar 2024", basicSalary: 5833.33, overtime: 0, deductions: 620, bonuses: 0, tax: 1190, netPay: 4023.33, status: "DRAFT" },
  { id: "5", employee: "Robert Wilson", period: "Mar 2024", basicSalary: 5416.67, overtime: 350, deductions: 580, bonuses: 800, tax: 1250, netPay: 4736.67, status: "PAID" },
  { id: "6", employee: "Lisa Anderson", period: "Mar 2024", basicSalary: 6666.67, overtime: 0, deductions: 710, bonuses: 250, tax: 1430, netPay: 4776.67, status: "PROCESSED" },
]

export default function HRPage() {
  const [tab, setTab] = useState("employees")
  const [employees, setEmployees] = useState(initialEmployees)
  const [leaves, setLeaves] = useState(initialLeaves)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", department: "", position: "", salary: "" })

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
  const tabs = ["employees", "departments", "leave", "payroll"]

  const filteredEmployees = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.email} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  )

  const addEmployee = () => {
    if (!form.firstName || !form.lastName) return
    setEmployees(prev => [...prev, {
      id: String(prev.length + 1),
      employeeNumber: `EMP${String(prev.length + 1).padStart(3, "0")}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || `${form.firstName.toLowerCase()}@company.com`,
      phone: "(555) 100-" + String(1000 + prev.length + 1),
      department: form.department || "Engineering",
      position: form.position || "Employee",
      hireDate: new Date().toISOString().split("T")[0],
      salary: Number(form.salary) || 60000,
      status: "ACTIVE",
    }])
    setForm({ firstName: "", lastName: "", email: "", department: "", position: "", salary: "" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR & Payroll</h1>
          <p className="text-gray-500">Manage employees, departments, leave requests, and payroll</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} /></div>
                <div><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
                <div><Label>Position</Label><Input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} /></div>
              </div>
              <div><Label>Salary</Label><Input type="number" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={addEmployee}>Add Employee</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Employees</p><p className="text-2xl font-bold">{employees.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Calendar className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-gray-500">On Leave</p><p className="text-2xl font-bold">{employees.filter(e => e.status === "ON_LEAVE").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Departments</p><p className="text-2xl font-bold">{departments.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Monthly Payroll</p><p className="text-2xl font-bold">{fmt(payrollData.reduce((s, p) => s + p.netPay, 0))}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "employees" && (
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle>Employee Directory</CardTitle><Input placeholder="Search employees..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} /></div></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Employee</th><th className="text-left p-3 font-medium">Department</th><th className="text-left p-3 font-medium">Position</th><th className="text-left p-3 font-medium">Hire Date</th><th className="text-right p-3 font-medium">Salary</th><th className="text-left p-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="p-3"><div><p className="font-medium">{emp.firstName} {emp.lastName}</p><p className="text-gray-500 text-xs">{emp.email}</p></div></td>
                      <td className="p-3">{emp.department}</td>
                      <td className="p-3">{emp.position}</td>
                      <td className="p-3">{emp.hireDate}</td>
                      <td className="p-3 text-right">{fmt(emp.salary)}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[emp.status]}`}>{emp.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <Card key={dept.id}>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg">{dept.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Manager: {dept.manager}</p>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-gray-500"><Users className="h-4 w-4 inline mr-1" />{dept.employees} employees</span>
                  <span className="font-medium">{fmt(dept.budget)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "leave" && (
        <Card>
          <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Employee</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">From</th><th className="text-left p-3 font-medium">To</th><th className="text-right p-3 font-medium">Days</th><th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Reason</th>
              </tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{l.employee}</td>
                    <td className="p-3"><Badge variant="outline">{l.type}</Badge></td>
                    <td className="p-3">{l.startDate}</td>
                    <td className="p-3">{l.endDate}</td>
                    <td className="p-3 text-right">{l.days}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[l.status]}`}>{l.status}</span></td>
                    <td className="p-3 text-gray-500">{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "payroll" && (
        <Card>
          <CardHeader><CardTitle>Payroll - March 2024</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Employee</th><th className="text-left p-3 font-medium">Period</th><th className="text-right p-3 font-medium">Basic</th><th className="text-right p-3 font-medium">Overtime</th><th className="text-right p-3 font-medium">Deductions</th><th className="text-right p-3 font-medium">Tax</th><th className="text-right p-3 font-medium">Net Pay</th><th className="text-left p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {payrollData.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.employee}</td>
                    <td className="p-3">{p.period}</td>
                    <td className="p-3 text-right">{fmt(p.basicSalary)}</td>
                    <td className="p-3 text-right">{fmt(p.overtime)}</td>
                    <td className="p-3 text-right text-red-600">-{fmt(p.deductions)}</td>
                    <td className="p-3 text-right text-red-600">-{fmt(p.tax)}</td>
                    <td className="p-3 text-right font-semibold">{fmt(p.netPay)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[p.status]}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
