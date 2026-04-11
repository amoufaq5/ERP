"use client";

import { useState } from "react";
import {
  UserPlus, CheckSquare, TrendingUp, BarChart2, Plus, Search, ShieldCheck, FlaskConical, Pill,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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

const CATEGORY_COLORS: Record<OnboardingTask["category"], string> = {
  PAPERWORK: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IT_SETUP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  PRODUCT_TRAINING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  GMP_TRAINING: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  COMPLIANCE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  FIELD_ORIENTATION: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GPS_SETUP: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const STATUS_COLORS: Record<OnboardingTask["status"], string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const DEPARTMENT_ICONS: Record<string, typeof Pill> = {
  "Sales & Marketing": Pill,
  "Quality Assurance": FlaskConical,
  "R&D": FlaskConical,
  "Manufacturing": ShieldCheck,
  "Medical Affairs": ShieldCheck,
};

export default function OnboardingPage() {
  const [employees] = useState<OnboardingEmployee[]>(INITIAL_EMPLOYEES);
  const [tasks, setTasks] = useState<OnboardingTask[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");

  const totalHires = employees.length;
  const inProgress = employees.filter((e) => e.progress < 100).length;
  const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate = Math.round((tasksCompleted / tasks.length) * 100);
  const gmpCompliance = tasks.filter(t => t.category === "GMP_TRAINING" && t.status === "COMPLETED").length;
  const gmpTotal = tasks.filter(t => t.category === "GMP_TRAINING").length;

  const filteredTasks = tasks.filter(
    (t) =>
      t.employee.toLowerCase().includes(search.toLowerCase()) ||
      t.task.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  function toggleTaskStatus(id: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: Record<OnboardingTask["status"], OnboardingTask["status"]> = {
          PENDING: "IN_PROGRESS",
          IN_PROGRESS: "COMPLETED",
          COMPLETED: "PENDING",
        };
        return { ...t, status: next[t.status] };
      })
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pharmaceutical Onboarding" description="Track new hire onboarding across field force, manufacturing, QA, and R&D with GMP compliance" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="New Hires This Month" value={totalHires} icon={<UserPlus className="h-5 w-5" />} trend={{ value: 20.0, label: "vs last month" }} />
        <StatsCard title="Onboarding In Progress" value={inProgress} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Completion Rate" value={`${completionRate}%`} icon={<BarChart2 className="h-5 w-5" />} />
        <StatsCard title="GMP Training Progress" value={`${gmpCompliance}/${gmpTotal}`} icon={<ShieldCheck className="h-5 w-5" />} subtitle="Regulatory compliance" />
      </div>

      {/* Onboarding Cards */}
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

      {/* Training Categories Legend */}
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

      {/* Tasks Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h2 className="font-semibold text-foreground text-sm flex-1">Onboarding Tasks</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm w-56"
            />
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{task.employee}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.task}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[task.category]}`}>
                      {task.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.assignedTo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.dueDate}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:opacity-80 ${STATUS_COLORS[task.status]}`}
                    >
                      {task.status.replace("_", " ")}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
