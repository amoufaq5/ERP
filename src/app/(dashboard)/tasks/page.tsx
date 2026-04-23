"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowUp,
  Target,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useDataStore,
  scopeTasks,
  type Task,
} from "@/lib/data-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

export default function TasksPage() {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [viewTab, setViewTab] = useState<"mine" | "assigned_by_me">("mine");

  // Scoped tasks
  const myTasks = useMemo(
    () => scopeTasks(store.tasks, user.role, user.id, "assigned_to_me"),
    [store.tasks, user.role, user.id]
  );
  const assignedByMe = useMemo(
    () => scopeTasks(store.tasks, user.role, user.id, "assigned_by_me"),
    [store.tasks, user.role, user.id]
  );
  const allMyTasks = useMemo(
    () => scopeTasks(store.tasks, user.role, user.id, "mine"),
    [store.tasks, user.role, user.id]
  );

  const activeTasks = viewTab === "mine" ? myTasks : assignedByMe;

  const filtered = useMemo(() => {
    return activeTasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.buId && t.buId !== filters.buId) return false;
      return true;
    });
  }, [activeTasks, search, filters]);

  // Stats
  const todo = allMyTasks.filter((t) => t.status === "TODO").length;
  const inProgress = allMyTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const done = allMyTasks.filter((t) => t.status === "DONE").length;
  const kpiTasks = allMyTasks.filter((t) => t.kpiMetric);

  // Can this user assign tasks? (DM, Marketeer, BUM, Admin)
  const canAssign =
    user.role === "ADMIN" ||
    user.role === "BUM" ||
    user.role === "MARKETEER" ||
    user.role === "DISTRICT_MANAGER";

  // People user can assign tasks TO
  const assigneeOptions = (() => {
    if (user.role === "ADMIN") {
      return allUsers.map((u) => ({
        label: `${u.name} (${ROLE_LABEL[u.role]})`,
        value: u.id,
      }));
    }
    // Superiors can assign to reports
    const reports = allUsers.filter((u) => {
      if (user.role === "BUM")
        return ["MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"].includes(u.role);
      if (user.role === "MARKETEER")
        return ["DISTRICT_MANAGER", "MEDICAL_REP"].includes(u.role);
      if (user.role === "DISTRICT_MANAGER")
        return u.role === "MEDICAL_REP";
      return false;
    });
    return reports.map((u) => ({
      label: `${u.name} — ${ROLE_LABEL[u.role]}`,
      value: u.id,
    }));
  })();

  const buOptions = store.businessUnits.map((bu) => ({
    label: bu.name,
    value: bu.id,
  }));

  const formFields: EntityField[] = [
    { name: "title", label: "Task Title", type: "text", required: true },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      fullWidth: true,
    },
    {
      name: "assignedToId",
      label: "Assign To",
      type: "select",
      required: true,
      options: assigneeOptions,
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: true,
      defaultValue: "MEDIUM",
      options: [
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Urgent", value: "URGENT" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "TODO",
      options: [
        { label: "To Do", value: "TODO" },
        { label: "In Progress", value: "IN_PROGRESS" },
        { label: "Done", value: "DONE" },
        { label: "Blocked", value: "BLOCKED" },
      ],
    },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "buId", label: "Business Unit", type: "select", options: buOptions },
    {
      name: "kpiMetric",
      label: "KPI Metric",
      type: "text",
      placeholder: "e.g. Visits, New Doctors, Coverage %",
      helperText: "Optional: Set a measurable KPI for this task",
    },
    { name: "kpiTarget", label: "KPI Target", type: "number", placeholder: "Target value" },
    { name: "kpiActual", label: "KPI Actual", type: "number", placeholder: "Current actual" },
  ];

  function handleCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(t: Task) {
    setEditing(t);
    setFormOpen(true);
  }

  function handleSubmit(data: EntityFormData) {
    const payload = {
      title: String(data.title),
      description: String(data.description),
      assignedToId: String(data.assignedToId),
      priority: String(data.priority) as Task["priority"],
      status: String(data.status) as Task["status"],
      dueDate: String(data.dueDate),
      buId: data.buId ? String(data.buId) : null,
      kpiMetric: data.kpiMetric ? String(data.kpiMetric) : undefined,
      kpiTarget: data.kpiTarget ? Number(data.kpiTarget) : undefined,
      kpiActual: data.kpiActual ? Number(data.kpiActual) : undefined,
    };

    if (editing) {
      store.update("tasks", editing.id, payload);
    } else {
      store.add("tasks", {
        id: store.genId("t"),
        ...payload,
        assignedById: user.id,
        createdAt: new Date().toISOString(),
      });
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete(t: Task) {
    store.remove("tasks", t.id);
  }

  function handleMarkStatus(t: Task, status: Task["status"]) {
    store.update("tasks", t.id, { status });
  }

  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const sortedFiltered = useMemo(
    () =>
      filtered
        .slice()
        .sort(
          (a, b) =>
            (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
        ),
    [filtered]
  );

  const taskColumns: Column<Record<string, unknown>>[] = [
    {
      key: "title",
      label: "Task",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const t = row as unknown as Task;
        return (
          <div>
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{t.description}</div>
          </div>
        );
      },
    },
    {
      key: "assignedToId",
      label: "Assigned To",
      render: (v: unknown) => {
        const assignee = allUsers.find((u) => u.id === v);
        return <span className="text-xs">{assignee?.name ?? "—"}</span>;
      },
    },
    {
      key: "assignedById",
      label: "Assigned By",
      render: (v: unknown) => {
        const assigner = allUsers.find((u) => u.id === v);
        return <span className="text-xs">{assigner?.name ?? "—"}</span>;
      },
    },
    {
      key: "priority",
      label: "Priority",
      render: (v: unknown) => {
        const p = v as string;
        return (
          <Badge variant={p === "URGENT" ? "destructive" : p === "HIGH" ? "warning" : "secondary"}>
            {p}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => {
        const s = v as string;
        return (
          <Badge
            variant={
              s === "DONE" ? "success" : s === "BLOCKED" ? "destructive" : s === "IN_PROGRESS" ? "default" : "outline"
            }
          >
            {s.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      label: "Due",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const t = row as unknown as Task;
        const overdue = t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== "DONE";
        return (
          <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : ""}`}>
            {new Date(t.dueDate).toLocaleDateString()}
            {overdue && " (overdue)"}
          </span>
        );
      },
    },
    {
      key: "kpiMetric",
      label: "KPI",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const t = row as unknown as Task;
        if (!t.kpiMetric) return <span className="text-slate-300">{"—"}</span>;
        const progress = t.kpiTarget ? Math.round(((t.kpiActual ?? 0) / t.kpiTarget) * 100) : null;
        return (
          <div className="text-xs">
            <span className="font-medium">{t.kpiActual ?? 0}/{t.kpiTarget}</span>{" "}
            <span className="text-slate-500">{t.kpiMetric}</span>
            {progress !== null && (
              <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-16">
                <div
                  className={`h-full ${
                    progress >= 100 ? "bg-emerald-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "_actions",
      label: "",
      className: "text-right",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const t = row as unknown as Task;
        return (
          <EditDeleteMenu
            onEdit={() => handleEdit(t)}
            onDelete={() => handleDelete(t)}
            itemLabel={t.title}
            extraItems={[
              ...(t.status !== "DONE"
                ? [{ label: "Mark Done", onClick: () => handleMarkStatus(t, "DONE"), icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> }]
                : []),
              ...(t.status === "TODO"
                ? [{ label: "Start", onClick: () => handleMarkStatus(t, "IN_PROGRESS"), icon: <Circle className="h-4 w-4 text-blue-600" /> }]
                : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks & KPIs"
        description="Manage tasks and key performance indicators. Superiors can assign tasks with KPI targets to their team."
        actions={
          canAssign && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Assign Task
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Circle}
          title="To Do"
          value={todo}
          iconColor="bg-slate-100 text-slate-600"
        />
        <StatsCard
          icon={AlertCircle}
          title="In Progress"
          value={inProgress}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={CheckCircle2}
          title="Done"
          value={done}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={Target}
          title="KPI Tasks"
          value={kpiTasks.length}
          subtitle="With measurable targets"
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      <Tabs
        defaultValue="mine"
        value={viewTab}
        onValueChange={(v) => setViewTab(v as "mine" | "assigned_by_me")}
      >
        <TabsList>
          <TabsTrigger value="mine">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Assigned to Me ({myTasks.length})
          </TabsTrigger>
          {canAssign && (
            <TabsTrigger value="assigned_by_me">
              <UsersIcon className="h-3.5 w-3.5 mr-1.5" />
              I Assigned ({assignedByMe.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search tasks..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                  { label: "To Do", value: "TODO" },
                  { label: "In Progress", value: "IN_PROGRESS" },
                  { label: "Done", value: "DONE" },
                  { label: "Blocked", value: "BLOCKED" },
                ],
              },
              {
                key: "priority",
                label: "Priority",
                type: "select",
                options: [
                  { label: "Low", value: "LOW" },
                  { label: "Medium", value: "MEDIUM" },
                  { label: "High", value: "HIGH" },
                  { label: "Urgent", value: "URGENT" },
                ],
              },
              { key: "buId", label: "Business Unit", type: "select", options: buOptions },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
            collapsible
          />

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={taskColumns}
                data={sortedFiltered as unknown as Record<string, unknown>[]}
                
                emptyMessage="No tasks match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canAssign && (
          <TabsContent value="assigned_by_me" className="space-y-3">
            <FilterBar
              searchPlaceholder="Search tasks..."
              searchValue={search}
              onSearchChange={setSearch}
              fields={[
                {
                  key: "status",
                  label: "Status",
                  type: "select",
                  options: [
                    { label: "To Do", value: "TODO" },
                    { label: "In Progress", value: "IN_PROGRESS" },
                    { label: "Done", value: "DONE" },
                    { label: "Blocked", value: "BLOCKED" },
                  ],
                },
                {
                  key: "priority",
                  label: "Priority",
                  type: "select",
                  options: [
                    { label: "Low", value: "LOW" },
                    { label: "Medium", value: "MEDIUM" },
                    { label: "High", value: "HIGH" },
                    { label: "Urgent", value: "URGENT" },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
              collapsible
            />

            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={taskColumns}
                  data={sortedFiltered as unknown as Record<string, unknown>[]}
                  
                  emptyMessage="No tasks assigned by you yet."
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <EntityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Task" : "Assign New Task"}
        description={
          editing
            ? "Update task details, status, or KPI targets."
            : "Assign a task or KPI target to a team member."
        }
        fields={formFields}
        initialData={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                assignedToId: editing.assignedToId,
                priority: editing.priority,
                status: editing.status,
                dueDate: editing.dueDate.slice(0, 10),
                buId: editing.buId ?? "",
                kpiMetric: editing.kpiMetric ?? "",
                kpiTarget: editing.kpiTarget ?? "",
                kpiActual: editing.kpiActual ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save" : "Assign"}
        size="xl"
      />
    </div>
  );
}
