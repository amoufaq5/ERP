"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Filter,
  LayoutGrid,
  List,
  Users,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "high" | "medium" | "low";
  assignee: string;
  dueDate: string;
  module: string;
  tags: string[];
}

const tasksData: Task[] = [
  {
    id: "T-001",
    title: "Complete Q1 Financial Reconciliation",
    description: "Reconcile all accounts for Q1 2026 and prepare summary report for CFO review.",
    status: "in-progress",
    priority: "high",
    assignee: "Sarah Johnson",
    dueDate: "Apr 5, 2026",
    module: "ERP",
    tags: ["Finance", "Quarterly"],
  },
  {
    id: "T-002",
    title: "Review Senior Developer Applications",
    description: "Screen and shortlist candidates for the Senior Frontend Developer position.",
    status: "todo",
    priority: "high",
    assignee: "Marcus Chen",
    dueDate: "Apr 4, 2026",
    module: "ATS",
    tags: ["Hiring", "Engineering"],
  },
  {
    id: "T-003",
    title: "Update CRM Contact Records",
    description: "Migrate and clean up 500+ contact records from the legacy system.",
    status: "in-progress",
    priority: "medium",
    assignee: "Priya Nair",
    dueDate: "Apr 7, 2026",
    module: "CRM",
    tags: ["Data", "Migration"],
  },
  {
    id: "T-004",
    title: "Deploy Inventory Alert System",
    description: "Implement automated low-stock alerts for warehouse SKUs below minimum threshold.",
    status: "review",
    priority: "medium",
    assignee: "Jordan Mitchell",
    dueDate: "Apr 6, 2026",
    module: "ERP",
    tags: ["Inventory", "Automation"],
  },
  {
    id: "T-005",
    title: "Prepare Employee Benefits Presentation",
    description: "Create presentation deck for the updated 2026 benefits package rollout.",
    status: "done",
    priority: "low",
    assignee: "Lisa Park",
    dueDate: "Apr 2, 2026",
    module: "ERP",
    tags: ["HR", "Benefits"],
  },
  {
    id: "T-006",
    title: "Configure Automated Email Sequences",
    description: "Set up drip email campaigns for new lead nurturing workflow.",
    status: "todo",
    priority: "medium",
    assignee: "Amara Osei",
    dueDate: "Apr 8, 2026",
    module: "CRM",
    tags: ["Marketing", "Automation"],
  },
  {
    id: "T-007",
    title: "Fix Payment Gateway Integration",
    description: "Resolve intermittent timeout errors on Stripe payment processing.",
    status: "in-progress",
    priority: "high",
    assignee: "Jordan Mitchell",
    dueDate: "Apr 3, 2026",
    module: "ERP",
    tags: ["Engineering", "Critical"],
  },
  {
    id: "T-008",
    title: "Onboarding Checklist for New Hires",
    description: "Create standardized onboarding checklist template for April new hires.",
    status: "done",
    priority: "low",
    assignee: "Lisa Park",
    dueDate: "Apr 1, 2026",
    module: "ATS",
    tags: ["HR", "Onboarding"],
  },
  {
    id: "T-009",
    title: "Generate Monthly Sales Report",
    description: "Compile March sales data and generate performance report for leadership.",
    status: "review",
    priority: "medium",
    assignee: "Sarah Johnson",
    dueDate: "Apr 5, 2026",
    module: "CRM",
    tags: ["Sales", "Reporting"],
  },
  {
    id: "T-010",
    title: "Update Design System Components",
    description: "Update button, input, and card components to match new brand guidelines.",
    status: "todo",
    priority: "low",
    assignee: "Amara Osei",
    dueDate: "Apr 10, 2026",
    module: "System",
    tags: ["Design", "UI"],
  },
];

const statusConfig = {
  todo: { label: "To Do", icon: Circle, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
  review: { label: "In Review", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
};

const priorityConfig = {
  high: { label: "High", icon: ArrowUp, color: "text-red-600" },
  medium: { label: "Medium", icon: ArrowRight, color: "text-amber-600" },
  low: { label: "Low", icon: ArrowDown, color: "text-green-600" },
};

const statuses: Task["status"][] = ["todo", "in-progress", "review", "done"];

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [tasks] = useState(tasksData);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const tasksByStatus = statuses.reduce(
    (acc, status) => {
      acc[status] = filteredTasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage tasks across all modules
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Tasks</p>
          </CardContent>
        </Card>
        {statuses.map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = stats[status === "in-progress" ? "inProgress" : status as keyof typeof stats];
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{count}</p>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-56 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {["all", ...statuses].map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setFilterStatus(s)}
              >
                {s === "all" ? "All" : statusConfig[s as Task["status"]].label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("board")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const columnTasks = tasksByStatus[status] || [];
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-semibold">{config.label}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  {columnTasks.map((task) => {
                    const PriorityIcon = priorityConfig[task.priority].icon;
                    return (
                      <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
                            <PriorityIcon className={`h-3.5 w-3.5 shrink-0 ${priorityConfig[task.priority].color}`} />
                          </div>
                          <p className="text-sm font-medium leading-snug mb-2">{task.title}</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {task.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{task.assignee}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{task.dueDate}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                      <p className="text-xs">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">Task</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Priority</th>
                  <th className="text-left p-3 font-medium">Assignee</th>
                  <th className="text-left p-3 font-medium">Due Date</th>
                  <th className="text-left p-3 font-medium">Module</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const StatusIcon = statusConfig[task.status].icon;
                  const PriorityIcon = priorityConfig[task.priority].icon;
                  return (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                      <td className="p-3 text-xs font-mono text-muted-foreground">{task.id}</td>
                      <td className="p-3">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{task.description}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${statusConfig[task.status].color}`} />
                          <span className="text-xs">{statusConfig[task.status].label}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <PriorityIcon className={`h-3.5 w-3.5 ${priorityConfig[task.priority].color}`} />
                          <span className="text-xs">{priorityConfig[task.priority].label}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{task.assignee}</td>
                      <td className="p-3 text-xs text-muted-foreground">{task.dueDate}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{task.module}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-40 mb-2" />
                <p className="text-sm">No tasks found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
