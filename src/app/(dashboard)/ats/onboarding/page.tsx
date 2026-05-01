"use client";

import { useState, useMemo } from "react";
import {
  UserPlus, CheckSquare, TrendingUp, BarChart2, Plus, ShieldCheck, FlaskConical, Pill,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";

interface OnboardingEmployee {
  id: number;
  name: string;
  department: string;
  role: string;
  startDate: string;
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
}

interface OnboardingTask {
  id: number;
  employeeId: number;
  employee: string;
  task: string;
  category: "PAPERWORK" | "IT_SETUP" | "PRODUCT_TRAINING" | "GMP_TRAINING" | "COMPLIANCE" | "FIELD_ORIENTATION" | "GPS_SETUP";
  assignedTo: string;
  dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

const INITIAL_EMPLOYEES: OnboardingEmployee[] = [
  { id: 1, name: "Dr. Amira Hassan", department: "Sales & Marketing", role: "District Sales Manager - Cairo North", startDate: "2026-04-15", progress: 55, tasksTotal: 12, tasksCompleted: 7 },
  { id: 2, name: "Mohamed El-Sayed", department: "Sales & Marketing", role: "Medical Representative - Giza", startDate: "2026-04-15", progress: 30, tasksTotal: 14, tasksCompleted: 4 },
  { id: 3, name: "Dr. Fatima Khaled", department: "Quality Assurance", role: "QC Analyst - Lab B", startDate: "2026-04-08", progress: 85, tasksTotal: 11, tasksCompleted: 9 },
  { id: 4, name: "Dr. Khaled Nabil", department: "R&D", role: "Senior Formulation Scientist", startDate: "2026-04-05", progress: 92, tasksTotal: 13, tasksCompleted: 12 },
  { id: 5, name: "Noura Youssef", department: "Manufacturing", role: "Production Pharmacist", startDate: "2026-04-10", progress: 45, tasksTotal: 15, tasksCompleted: 7 },
  { id: 6, name: "Dr. Tarek Abdel-Fattah", department: "Medical Affairs", role: "Pharmacovigilance Officer", startDate: "2026-04-07", progress: 75, tasksTotal: 12, tasksCompleted: 9 },
];

const INITIAL_TASKS: OnboardingTask[] = [
  { id: 1, employeeId: 1, employee: "Dr. Amira Hassan", task: "Sign employment contract & NDA", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-04-15", status: "COMPLETED" },
  { id: 2, employeeId: 1, employee: "Dr. Amira Hassan", task: "Company vehicle allocation & GPS tracker setup", category: "GPS_SETUP", assignedTo: "Fleet Admin", dueDate: "2026-04-16", status: "COMPLETED" },
  { id: 3, employeeId: 1, employee: "Dr. Amira Hassan", task: "CRM access & mobile app installation (field visits)", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-04-16", status: "COMPLETED" },
  { id: 4, employeeId: 1, employee: "Dr. Amira Hassan", task: "Pharma product portfolio training (25 products)", category: "PRODUCT_TRAINING", assignedTo: "Product Manager", dueDate: "2026-04-22", status: "IN_PROGRESS" },
  { id: 5, employeeId: 1, employee: "Dr. Amira Hassan", task: "Ethical promotion & pharma code of conduct", category: "COMPLIANCE", assignedTo: "Compliance Officer", dueDate: "2026-04-18", status: "COMPLETED" },
  { id: 6, employeeId: 2, employee: "Mohamed El-Sayed", task: "Complete employment paperwork", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-04-15", status: "COMPLETED" },
  { id: 7, employeeId: 2, employee: "Mohamed El-Sayed", task: "GPS tracker activation for visit validation", category: "GPS_SETUP", assignedTo: "Fleet Admin", dueDate: "2026-04-16", status: "COMPLETED" },
  { id: 8, employeeId: 2, employee: "Mohamed El-Sayed", task: "Territory assignment & doctor directory briefing", category: "FIELD_ORIENTATION", assignedTo: "Dr. Amira Hassan (DM)", dueDate: "2026-04-17", status: "IN_PROGRESS" },
  { id: 9, employeeId: 2, employee: "Mohamed El-Sayed", task: "Product training - Cardiovascular line", category: "PRODUCT_TRAINING", assignedTo: "Medical Advisor", dueDate: "2026-04-20", status: "PENDING" },
  { id: 10, employeeId: 2, employee: "Mohamed El-Sayed", task: "Double visits with DM (5 calls)", category: "FIELD_ORIENTATION", assignedTo: "Dr. Amira Hassan (DM)", dueDate: "2026-04-25", status: "PENDING" },
  { id: 11, employeeId: 3, employee: "Dr. Fatima Khaled", task: "Lab safety & PPE training", category: "COMPLIANCE", assignedTo: "EHS Officer", dueDate: "2026-04-08", status: "COMPLETED" },
  { id: 12, employeeId: 3, employee: "Dr. Fatima Khaled", task: "Good Laboratory Practice (GLP) certification", category: "GMP_TRAINING", assignedTo: "QA Manager", dueDate: "2026-04-10", status: "COMPLETED" },
  { id: 13, employeeId: 3, employee: "Dr. Fatima Khaled", task: "HPLC operation & calibration training", category: "PRODUCT_TRAINING", assignedTo: "Senior Analyst", dueDate: "2026-04-14", status: "COMPLETED" },
  { id: 14, employeeId: 3, employee: "Dr. Fatima Khaled", task: "LIMS (Lab Information Management System) access", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-04-09", status: "COMPLETED" },
  { id: 15, employeeId: 4, employee: "Dr. Khaled Nabil", task: "R&D lab access & badge", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-04-05", status: "COMPLETED" },
  { id: 16, employeeId: 4, employee: "Dr. Khaled Nabil", task: "Formulation development SOPs review", category: "GMP_TRAINING", assignedTo: "R&D Director", dueDate: "2026-04-09", status: "COMPLETED" },
  { id: 17, employeeId: 4, employee: "Dr. Khaled Nabil", task: "Confidentiality & IP protection agreement", category: "COMPLIANCE", assignedTo: "Legal", dueDate: "2026-04-06", status: "COMPLETED" },
  { id: 18, employeeId: 5, employee: "Noura Youssef", task: "GMP training (EU & WHO standards)", category: "GMP_TRAINING", assignedTo: "QA Manager", dueDate: "2026-04-14", status: "IN_PROGRESS" },
  { id: 19, employeeId: 5, employee: "Noura Youssef", task: "Production floor orientation (Tablets & Capsules)", category: "FIELD_ORIENTATION", assignedTo: "Plant Manager", dueDate: "2026-04-12", status: "COMPLETED" },
  { id: 20, employeeId: 5, employee: "Noura Youssef", task: "Batch manufacturing record (BMR) training", category: "PRODUCT_TRAINING", assignedTo: "Production Head", dueDate: "2026-04-16", status: "IN_PROGRESS" },
  { id: 21, employeeId: 5, employee: "Noura Youssef", task: "Data integrity (ALCOA+) training", category: "COMPLIANCE", assignedTo: "QA Manager", dueDate: "2026-04-13", status: "COMPLETED" },
  { id: 22, employeeId: 6, employee: "Dr. Tarek Abdel-Fattah", task: "Pharmacovigilance database access (ArisGlobal)", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-04-08", status: "COMPLETED" },
  { id: 23, employeeId: 6, employee: "Dr. Tarek Abdel-Fattah", task: "ICH E2E safety reporting training", category: "PRODUCT_TRAINING", assignedTo: "Medical Director", dueDate: "2026-04-12", status: "COMPLETED" },
  { id: 24, employeeId: 6, employee: "Dr. Tarek Abdel-Fattah", task: "EDA pharmacovigilance regulations review", category: "COMPLIANCE", assignedTo: "Regulatory Head", dueDate: "2026-04-14", status: "IN_PROGRESS" },
];

const CATEGORIES: OnboardingTask["category"][] = ["PAPERWORK", "IT_SETUP", "PRODUCT_TRAINING", "GMP_TRAINING", "COMPLIANCE", "FIELD_ORIENTATION", "GPS_SETUP"];
const STATUSES: OnboardingTask["status"][] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const CATEGORY_COLORS: Record<OnboardingTask["category"], string> = {
  PAPERWORK: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IT_SETUP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  PRODUCT_TRAINING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  GMP_TRAINING: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  COMPLIANCE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  FIELD_ORIENTATION: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GPS_SETUP: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const DEPARTMENT_ICONS: Record<string, typeof Pill> = {
  "Sales & Marketing": Pill,
  "Quality Assurance": FlaskConical,
  "R&D": FlaskConical,
  "Manufacturing": ShieldCheck,
  "Medical Affairs": ShieldCheck,
};

// TASK_FIELDS is now computed inside the component to use store data

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
  { key: "category", label: "Category", type: "select" as const, options: CATEGORIES.map((c) => ({ label: c.replace(/_/g, " "), value: c })) },
];

const taskStatusFlow: Record<string, OnboardingTask["status"]> = { PENDING: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };

export default function OnboardingPage() {
  const store = useApiDataStore();
  const [employees] = useState<OnboardingEmployee[]>(INITIAL_EMPLOYEES);
  const [tasks, setTasks] = useState<OnboardingTask[]>(INITIAL_TASKS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", category: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OnboardingTask | null>(null);
  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);

  // Build employee options from local onboarding list + store candidates (hired status)
  const employeeOptions = useMemo(() => {
    const localNames = new Set(INITIAL_EMPLOYEES.map(e => e.name));
    const storeNames = store.candidates
      .filter(c => c.status === "HIRED" && !localNames.has(c.name))
      .map(c => ({ label: c.name, value: c.name }));
    return [
      ...INITIAL_EMPLOYEES.map(e => ({ label: e.name, value: e.name })),
      ...storeNames,
    ];
  }, [store.candidates]);

  const taskFields: EntityField[] = useMemo(() => [
    { name: "employee", label: "Employee", type: "select" as const, required: true, options: employeeOptions },
    { name: "task", label: "Task Description", type: "text" as const, placeholder: "Describe the onboarding task", required: true, fullWidth: true },
    { name: "category", label: "Category", type: "select" as const, required: true, options: CATEGORIES.map((c) => ({ label: c.replace(/_/g, " "), value: c })) },
    { name: "assignedTo", label: "Assigned To", type: "text" as const, placeholder: "Person or team responsible" },
    { name: "dueDate", label: "Due Date", type: "text" as const, placeholder: "YYYY-MM-DD" },
    { name: "status", label: "Status", type: "select" as const, defaultValue: "PENDING", options: STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
  ], [employeeOptions]);

  const totalHires = employees.length;
  const inProgress = employees.filter((e) => e.progress < 100).length;
  const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate = Math.round((tasksCompleted / tasks.length) * 100);
  const gmpCompliance = tasks.filter((t) => t.category === "GMP_TRAINING" && t.status === "COMPLETED").length;
  const gmpTotal = tasks.filter((t) => t.category === "GMP_TRAINING").length;

  const filteredTasks = tasks.filter((t) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || t.employee.toLowerCase().includes(q) || t.task.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q);
    const matchesStatus = !filters.status || t.status === filters.status;
    const matchesCategory = !filters.category || t.category === filters.category;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const taskColumns: Column<Record<string, unknown>>[] = [
    { key: "employee", label: "Employee" },
    { key: "task", label: "Task" },
    { key: "category", label: "Category", render: (v) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[v as OnboardingTask["category"]]}`}>
        {(v as string).replace(/_/g, " ")}
      </span>
    )},
    { key: "assignedTo", label: "Assigned To" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status", render: (v) => {
      const colors: Record<string, string> = {
        PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
        IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      };
      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[v as string]}`}>{(v as string).replace(/_/g, " ")}</span>;
    }},
    {
      key: "id", label: "",
      render: (_v, row) => {
        const t = tasks.find((x) => x.id === row.id);
        if (!t) return null;
        const next = taskStatusFlow[t.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(t); setShowModal(true); }}
            onDelete={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
            onView={() => setDetailTask(t)}
            canView
            itemLabel={t.task}
            extraItems={[
              ...(next ? [{ label: `Mark ${next.replace(/_/g, " ")}`, onClick: () => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x)) }] : []),
              ...(t.status === "COMPLETED" ? [{ label: "Reopen", onClick: () => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "PENDING" as OnboardingTask["status"] } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pharmaceutical Onboarding" description="Track new hire onboarding across field force, manufacturing, QA, and R&D with GMP compliance">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="New Hires This Month" value={totalHires} icon={UserPlus} change={20.0} changeLabel="vs last month" />
        <StatsCard title="Onboarding In Progress" value={inProgress} icon={TrendingUp} />
        <StatsCard title="Completion Rate" value={`${completionRate}%`} icon={BarChart2} />
        <StatsCard title="GMP Training Progress" value={`${gmpCompliance}/${gmpTotal}`} icon={ShieldCheck} subtitle="Regulatory compliance" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">New Hire Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const Icon = DEPARTMENT_ICONS[emp.department] ?? Pill;
            return (
              <div key={emp.id} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{emp.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{emp.role}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{emp.department}</span>
                    <span>Start: {emp.startDate}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-foreground">
                    <span>Progress</span>
                    <span>{emp.progress}%</span>
                  </div>
                  <Progress value={emp.progress} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{emp.tasksCompleted}</span>/{emp.tasksTotal} tasks completed
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Pharma Onboarding Tracks</h3>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">Paperwork & Contracts</span>
          <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-800">IT / CRM Setup</span>
          <span className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-800">GPS Vehicle Tracker</span>
          <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-800">Product Training</span>
          <span className="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-800">GMP / GLP / GCP Training</span>
          <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800">Compliance & Ethics</span>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800">Field Orientation (Double Visits)</span>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground text-base mb-4">Onboarding Tasks</h2>
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={taskColumns} data={filteredTasks as unknown as Record<string, unknown>[]} emptyMessage="No tasks found." exportable exportFilename="onboarding-tasks.csv" />
        </div>
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditing(null); }}
        title={editing ? "Edit Task" : "Add Onboarding Task"}
        fields={taskFields}
        initialData={editing ? { employee: editing.employee, task: editing.task, category: editing.category, assignedTo: editing.assignedTo, dueDate: editing.dueDate, status: editing.status } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setTasks((prev) => prev.map((t) => t.id === editing.id ? {
              ...t,
              employee: (data.employee as string) || t.employee,
              task: (data.task as string) || t.task,
              category: (data.category as OnboardingTask["category"]) || t.category,
              assignedTo: (data.assignedTo as string) || t.assignedTo,
              dueDate: (data.dueDate as string) || t.dueDate,
              status: (data.status as OnboardingTask["status"]) || t.status,
            } : t));
          } else {
            const emp = employees.find((e) => e.name === data.employee);
            const newTask: OnboardingTask = {
              id: Date.now(),
              employeeId: emp?.id ?? 0,
              employee: data.employee as string,
              task: data.task as string,
              category: (data.category as OnboardingTask["category"]) || "PAPERWORK",
              assignedTo: (data.assignedTo as string) || "Unassigned",
              dueDate: (data.dueDate as string) || new Date().toISOString().slice(0, 10),
              status: (data.status as OnboardingTask["status"]) || "PENDING",
            };
            setTasks((prev) => [newTask, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Onboarding Task Detail Dialog ── */}
      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTask?.task}</DialogTitle>
          </DialogHeader>
          {detailTask && (() => {
            const statusColors: Record<string, string> = {
              PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
              IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
              COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            };
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Employee</span><p className="font-medium">{detailTask.employee}</p></div>
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[detailTask.category]}`}>{detailTask.category.replace(/_/g, " ")}</span></p>
                  </div>
                  <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{detailTask.assignedTo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Due Date</span><p className="font-medium">{detailTask.dueDate}</p></div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[detailTask.status]}`}>{detailTask.status.replace(/_/g, " ")}</span></p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Task Description</span>
                  <p className="font-medium mt-1">{detailTask.task}</p>
                </div>
                {/* Cross-reference: HR module employee record */}
                {(() => {
                  const hrEmployee = store.employees.find(e => e.name === detailTask.employee);
                  return (
                    <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HR Module Record</span>
                      {hrEmployee ? (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-foreground font-medium">{hrEmployee.name}</span>
                          <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 text-xs font-semibold">
                            {hrEmployee.status}
                          </span>
                          <span className="text-muted-foreground">{hrEmployee.department} &middot; {hrEmployee.position}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not yet added to HR module</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
