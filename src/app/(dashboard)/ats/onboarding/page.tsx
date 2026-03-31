"use client";

import { useState } from "react";
import {
  UserPlus, CheckSquare, TrendingUp, BarChart2, Plus, Search,
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
  category: "PAPERWORK" | "IT_SETUP" | "TRAINING" | "ORIENTATION" | "COMPLIANCE";
  assignedTo: string;
  dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

const INITIAL_EMPLOYEES: OnboardingEmployee[] = [
  { id: 1, name: "Sophia Martinez", department: "Engineering", role: "Software Engineer", startDate: "2026-04-01", progress: 65, tasksTotal: 10, tasksCompleted: 6 },
  { id: 2, name: "James Anderson", department: "Sales", role: "Account Executive", startDate: "2026-04-01", progress: 30, tasksTotal: 8, tasksCompleted: 2 },
  { id: 3, name: "Olivia Thompson", department: "Marketing", role: "Content Strategist", startDate: "2026-03-25", progress: 85, tasksTotal: 9, tasksCompleted: 7 },
  { id: 4, name: "Ethan Williams", department: "Finance", role: "Financial Analyst", startDate: "2026-03-24", progress: 45, tasksTotal: 11, tasksCompleted: 5 },
];

const INITIAL_TASKS: OnboardingTask[] = [
  { id: 1, employeeId: 1, employee: "Sophia Martinez", task: "Complete I-9 Employment Verification", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-04-01", status: "COMPLETED" },
  { id: 2, employeeId: 1, employee: "Sophia Martinez", task: "Laptop & developer tools setup", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-04-01", status: "COMPLETED" },
  { id: 3, employeeId: 1, employee: "Sophia Martinez", task: "Engineering onboarding training", category: "TRAINING", assignedTo: "Mark Chen", dueDate: "2026-04-03", status: "IN_PROGRESS" },
  { id: 4, employeeId: 2, employee: "James Anderson", task: "Sign employment contract", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-04-01", status: "COMPLETED" },
  { id: 5, employeeId: 2, employee: "James Anderson", task: "CRM system access", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-04-02", status: "IN_PROGRESS" },
  { id: 6, employeeId: 2, employee: "James Anderson", task: "Sales methodology training", category: "TRAINING", assignedTo: "Sales Manager", dueDate: "2026-04-05", status: "PENDING" },
  { id: 7, employeeId: 3, employee: "Olivia Thompson", task: "Benefits enrollment", category: "PAPERWORK", assignedTo: "HR Team", dueDate: "2026-03-25", status: "COMPLETED" },
  { id: 8, employeeId: 3, employee: "Olivia Thompson", task: "Company orientation session", category: "ORIENTATION", assignedTo: "HR Team", dueDate: "2026-03-25", status: "COMPLETED" },
  { id: 9, employeeId: 4, employee: "Ethan Williams", task: "Security & compliance training", category: "COMPLIANCE", assignedTo: "Compliance Team", dueDate: "2026-03-28", status: "COMPLETED" },
  { id: 10, employeeId: 4, employee: "Ethan Williams", task: "Finance system access setup", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-03-27", status: "IN_PROGRESS" },
  { id: 11, employeeId: 3, employee: "Olivia Thompson", task: "Social media tool access", category: "IT_SETUP", assignedTo: "IT Team", dueDate: "2026-03-26", status: "COMPLETED" },
  { id: 12, employeeId: 1, employee: "Sophia Martinez", task: "Code of conduct acknowledgement", category: "COMPLIANCE", assignedTo: "HR Team", dueDate: "2026-04-01", status: "COMPLETED" },
];

const CATEGORY_COLORS: Record<OnboardingTask["category"], string> = {
  PAPERWORK: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IT_SETUP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  TRAINING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ORIENTATION: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  COMPLIANCE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_COLORS: Record<OnboardingTask["status"], string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function OnboardingPage() {
  const [employees] = useState<OnboardingEmployee[]>(INITIAL_EMPLOYEES);
  const [tasks, setTasks] = useState<OnboardingTask[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");

  const totalHires = employees.length;
  const inProgress = employees.filter((e) => e.progress < 100).length;
  const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate = Math.round((tasksCompleted / tasks.length) * 100);

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
      <PageHeader title="Onboarding" description="Track new hire onboarding progress and tasks" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="New Hires This Month" value={totalHires} icon={<UserPlus className="h-5 w-5" />} trend={{ value: 15.0, label: "vs last month" }} />
        <StatsCard title="Onboarding In Progress" value={inProgress} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Tasks Completed" value={tasksCompleted} icon={<CheckSquare className="h-5 w-5" />} />
        <StatsCard title="Completion Rate" value={`${completionRate}%`} icon={<BarChart2 className="h-5 w-5" />} />
      </div>

      {/* Onboarding Cards */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">New Hire Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.role}</div>
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
          ))}
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
                      {task.category.replace("_", " ")}
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
