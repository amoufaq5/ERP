"use client";

import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Column } from "@/components/shared/data-table";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  User,
  Eye,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  client: string;
  manager: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  status: string;
  description: string;
};

type Task = {
  id: string;
  title: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: string;
  hours: number;
  status: string;
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const initialProjects: Project[] = [
  { id: "1", name: "ERP System Rollout", client: "Acme Corp", manager: "Sarah Johnson", startDate: "2026-01-15", endDate: "2026-07-31", budget: 180000, spent: 92000, progress: 52, status: "In Progress", description: "Full ERP system implementation including finance, HR, and inventory modules." },
  { id: "2", name: "Website Redesign", client: "Globex Inc", manager: "Michael Torres", startDate: "2026-02-01", endDate: "2026-04-30", budget: 45000, spent: 38500, progress: 85, status: "In Progress", description: "Complete overhaul of the corporate website with new branding and CMS." },
  { id: "3", name: "Mobile App v2.0", client: "Internal", manager: "Emily Chen", startDate: "2026-03-01", endDate: "2026-09-30", budget: 120000, spent: 18000, progress: 15, status: "In Progress", description: "Major version release of the mobile application with offline support." },
  { id: "4", name: "Data Warehouse Migration", client: "Initech LLC", manager: "David Kim", startDate: "2025-10-01", endDate: "2026-01-31", budget: 95000, spent: 97200, progress: 100, status: "Completed", description: "Migration of legacy data warehouse to cloud-based solution." },
];

const initialTasks: Task[] = [
  { id: "1", title: "Design system architecture", project: "ERP System Rollout", assignee: "Sarah Johnson", dueDate: "2026-04-05", priority: "High", hours: 16, status: "Completed" },
  { id: "2", title: "Implement finance module API", project: "ERP System Rollout", assignee: "James Park", dueDate: "2026-04-20", priority: "High", hours: 40, status: "In Progress" },
  { id: "3", title: "UI mockups — homepage", project: "Website Redesign", assignee: "Anna White", dueDate: "2026-04-10", priority: "Medium", hours: 12, status: "Review" },
  { id: "4", title: "Migrate product pages", project: "Website Redesign", assignee: "Michael Torres", dueDate: "2026-04-18", priority: "High", hours: 20, status: "In Progress" },
  { id: "5", title: "Offline sync architecture", project: "Mobile App v2.0", assignee: "Emily Chen", dueDate: "2026-05-01", priority: "High", hours: 32, status: "Todo" },
  { id: "6", title: "Push notification service", project: "Mobile App v2.0", assignee: "Carlos Rivera", dueDate: "2026-05-15", priority: "Medium", hours: 24, status: "Todo" },
  { id: "7", title: "ETL pipeline testing", project: "Data Warehouse Migration", assignee: "David Kim", dueDate: "2026-01-20", priority: "High", hours: 28, status: "Completed" },
  { id: "8", title: "User acceptance testing", project: "ERP System Rollout", assignee: "Lisa Morgan", dueDate: "2026-04-28", priority: "Medium", hours: 20, status: "On Hold" },
];

const priorityColors: Record<string, string> = {
  High: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
  Medium: "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
  Low: "text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
};

const PROJECT_FIELDS: EntityField[] = [
  { name: "name", label: "Project Name", type: "text", placeholder: "Project name", required: true, fullWidth: true },
  { name: "client", label: "Client", type: "text", placeholder: "Client / Internal" },
  { name: "manager", label: "Project Manager", type: "text", placeholder: "Manager name" },
  { name: "startDate", label: "Start Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "endDate", label: "End Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "budget", label: "Budget ($)", type: "number", placeholder: "0" },
  { name: "description", label: "Description", type: "text", placeholder: "Brief project description", fullWidth: true },
  { name: "status", label: "Status", type: "select", defaultValue: "In Progress", options: [
    { label: "In Progress", value: "In Progress" }, { label: "On Hold", value: "On Hold" },
    { label: "Completed", value: "Completed" }, { label: "Cancelled", value: "Cancelled" },
  ]},
];

const TASK_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Todo", value: "Todo" }, { label: "In Progress", value: "In Progress" },
    { label: "Review", value: "Review" }, { label: "Completed", value: "Completed" }, { label: "On Hold", value: "On Hold" },
  ]},
  { key: "priority", label: "Priority", type: "select" as const, options: [
    { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
];

const projectFlow: Record<string, string> = { "In Progress": "On Hold", "On Hold": "In Progress" };
const taskFlow: Record<string, string> = { Todo: "In Progress", "In Progress": "Review", Review: "Completed" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", priority: "" });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const activeProjects = projects.filter((p) => p.status === "In Progress").length;
  const totalTasks = tasks.length;
  const hoursLogged = tasks.reduce((s, t) => s + t.hours, 0);
  const avgBudgetUtil = Math.round(projects.reduce((s, p) => s + (p.spent / p.budget) * 100, 0) / projects.length);

  const filteredTasks = tasks.filter((t) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q);
    const matchesStatus = !filters.status || t.status === filters.status;
    const matchesPriority = !filters.priority || t.priority === filters.priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const taskFields: EntityField[] = [
    { name: "title", label: "Task Title", type: "text", placeholder: "Task title", required: true, fullWidth: true },
    { name: "project", label: "Project", type: "select", required: true, options: projects.map((p) => ({ label: p.name, value: p.name })) },
    { name: "assignee", label: "Assignee", type: "text", placeholder: "Team member name" },
    { name: "dueDate", label: "Due Date", type: "text", placeholder: "YYYY-MM-DD" },
    { name: "hours", label: "Estimated Hours", type: "number", placeholder: "0" },
    { name: "priority", label: "Priority", type: "select", defaultValue: "Medium", options: [
      { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
    ]},
    { name: "status", label: "Status", type: "select", defaultValue: "Todo", options: [
      { label: "Todo", value: "Todo" }, { label: "In Progress", value: "In Progress" },
      { label: "Review", value: "Review" }, { label: "Completed", value: "Completed" }, { label: "On Hold", value: "On Hold" },
    ]},
  ];

  const taskColumns: Column<Record<string, unknown>>[] = [
    { key: "title", label: "Task" },
    { key: "project", label: "Project" },
    { key: "assignee", label: "Assignee", render: (v) => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-semibold">
          {(v as string).split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <span>{v as string}</span>
      </div>
    )},
    { key: "dueDate", label: "Due Date" },
    { key: "priority", label: "Priority", render: (v) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityColors[v as string] ?? ""}`}>
        {v as string}
      </span>
    )},
    { key: "hours", label: "Hours" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const t = tasks.find((x) => x.id === row.id);
        if (!t) return null;
        const next = taskFlow[t.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingTask(t); setShowTaskModal(true); }}
            onDelete={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
            itemLabel={t.title}
            extraItems={[
              ...(next ? [{ label: `Move to ${next}`, onClick: () => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x)) }] : []),
              ...(t.status !== "On Hold" && t.status !== "Completed" ? [{ label: "Put On Hold", onClick: () => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "On Hold" } : x)) }] : []),
              ...(t.status === "On Hold" ? [{ label: "Resume", onClick: () => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "In Progress" } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Projects" description="Track projects, tasks, and team utilization">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
          <Button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Projects" value={activeProjects.toLocaleString()} subtitle="Currently in progress" icon={<FolderKanban className="h-5 w-5" />} />
        <StatsCard title="Total Tasks" value={totalTasks.toLocaleString()} subtitle="Across all projects" icon={<CheckSquare className="h-5 w-5" />} trend={{ value: 8.2, label: "vs last sprint" }} />
        <StatsCard title="Hours Logged" value={hoursLogged.toLocaleString() + " hrs"} subtitle="Total effort recorded" icon={<Clock className="h-5 w-5" />} trend={{ value: 5.4, label: "vs last month" }} />
        <StatsCard title="Budget Utilization" value={avgBudgetUtil + "%"} subtitle="Average across projects" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const budgetPct = Math.min(Math.round((p.spent / p.budget) * 100), 100);
            const overBudget = p.spent > p.budget;
            const next = projectFlow[p.status];
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <StatusBadge status={p.status} />
                    <EditDeleteMenu
                      onEdit={() => { setEditingProject(p); setShowProjectModal(true); }}
                      onDelete={() => setProjects((prev) => prev.filter((x) => x.id !== p.id))}
                      onView={() => setDetailProject(p)}
                      canView
                      itemLabel={p.name}
                      extraItems={[
                        ...(next ? [{ label: `Set ${next}`, onClick: () => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x)) }] : []),
                        ...(p.status === "In Progress" ? [{ label: "Mark Completed", onClick: () => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "Completed", progress: 100 } : x)) }] : []),
                      ]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" /><span>{p.client}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><FolderKanban className="h-3.5 w-3.5" /><span>{p.manager}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{p.startDate}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{p.endDate}</span></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget</span>
                    <span className={`font-medium ${overBudget ? "text-red-600" : ""}`}>{fmt(p.spent)} / {fmt(p.budget)} ({budgetPct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-muted-foreground">{tasks.filter((t) => t.project === p.name).length} tasks</span>
                  <span className="text-muted-foreground">{tasks.filter((t) => t.project === p.name && t.status === "Completed").length} completed</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">All Tasks</h2>
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={TASK_FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={taskColumns} data={filteredTasks as unknown as Record<string, unknown>[]} emptyMessage="No tasks found." />
        </div>
      </div>

      <EntityFormModal
        open={showProjectModal}
        onOpenChange={(open) => { if (!open) { setShowProjectModal(false); setEditingProject(null); } }}
        title={editingProject ? "Edit Project" : "New Project"}
        fields={PROJECT_FIELDS}
        initialData={editingProject ? { name: editingProject.name, client: editingProject.client, manager: editingProject.manager, startDate: editingProject.startDate, endDate: editingProject.endDate, budget: editingProject.budget, description: editingProject.description, status: editingProject.status } : undefined}
        onSubmit={(data) => {
          if (editingProject) {
            setProjects((prev) => prev.map((p) => p.id === editingProject.id ? {
              ...p,
              name: (data.name as string) || p.name,
              client: (data.client as string) || p.client,
              manager: (data.manager as string) || p.manager,
              startDate: (data.startDate as string) || p.startDate,
              endDate: (data.endDate as string) || p.endDate,
              budget: (data.budget as number) || p.budget,
              description: (data.description as string) || p.description,
              status: (data.status as string) || p.status,
            } : p));
          } else {
            const proj: Project = {
              id: String(Date.now()),
              name: data.name as string,
              client: (data.client as string) || "Internal",
              manager: (data.manager as string) || "Unassigned",
              startDate: (data.startDate as string) || new Date().toISOString().slice(0, 10),
              endDate: (data.endDate as string) || "2027-01-01",
              budget: (data.budget as number) || 0,
              spent: 0,
              progress: 0,
              status: (data.status as string) || "In Progress",
              description: (data.description as string) || "",
            };
            setProjects((prev) => [proj, ...prev]);
          }
          setShowProjectModal(false);
          setEditingProject(null);
        }}
      />

      <EntityFormModal
        open={showTaskModal}
        onOpenChange={(open) => { if (!open) { setShowTaskModal(false); setEditingTask(null); } }}
        title={editingTask ? "Edit Task" : "New Task"}
        fields={taskFields}
        initialData={editingTask ? { title: editingTask.title, project: editingTask.project, assignee: editingTask.assignee, dueDate: editingTask.dueDate, hours: editingTask.hours, priority: editingTask.priority, status: editingTask.status } : undefined}
        onSubmit={(data) => {
          if (editingTask) {
            setTasks((prev) => prev.map((t) => t.id === editingTask.id ? {
              ...t,
              title: (data.title as string) || t.title,
              project: (data.project as string) || t.project,
              assignee: (data.assignee as string) || t.assignee,
              dueDate: (data.dueDate as string) || t.dueDate,
              hours: (data.hours as number) ?? t.hours,
              priority: (data.priority as string) || t.priority,
              status: (data.status as string) || t.status,
            } : t));
          } else {
            const task: Task = {
              id: String(Date.now()),
              title: data.title as string,
              project: data.project as string,
              assignee: (data.assignee as string) || "Unassigned",
              dueDate: (data.dueDate as string) || "2026-05-01",
              priority: (data.priority as string) || "Medium",
              hours: (data.hours as number) || 0,
              status: (data.status as string) || "Todo",
            };
            setTasks((prev) => [task, ...prev]);
          }
          setShowTaskModal(false);
          setEditingTask(null);
        }}
      />

      {/* ── Project Detail Dialog ── */}
      <Dialog open={!!detailProject} onOpenChange={(open) => { if (!open) setDetailProject(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailProject?.name}</DialogTitle>
          </DialogHeader>
          {detailProject && (() => {
            const projectTasks = tasks.filter((t) => t.project === detailProject.name);
            const completedTasks = projectTasks.filter((t) => t.status === "Completed");
            const budgetPct = Math.min(Math.round((detailProject.spent / detailProject.budget) * 100), 100);
            const overBudget = detailProject.spent > detailProject.budget;
            const teamMembers = Array.from(new Set(projectTasks.map((t) => t.assignee)));
            const totalHours = projectTasks.reduce((s, t) => s + t.hours, 0);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Client</span><p className="font-medium">{detailProject.client}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manager</span><p className="font-medium">{detailProject.manager}</p></div>
                  <div><span className="text-sm text-muted-foreground">Start Date</span><p className="font-medium">{detailProject.startDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">End Date</span><p className="font-medium">{detailProject.endDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailProject.status} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Total Hours</span><p className="font-medium">{totalHours} hrs</p></div>
                </div>
                {detailProject.description && (
                  <div><span className="text-sm text-muted-foreground">Description</span><p className="font-medium">{detailProject.description}</p></div>
                )}
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{detailProject.progress}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${detailProject.progress}%` }} />
                  </div>
                </div>
                {/* Budget */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Budget</span>
                    <span className={`font-medium ${overBudget ? "text-red-600" : ""}`}>{fmt(detailProject.spent)} / {fmt(detailProject.budget)} ({budgetPct}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                  </div>
                </div>
                {/* Team Members */}
                {teamMembers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Team Members ({teamMembers.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map((m) => (
                        <Badge key={m} variant="secondary">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Task List */}
                {projectTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tasks ({completedTasks.length}/{projectTasks.length} completed)</h4>
                    <div className="border rounded-lg divide-y">
                      {projectTasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{t.title}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{t.assignee}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColors[t.priority] ?? ""}`}>{t.priority}</span>
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Milestone Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Milestone Timeline</h4>
                  <div className="flex items-center gap-1">
                    {["Kickoff", "Design", "Development", "Testing", "Launch"].map((milestone, i) => {
                      const stepPct = (i / 4) * 100;
                      const isReached = detailProject.progress >= stepPct;
                      const isCurrent = detailProject.progress >= stepPct && detailProject.progress < stepPct + 25;
                      return (
                        <div key={milestone} className="flex items-center gap-1 flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isReached ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{milestone}</span>
                          </div>
                          {i < 4 && <div className={`h-0.5 flex-1 -mt-4 ${isReached && i < Math.floor(detailProject.progress / 25) ? "bg-primary/60" : "bg-muted"}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
