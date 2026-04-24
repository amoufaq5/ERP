"use client";

import { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { downloadCSV } from "@/lib/download";
import { useDataStore, type Employee } from "@/lib/data-store";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "ANNUAL" | "SICK" | "PERSONAL";
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  basicSalary: number;
  overtime: number;
  deductions: number;
  bonuses: number;
  tax: number;
  netPay: number;
  status: "DRAFT" | "PROCESSED" | "PAID";
}

interface Department {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  budget: number;
}

/* ─── Seed Data ────────────────────────────────────────────────────── */

const SEED_LEAVES: LeaveRequest[] = [
  { id: "lv-1", employeeId: "emp-4", employeeName: "Emily Davis", type: "ANNUAL", startDate: "2024-03-25", endDate: "2024-03-29", days: 5, status: "APPROVED", reason: "Family vacation" },
  { id: "lv-2", employeeId: "emp-1", employeeName: "John Smith", type: "SICK", startDate: "2024-03-20", endDate: "2024-03-21", days: 2, status: "APPROVED", reason: "Medical appointment" },
  { id: "lv-3", employeeId: "emp-6", employeeName: "Lisa Anderson", type: "PERSONAL", startDate: "2024-04-05", endDate: "2024-04-05", days: 1, status: "PENDING", reason: "Personal matter" },
  { id: "lv-4", employeeId: "emp-5", employeeName: "Robert Wilson", type: "ANNUAL", startDate: "2024-04-15", endDate: "2024-04-19", days: 5, status: "PENDING", reason: "Spring break travel" },
  { id: "lv-5", employeeId: "emp-3", employeeName: "Michael Chen", type: "SICK", startDate: "2024-03-18", endDate: "2024-03-18", days: 1, status: "REJECTED", reason: "Not enough sick leave balance" },
];

const SEED_PAYROLL: PayrollRecord[] = [
  { id: "pr-1", employeeId: "emp-1", employeeName: "John Smith", period: "Mar 2024", basicSalary: 7916.67, overtime: 450, deductions: 890, bonuses: 500, tax: 1785, netPay: 6191.67, status: "PAID" },
  { id: "pr-2", employeeId: "emp-2", employeeName: "Sarah Johnson", period: "Mar 2024", basicSalary: 7083.33, overtime: 0, deductions: 780, bonuses: 300, tax: 1520, netPay: 5083.33, status: "PAID" },
  { id: "pr-3", employeeId: "emp-3", employeeName: "Michael Chen", period: "Mar 2024", basicSalary: 6250.00, overtime: 200, deductions: 650, bonuses: 0, tax: 1310, netPay: 4490.00, status: "PROCESSED" },
  { id: "pr-4", employeeId: "emp-4", employeeName: "Emily Davis", period: "Mar 2024", basicSalary: 5833.33, overtime: 0, deductions: 620, bonuses: 0, tax: 1190, netPay: 4023.33, status: "DRAFT" },
  { id: "pr-5", employeeId: "emp-5", employeeName: "Robert Wilson", period: "Mar 2024", basicSalary: 5416.67, overtime: 350, deductions: 580, bonuses: 800, tax: 1250, netPay: 4736.67, status: "PAID" },
  { id: "pr-6", employeeId: "emp-6", employeeName: "Lisa Anderson", period: "Mar 2024", basicSalary: 6666.67, overtime: 0, deductions: 710, bonuses: 250, tax: 1430, netPay: 4776.67, status: "PROCESSED" },
];

const SEED_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Engineering", managerId: "emp-1", managerName: "John Smith", budget: 2400000 },
  { id: "dept-2", name: "Marketing", managerId: "emp-2", managerName: "Sarah Johnson", budget: 800000 },
  { id: "dept-3", name: "Finance", managerId: "emp-8", managerName: "Jennifer Taylor", budget: 600000 },
  { id: "dept-4", name: "HR", managerId: "emp-4", managerName: "Emily Davis", budget: 400000 },
  { id: "dept-5", name: "Sales", managerId: "emp-5", managerName: "Robert Wilson", budget: 1200000 },
  { id: "dept-6", name: "Operations", managerId: "emp-7", managerName: "David Martinez", budget: 900000 },
];

/* ─── Component ────────────────────────────────────────────────────── */

export default function HRPage() {
  const fmt = (n: number) =>
    `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Data store
  const store = useDataStore();
  const employees = store.employees;

  // State (leave & payroll stay local for now)
  const [leaves, setLeaves] = useState<LeaveRequest[]>(SEED_LEAVES);
  const [payroll, setPayroll] = useState<PayrollRecord[]>(SEED_PAYROLL);
  const [departments, setDepartments] = useState<Department[]>(SEED_DEPARTMENTS);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveFilters, setLeaveFilters] = useState<FilterState>({});
  const [payrollSearch, setPayrollSearch] = useState("");
  const [payrollFilters, setPayrollFilters] = useState<FilterState>({});

  const [empFormOpen, setEmpFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [payrollFormOpen, setPayrollFormOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);

  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [detailDept, setDetailDept] = useState<Department | null>(null);

  // Derived
  const uniqueDepts = Array.from(new Set(employees.map((e) => e.department))).sort();
  const uniqueStatuses: Employee["status"][] = ["ACTIVE", "ON_LEAVE", "TERMINATED"];

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.email.toLowerCase().includes(q) &&
          !e.department.toLowerCase().includes(q) &&
          !e.position.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.department && e.department !== filters.department) return false;
      if (filters.status && e.status !== filters.status) return false;
      return true;
    });
  }, [employees, search, filters]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (leaveSearch) {
        const q = leaveSearch.toLowerCase();
        if (!l.employeeName.toLowerCase().includes(q) && !l.reason.toLowerCase().includes(q)) return false;
      }
      if (leaveFilters.status && l.status !== leaveFilters.status) return false;
      if (leaveFilters.type && l.type !== leaveFilters.type) return false;
      return true;
    });
  }, [leaves, leaveSearch, leaveFilters]);

  const filteredPayroll = useMemo(() => {
    return payroll.filter((p) => {
      if (payrollSearch) {
        const q = payrollSearch.toLowerCase();
        if (!p.employeeName.toLowerCase().includes(q) && !p.period.toLowerCase().includes(q)) return false;
      }
      if (payrollFilters.status && p.status !== payrollFilters.status) return false;
      return true;
    });
  }, [payroll, payrollSearch, payrollFilters]);

  const pendingLeaves = leaves.filter((l) => l.status === "PENDING");

  // Stats
  const totalPayroll = payroll.reduce((s, p) => s + p.netPay, 0);
  const onLeaveCount = employees.filter((e) => e.status === "ON_LEAVE").length;

  /* ─── Employee CRUD ─── */
  const empFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "department", label: "Department", type: "select", required: true, options: uniqueDepts.map((d) => ({ label: d, value: d })) },
    { name: "position", label: "Position", type: "text", required: true },
    { name: "manager", label: "Manager", type: "text" },
    { name: "hireDate", label: "Hire Date", type: "date", required: true },
    { name: "salary", label: "Annual Salary", type: "number", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: uniqueStatuses.map((s) => ({ label: s, value: s })) },
  ];

  function handleCreateEmp() { setEditingEmp(null); setEmpFormOpen(true); }
  function handleEditEmp(e: Employee) { setEditingEmp(e); setEmpFormOpen(true); }
  function handleEmpSubmit(data: EntityFormData) {
    if (editingEmp) {
      store.update("employees", editingEmp.id, {
        name: String(data.name),
        email: String(data.email),
        phone: String(data.phone || editingEmp.phone),
        department: String(data.department),
        position: String(data.position),
        manager: String(data.manager || editingEmp.manager),
        hireDate: String(data.hireDate),
        salary: Number(data.salary),
        status: data.status as Employee["status"],
      });
    } else {
      const newId = store.genId("emp");
      const seqNum = employees.length + 1;
      store.add("employees", {
        id: newId,
        employeeId: `EMP-${String(seqNum).padStart(3, "0")}`,
        name: String(data.name),
        email: String(data.email),
        phone: String(data.phone || ""),
        department: String(data.department),
        position: String(data.position),
        manager: String(data.manager || ""),
        hireDate: String(data.hireDate || new Date().toISOString().split("T")[0]),
        salary: Number(data.salary) || 60000,
        status: (data.status as Employee["status"]) || "ACTIVE",
      });
    }
    setEmpFormOpen(false);
    setEditingEmp(null);
  }
  function handleDeleteEmp(e: Employee) {
    store.remove("employees", e.id);
  }

  /* ─── Leave CRUD ─── */
  const leaveFields: EntityField[] = [
    { name: "employeeId", label: "Employee", type: "select", required: true, options: employees.map((e) => ({ label: e.name, value: e.id })) },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Annual", value: "ANNUAL" }, { label: "Sick", value: "SICK" }, { label: "Personal", value: "PERSONAL" }] },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    { name: "reason", label: "Reason", type: "textarea", required: true, fullWidth: true },
  ];

  function handleCreateLeave() { setEditingLeave(null); setLeaveFormOpen(true); }
  function handleEditLeave(l: LeaveRequest) { setEditingLeave(l); setLeaveFormOpen(true); }
  function handleLeaveSubmit(data: EntityFormData) {
    const emp = employees.find((e) => e.id === String(data.employeeId));
    const start = new Date(String(data.startDate));
    const end = new Date(String(data.endDate));
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    if (editingLeave) {
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === editingLeave.id
            ? { ...l, employeeId: String(data.employeeId), employeeName: emp ? emp.name : l.employeeName, type: data.type as LeaveRequest["type"], startDate: String(data.startDate), endDate: String(data.endDate), days, reason: String(data.reason) }
            : l
        )
      );
    } else {
      setLeaves((prev) => [
        ...prev,
        {
          id: store.genId("lv"),
          employeeId: String(data.employeeId),
          employeeName: emp ? emp.name : "Unknown",
          type: data.type as LeaveRequest["type"],
          startDate: String(data.startDate),
          endDate: String(data.endDate),
          days,
          status: "PENDING",
          reason: String(data.reason),
        },
      ]);
    }
    setLeaveFormOpen(false);
    setEditingLeave(null);
  }
  function handleDeleteLeave(l: LeaveRequest) {
    setLeaves((prev) => prev.filter((x) => x.id !== l.id));
  }
  function handleApproveLeave(l: LeaveRequest) {
    setLeaves((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "APPROVED" as const } : x)));
  }
  function handleRejectLeave(l: LeaveRequest) {
    setLeaves((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "REJECTED" as const } : x)));
  }

  /* ─── Department CRUD ─── */
  const deptFields: EntityField[] = [
    { name: "name", label: "Department Name", type: "text", required: true },
    { name: "managerId", label: "Manager", type: "select", required: true, options: employees.map((e) => ({ label: e.name, value: e.id })) },
    { name: "budget", label: "Annual Budget", type: "number", required: true },
  ];

  function handleCreateDept() { setEditingDept(null); setDeptFormOpen(true); }
  function handleEditDept(d: Department) { setEditingDept(d); setDeptFormOpen(true); }
  function handleDeptSubmit(data: EntityFormData) {
    const mgr = employees.find((e) => e.id === String(data.managerId));
    if (editingDept) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDept.id
            ? { ...d, name: String(data.name), managerId: String(data.managerId), managerName: mgr ? `${mgr.name}` : d.managerName, budget: Number(data.budget) }
            : d
        )
      );
    } else {
      setDepartments((prev) => [
        ...prev,
        { id: store.genId("dept"), name: String(data.name), managerId: String(data.managerId), managerName: mgr ? `${mgr.name}` : "—", budget: Number(data.budget) || 0 },
      ]);
    }
    setDeptFormOpen(false);
    setEditingDept(null);
  }
  function handleDeleteDept(d: Department) {
    setDepartments((prev) => prev.filter((x) => x.id !== d.id));
  }

  /* ─── Payroll CRUD ─── */
  const payrollFields: EntityField[] = [
    { name: "employeeId", label: "Employee", type: "select", required: true, options: employees.map((e) => ({ label: `${e.name}`, value: e.id })) },
    { name: "period", label: "Period", type: "text", required: true, placeholder: "e.g. Apr 2024" },
    { name: "basicSalary", label: "Basic Salary", type: "number", required: true },
    { name: "overtime", label: "Overtime", type: "number", defaultValue: 0 },
    { name: "deductions", label: "Deductions", type: "number", defaultValue: 0 },
    { name: "bonuses", label: "Bonuses", type: "number", defaultValue: 0 },
    { name: "tax", label: "Tax", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "DRAFT" }, { label: "Processed", value: "PROCESSED" }, { label: "Paid", value: "PAID" }] },
  ];

  function handleCreatePayroll() { setEditingPayroll(null); setPayrollFormOpen(true); }
  function handleEditPayroll(p: PayrollRecord) { setEditingPayroll(p); setPayrollFormOpen(true); }
  function handlePayrollSubmit(data: EntityFormData) {
    const emp = employees.find((e) => e.id === String(data.employeeId));
    const basic = Number(data.basicSalary) || 0;
    const ot = Number(data.overtime) || 0;
    const ded = Number(data.deductions) || 0;
    const bon = Number(data.bonuses) || 0;
    const tax = Number(data.tax) || 0;
    const net = basic + ot + bon - ded - tax;

    if (editingPayroll) {
      setPayroll((prev) =>
        prev.map((p) =>
          p.id === editingPayroll.id
            ? { ...p, employeeId: String(data.employeeId), employeeName: emp ? `${emp.name}` : p.employeeName, period: String(data.period), basicSalary: basic, overtime: ot, deductions: ded, bonuses: bon, tax, netPay: net, status: data.status as PayrollRecord["status"] }
            : p
        )
      );
    } else {
      setPayroll((prev) => [
        ...prev,
        { id: store.genId("pr"), employeeId: String(data.employeeId), employeeName: emp ? `${emp.name}` : "—", period: String(data.period), basicSalary: basic, overtime: ot, deductions: ded, bonuses: bon, tax, netPay: net, status: (data.status as PayrollRecord["status"]) || "DRAFT" },
      ]);
    }
    setPayrollFormOpen(false);
    setEditingPayroll(null);
  }
  function handleDeletePayroll(p: PayrollRecord) {
    setPayroll((prev) => prev.filter((x) => x.id !== p.id));
  }

  /* ─── Status badge helper ─── */
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
    ANNUAL: "bg-blue-100 text-blue-800",
    SICK: "bg-red-100 text-red-800",
    PERSONAL: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR & Payroll"
        description="Manage employees, departments, leave requests, and payroll"
        actions={
          <Button onClick={handleCreateEmp}>
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Users} title="Total Employees" value={employees.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Calendar} title="On Leave" value={onLeaveCount} iconColor="bg-yellow-100 text-yellow-600" />
        <StatsCard icon={UserCheck} title="Departments" value={departments.length} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={DollarSign} title="Monthly Payroll" value={fmt(totalPayroll)} iconColor="bg-purple-100 text-purple-600" />
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="h-3.5 w-3.5 mr-1.5" />Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-3.5 w-3.5 mr-1.5" />Departments</TabsTrigger>
          <TabsTrigger value="leave"><Calendar className="h-3.5 w-3.5 mr-1.5" />Leave ({pendingLeaves.length} pending)</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Payroll</TabsTrigger>
        </TabsList>

        {/* ── Employees ── */}
        <TabsContent value="employees" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search employees by name, email, department, or position..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              { key: "department", label: "Department", type: "select", options: uniqueDepts.map((d) => ({ label: d, value: d })) },
              { key: "status", label: "Status", type: "select", options: uniqueStatuses.map((s) => ({ label: s, value: s })) },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />

          <Card>
            <CardContent className="p-0">
              <DataTable
                selectable
                bulkActions={[
                  { key: "export", label: "Export Selected" },
                ]}
                onBulkAction={(action, rows) => {
                  if (action === "export") {
                    const csvColumns = [
                      { key: "employeeId" as const, label: "Employee #" },
                      { key: "name" as const, label: "Name" },
                      { key: "email" as const, label: "Email" },
                      { key: "phone" as const, label: "Phone" },
                      { key: "department" as const, label: "Department" },
                      { key: "position" as const, label: "Position" },
                      { key: "hireDate" as const, label: "Hire Date" },
                      { key: "salary" as const, label: "Salary" },
                      { key: "status" as const, label: "Status" },
                    ];
                    downloadCSV("employees-selected.csv", rows as unknown as Record<string, unknown>[], csvColumns);
                  }
                }}
                columns={[
                  { key: "name", label: "Employee", render: (_v, row) => {
                    const r = row as unknown as Employee;
                    return (<div><div className="font-medium">{r.name}</div><div className="text-[11px] text-slate-500">{r.email}</div></div>);
                  }},
                  { key: "department", label: "Department" },
                  { key: "position", label: "Position" },
                  { key: "hireDate", label: "Hire Date" },
                  { key: "salary", label: "Salary", className: "text-right", render: (v) => <span className="font-medium">{fmt(v as number)}</span> },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const r = row as unknown as Employee;
                    return (<EditDeleteMenu onEdit={() => handleEditEmp(r)} onDelete={() => handleDeleteEmp(r)} onView={() => setDetailEmp(r)} canView itemLabel={`${r.name}`} compact />);
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredEmployees as unknown as Record<string, unknown>[]}
                
                emptyMessage="No employees match your filters."
                exportable
                exportFilename="employees.csv"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Departments ── */}
        <TabsContent value="departments" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateDept}><Plus className="h-3.5 w-3.5 mr-1" />Add Department</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const empCount = employees.filter((e) => e.department === dept.name).length;
              return (
                <Card key={dept.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{dept.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Manager: {dept.managerName}</p>
                      </div>
                      <EditDeleteMenu
                        onEdit={() => handleEditDept(dept)}
                        onDelete={() => handleDeleteDept(dept)}
                        onView={() => setDetailDept(dept)}
                        canView
                        itemLabel={dept.name}
                        compact
                      />
                    </div>
                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-gray-500"><Users className="h-4 w-4 inline mr-1" />{empCount} employees</span>
                      <span className="font-medium">{fmt(dept.budget)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Leave ── */}
        <TabsContent value="leave" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search by employee name or reason..."
            searchValue={leaveSearch}
            onSearchChange={setLeaveSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Pending", value: "PENDING" }, { label: "Approved", value: "APPROVED" }, { label: "Rejected", value: "REJECTED" }] },
              { key: "type", label: "Type", type: "select", options: [{ label: "Annual", value: "ANNUAL" }, { label: "Sick", value: "SICK" }, { label: "Personal", value: "PERSONAL" }] },
            ]}
            values={leaveFilters}
            onChange={(k, v) => setLeaveFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={handleCreateLeave}><Plus className="h-3.5 w-3.5 mr-1" />Request Leave</Button>
            }
          />

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "employeeName", label: "Employee", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "type", label: "Type", render: (v) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
                  { key: "startDate", label: "From" },
                  { key: "endDate", label: "To" },
                  { key: "days", label: "Days", className: "text-right" },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
                  { key: "reason", label: "Reason", className: "text-gray-500 max-w-[200px] truncate" },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const l = row as unknown as LeaveRequest;
                    return (
                      <EditDeleteMenu
                        onEdit={() => handleEditLeave(l)}
                        onDelete={() => handleDeleteLeave(l)}
                        itemLabel={`Leave: ${l.employeeName}`}
                        compact
                        extraItems={
                          l.status === "PENDING"
                            ? [
                                { label: "Approve", onClick: () => handleApproveLeave(l), icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> },
                                { label: "Reject", onClick: () => handleRejectLeave(l), icon: <XCircle className="h-3.5 w-3.5 text-red-600" /> },
                              ]
                            : undefined
                        }
                      />
                    );
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredLeaves as unknown as Record<string, unknown>[]}
                
                emptyMessage="No leave requests match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search by employee name or period..."
            searchValue={payrollSearch}
            onSearchChange={setPayrollSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "DRAFT" }, { label: "Processed", value: "PROCESSED" }, { label: "Paid", value: "PAID" }] },
            ]}
            values={payrollFilters}
            onChange={(k, v) => setPayrollFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={handleCreatePayroll}><Plus className="h-3.5 w-3.5 mr-1" />Add Payroll</Button>
            }
          />

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "employeeName", label: "Employee", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "period", label: "Period" },
                  { key: "basicSalary", label: "Basic", className: "text-right", render: (v) => fmt(v as number) },
                  { key: "overtime", label: "Overtime", className: "text-right", render: (v) => fmt(v as number) },
                  { key: "deductions", label: "Deductions", className: "text-right", render: (v) => <span className="text-red-600">-{fmt(v as number)}</span> },
                  { key: "tax", label: "Tax", className: "text-right", render: (v) => <span className="text-red-600">-{fmt(v as number)}</span> },
                  { key: "netPay", label: "Net Pay", className: "text-right", render: (v) => <span className="font-semibold">{fmt(v as number)}</span> },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const p = row as unknown as PayrollRecord;
                    return (<EditDeleteMenu onEdit={() => handleEditPayroll(p)} onDelete={() => handleDeletePayroll(p)} itemLabel={`Payroll: ${p.employeeName}`} compact />);
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredPayroll as unknown as Record<string, unknown>[]}
                
                emptyMessage="No payroll records match your filters."
              />
              {filteredPayroll.length > 0 && (
                <div className="border-t-2 bg-slate-50 font-bold text-sm flex">
                  <div className="p-3 flex-[2]">Total</div>
                  <div className="p-3 flex-1 text-right">{fmt(filteredPayroll.reduce((s, p) => s + p.basicSalary, 0))}</div>
                  <div className="p-3 flex-1 text-right">{fmt(filteredPayroll.reduce((s, p) => s + p.overtime, 0))}</div>
                  <div className="p-3 flex-1 text-right text-red-600">-{fmt(filteredPayroll.reduce((s, p) => s + p.deductions, 0))}</div>
                  <div className="p-3 flex-1 text-right text-red-600">-{fmt(filteredPayroll.reduce((s, p) => s + p.tax, 0))}</div>
                  <div className="p-3 flex-1 text-right">{fmt(filteredPayroll.reduce((s, p) => s + p.netPay, 0))}</div>
                  <div className="p-3 flex-[2]"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <EntityFormModal
        open={empFormOpen}
        onOpenChange={setEmpFormOpen}
        title={editingEmp ? `Edit ${editingEmp.name}` : "Add Employee"}
        fields={empFields}
        initialData={editingEmp ? { name: editingEmp.name, email: editingEmp.email, phone: editingEmp.phone, department: editingEmp.department, position: editingEmp.position, hireDate: editingEmp.hireDate, salary: editingEmp.salary, status: editingEmp.status } : undefined}
        onSubmit={handleEmpSubmit}
        submitLabel={editingEmp ? "Save" : "Create"}
        size="lg"
      />

      <EntityFormModal
        open={leaveFormOpen}
        onOpenChange={setLeaveFormOpen}
        title={editingLeave ? "Edit Leave Request" : "Request Leave"}
        fields={leaveFields}
        initialData={editingLeave ? { employeeId: editingLeave.employeeId, type: editingLeave.type, startDate: editingLeave.startDate, endDate: editingLeave.endDate, reason: editingLeave.reason } : undefined}
        onSubmit={handleLeaveSubmit}
        submitLabel={editingLeave ? "Save" : "Submit Request"}
        size="md"
      />

      <EntityFormModal
        open={deptFormOpen}
        onOpenChange={setDeptFormOpen}
        title={editingDept ? `Edit ${editingDept.name}` : "Add Department"}
        fields={deptFields}
        initialData={editingDept ? { name: editingDept.name, managerId: editingDept.managerId, budget: editingDept.budget } : undefined}
        onSubmit={handleDeptSubmit}
        submitLabel={editingDept ? "Save" : "Create"}
        size="md"
      />

      <EntityFormModal
        open={payrollFormOpen}
        onOpenChange={setPayrollFormOpen}
        title={editingPayroll ? `Edit Payroll: ${editingPayroll.employeeName}` : "Add Payroll Record"}
        fields={payrollFields}
        initialData={editingPayroll ? { employeeId: editingPayroll.employeeId, period: editingPayroll.period, basicSalary: editingPayroll.basicSalary, overtime: editingPayroll.overtime, deductions: editingPayroll.deductions, bonuses: editingPayroll.bonuses, tax: editingPayroll.tax, status: editingPayroll.status } : undefined}
        onSubmit={handlePayrollSubmit}
        submitLabel={editingPayroll ? "Save" : "Create"}
        size="lg"
      />

      {/* ── Employee Detail Dialog ── */}
      <Dialog open={!!detailEmp} onOpenChange={(open) => { if (!open) setDetailEmp(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailEmp?.name}</DialogTitle>
          </DialogHeader>
          {detailEmp && (() => {
            const empLeaves = leaves.filter((l) => l.employeeId === detailEmp.id);
            const empPayroll = payroll.filter((p) => p.employeeId === detailEmp.id);
            const dept = departments.find((d) => d.name === detailEmp.department);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Employee #</span><p className="font-medium font-mono">{detailEmp.employeeId}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[detailEmp.status]}`}>{detailEmp.status}</span></p></div>
                  <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailEmp.email}</p></div>
                  <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{detailEmp.phone}</p></div>
                  <div><span className="text-sm text-muted-foreground">Department</span><p className="font-medium">{detailEmp.department}</p></div>
                  <div><span className="text-sm text-muted-foreground">Position</span><p className="font-medium">{detailEmp.position}</p></div>
                  <div><span className="text-sm text-muted-foreground">Hire Date</span><p className="font-medium">{detailEmp.hireDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Annual Salary</span><p className="font-medium text-lg">{fmt(detailEmp.salary)}</p></div>
                  {dept && <div><span className="text-sm text-muted-foreground">Department Manager</span><p className="font-medium">{dept.managerName}</p></div>}
                </div>
                {/* Leave History */}
                {empLeaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Leave History ({empLeaves.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {empLeaves.map((l) => (
                        <div key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[l.type]}`}>{l.type}</span>
                            <span className="text-muted-foreground ml-2">{l.startDate} - {l.endDate}</span>
                            <span className="text-muted-foreground ml-1">({l.days} days)</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[l.status]}`}>{l.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Payroll Records */}
                {empPayroll.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Payroll Records ({empPayroll.length})</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Period</th>
                            <th className="text-right px-3 py-2 font-medium">Basic</th>
                            <th className="text-right px-3 py-2 font-medium">Overtime</th>
                            <th className="text-right px-3 py-2 font-medium">Net Pay</th>
                            <th className="text-left px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {empPayroll.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2">{p.period}</td>
                              <td className="px-3 py-2 text-right">{fmt(p.basicSalary)}</td>
                              <td className="px-3 py-2 text-right">{fmt(p.overtime)}</td>
                              <td className="px-3 py-2 text-right font-semibold">{fmt(p.netPay)}</td>
                              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status]}`}>{p.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Department Detail Dialog ── */}
      <Dialog open={!!detailDept} onOpenChange={(open) => { if (!open) setDetailDept(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailDept?.name} Department</DialogTitle>
          </DialogHeader>
          {detailDept && (() => {
            const deptEmployees = employees.filter((e) => e.department === detailDept.name);
            const totalSalary = deptEmployees.reduce((s, e) => s + e.salary, 0);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Department ID</span><p className="font-medium font-mono">{detailDept.id}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manager</span><p className="font-medium">{detailDept.managerName}</p></div>
                  <div><span className="text-sm text-muted-foreground">Headcount</span><p className="font-medium text-lg">{deptEmployees.length}</p></div>
                  <div><span className="text-sm text-muted-foreground">Annual Budget</span><p className="font-medium text-lg">{fmt(detailDept.budget)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Total Salary Cost</span><p className="font-medium">{fmt(totalSalary)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Budget Utilization (Salary)</span><p className="font-medium">{Math.round((totalSalary / detailDept.budget) * 100)}%</p></div>
                </div>
                {/* Budget Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">{fmt(totalSalary)} / {fmt(detailDept.budget)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${totalSalary > detailDept.budget ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(Math.round((totalSalary / detailDept.budget) * 100), 100)}%` }} />
                  </div>
                </div>
                {/* Member List */}
                {deptEmployees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Members ({deptEmployees.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {deptEmployees.map((e) => (
                        <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{e.name} {}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{e.position}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{fmt(e.salary)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[e.status]}`}>{e.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deptEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No employees in this department.</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
