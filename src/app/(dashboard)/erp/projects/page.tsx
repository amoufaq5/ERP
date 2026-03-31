"use client"

import { useState } from "react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable from "@/components/shared/data-table"
import StatusBadge from "@/components/shared/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FolderKanban,
  CheckSquare,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  User,
} from "lucide-react"

type Project = {
  id: string
  name: string
  client: string
  manager: string
  startDate: string
  endDate: string
  budget: number
  spent: number
  progress: number
  status: string
  description: string
}

type Task = {
  id: string
  title: string
  project: string
  assignee: string
  dueDate: string
  priority: string
  hours: number
  status: string
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const initialProjects: Project[] = [
  {
    id: "1",
    name: "ERP System Rollout",
    client: "Acme Corp",
    manager: "Sarah Johnson",
    startDate: "2026-01-15",
    endDate: "2026-07-31",
    budget: 180000,
    spent: 92000,
    progress: 52,
    status: "In Progress",
    description: "Full ERP system implementation including finance, HR, and inventory modules.",
  },
  {
    id: "2",
    name: "Website Redesign",
    client: "Globex Inc",
    manager: "Michael Torres",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    budget: 45000,
    spent: 38500,
    progress: 85,
    status: "In Progress",
    description: "Complete overhaul of the corporate website with new branding and CMS.",
  },
  {
    id: "3",
    name: "Mobile App v2.0",
    client: "Internal",
    manager: "Emily Chen",
    startDate: "2026-03-01",
    endDate: "2026-09-30",
    budget: 120000,
    spent: 18000,
    progress: 15,
    status: "In Progress",
    description: "Major version release of the mobile application with offline support.",
  },
  {
    id: "4",
    name: "Data Warehouse Migration",
    client: "Initech LLC",
    manager: "David Kim",
    startDate: "2025-10-01",
    endDate: "2026-01-31",
    budget: 95000,
    spent: 97200,
    progress: 100,
    status: "Completed",
    description: "Migration of legacy data warehouse to cloud-based solution.",
  },
]

const initialTasks: Task[] = [
  { id: "1", title: "Design system architecture", project: "ERP System Rollout", assignee: "Sarah Johnson", dueDate: "2026-04-05", priority: "High", hours: 16, status: "Completed" },
  { id: "2", title: "Implement finance module API", project: "ERP System Rollout", assignee: "James Park", dueDate: "2026-04-20", priority: "High", hours: 40, status: "In Progress" },
  { id: "3", title: "UI mockups — homepage", project: "Website Redesign", assignee: "Anna White", dueDate: "2026-04-10", priority: "Medium", hours: 12, status: "Review" },
  { id: "4", title: "Migrate product pages", project: "Website Redesign", assignee: "Michael Torres", dueDate: "2026-04-18", priority: "High", hours: 20, status: "In Progress" },
  { id: "5", title: "Offline sync architecture", project: "Mobile App v2.0", assignee: "Emily Chen", dueDate: "2026-05-01", priority: "High", hours: 32, status: "Todo" },
  { id: "6", title: "Push notification service", project: "Mobile App v2.0", assignee: "Carlos Rivera", dueDate: "2026-05-15", priority: "Medium", hours: 24, status: "Todo" },
  { id: "7", title: "ETL pipeline testing", project: "Data Warehouse Migration", assignee: "David Kim", dueDate: "2026-01-20", priority: "High", hours: 28, status: "Completed" },
  { id: "8", title: "User acceptance testing", project: "ERP System Rollout", assignee: "Lisa Morgan", dueDate: "2026-04-28", priority: "Medium", hours: 20, status: "On Hold" },
]

const priorityColors: Record<string, string> = {
  High: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
  Medium: "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
  Low: "text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [projectOpen, setProjectOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  const [newProject, setNewProject] = useState({ name: "", client: "", manager: "", startDate: "", endDate: "", budget: "", status: "In Progress", description: "" })
  const [newTask, setNewTask] = useState({ title: "", project: "", assignee: "", dueDate: "", priority: "Medium", hours: "", status: "Todo" })

  const activeProjects = projects.filter(p => p.status === "In Progress").length
  const totalTasks = tasks.length
  const hoursLogged = tasks.reduce((s, t) => s + t.hours, 0)
  const avgBudgetUtil = Math.round(projects.reduce((s, p) => s + (p.spent / p.budget) * 100, 0) / projects.length)

  const handleAddProject = () => {
    if (!newProject.name) return
    const proj: Project = {
      id: String(Date.now()),
      name: newProject.name,
      client: newProject.client || "Internal",
      manager: newProject.manager || "Unassigned",
      startDate: newProject.startDate || new Date().toISOString().slice(0, 10),
      endDate: newProject.endDate || "2027-01-01",
      budget: parseFloat(newProject.budget) || 0,
      spent: 0,
      progress: 0,
      status: newProject.status,
      description: newProject.description,
    }
    setProjects(prev => [proj, ...prev])
    setNewProject({ name: "", client: "", manager: "", startDate: "", endDate: "", budget: "", status: "In Progress", description: "" })
    setProjectOpen(false)
  }

  const handleAddTask = () => {
    if (!newTask.title || !newTask.project) return
    const task: Task = {
      id: String(Date.now()),
      title: newTask.title,
      project: newTask.project,
      assignee: newTask.assignee || "Unassigned",
      dueDate: newTask.dueDate || "2026-05-01",
      priority: newTask.priority,
      hours: parseInt(newTask.hours) || 0,
      status: newTask.status,
    }
    setTasks(prev => [task, ...prev])
    setNewTask({ title: "", project: "", assignee: "", dueDate: "", priority: "Medium", hours: "", status: "Todo" })
    setTaskOpen(false)
  }

  const taskColumns = [
    { key: "title", label: "Task" },
    { key: "project", label: "Project" },
    { key: "assignee", label: "Assignee", render: (v: unknown) => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-semibold">
          {(v as string).split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <span>{v as string}</span>
      </div>
    )},
    { key: "dueDate", label: "Due Date" },
    { key: "priority", label: "Priority", render: (v: unknown) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityColors[v as string] ?? ""}`}>
        {v as string}
      </span>
    )},
    { key: "hours", label: "Hours" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Projects" description="Track projects, tasks, and team utilization">
        <Button variant="outline" onClick={() => setTaskOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
        <Button onClick={() => setProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Projects"
          value={activeProjects.toLocaleString()}
          subtitle="Currently in progress"
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <StatsCard
          title="Total Tasks"
          value={totalTasks.toLocaleString()}
          subtitle="Across all projects"
          icon={<CheckSquare className="h-5 w-5" />}
          trend={{ value: 8.2, label: "vs last sprint" }}
        />
        <StatsCard
          title="Hours Logged"
          value={hoursLogged.toLocaleString() + " hrs"}
          subtitle="Total effort recorded"
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: 5.4, label: "vs last month" }}
        />
        <StatsCard
          title="Budget Utilization"
          value={avgBudgetUtil + "%"}
          subtitle="Average across projects"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Project Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => {
            const budgetPct = Math.min(Math.round((p.spent / p.budget) * 100), 100)
            const overBudget = p.spent > p.budget
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                  <StatusBadge status={p.status} className="ml-3 shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{p.client}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>{p.manager}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{p.startDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{p.endDate}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
                {/* Budget */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget</span>
                    <span className={`font-medium ${overBudget ? "text-red-600" : ""}`}>
                      {fmt(p.spent)} / {fmt(p.budget)} ({budgetPct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-muted-foreground">
                    {tasks.filter(t => t.project === p.name).length} tasks
                  </span>
                  <span className="text-muted-foreground">
                    {tasks.filter(t => t.project === p.name && t.status === "Completed").length} completed
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tasks Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Tasks</h2>
        <DataTable
          columns={taskColumns as Parameters<typeof DataTable>[0]["columns"]}
          data={tasks as Record<string, unknown>[]}
          emptyMessage="No tasks found."
        />
      </div>

      {/* New Project Dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input placeholder="Project name" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input placeholder="Client / Internal" value={newProject.client} onChange={e => setNewProject(p => ({ ...p, client: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Project Manager</Label>
                <Input placeholder="Manager name" value={newProject.manager} onChange={e => setNewProject(p => ({ ...p, manager: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={newProject.startDate} onChange={e => setNewProject(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={newProject.endDate} onChange={e => setNewProject(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Input type="number" placeholder="0.00" value={newProject.budget} onChange={e => setNewProject(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Brief project description" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newProject.status} onValueChange={v => setNewProject(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["In Progress", "On Hold", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task Title *</Label>
              <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select value={newTask.project} onValueChange={v => setNewTask(p => ({ ...p, project: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(pr => <SelectItem key={pr.id} value={pr.name}>{pr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Input placeholder="Team member name" value={newTask.assignee} onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Hours</Label>
                <Input type="number" placeholder="0" value={newTask.hours} onChange={e => setNewTask(p => ({ ...p, hours: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={newTask.status} onValueChange={v => setNewTask(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Todo", "In Progress", "Review", "Completed", "On Hold"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
