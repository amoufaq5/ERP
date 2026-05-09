"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  Settings,
  Users,
  FileText,
  Clock,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkflowStep {
  name: string;
  role: string;
  actionType: "approve" | "review" | "process" | "notify";
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  active: boolean;
  activeInstances: number;
  custom?: boolean;
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  initiatedBy: string;
  currentStep: number;
  status: "Active" | "Completed" | "Rejected";
  startedAt: string;
}

// ── Seed data ──────────────────────────────────────────────────────────────

const TEMPLATES_STORAGE_KEY = "pharma.erp.workflow-templates";
const INSTANCES_STORAGE_KEY = "pharma.erp.workflow-instances";

const SEED_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "wf-invoice",
    name: "Invoice Approval",
    description: "Route invoices through management and finance for approval before sending.",
    steps: [
      { name: "Draft", role: "Accountant", actionType: "process" },
      { name: "Manager Review", role: "Manager", actionType: "approve" },
      { name: "Finance Approval", role: "Finance Director", actionType: "approve" },
      { name: "Sent", role: "System", actionType: "notify" },
    ],
    active: true,
    activeInstances: 3,
  },
  {
    id: "wf-po",
    name: "Purchase Order",
    description: "Multi-level approval for procurement requests including budget verification.",
    steps: [
      { name: "Request", role: "Requester", actionType: "process" },
      { name: "Procurement Review", role: "Procurement Officer", actionType: "review" },
      { name: "Budget Check", role: "Finance", actionType: "approve" },
      { name: "Manager Approval", role: "Manager", actionType: "approve" },
      { name: "Created", role: "System", actionType: "notify" },
    ],
    active: true,
    activeInstances: 2,
  },
  {
    id: "wf-leave",
    name: "Leave Request",
    description: "Employee leave requests routed through direct manager and HR.",
    steps: [
      { name: "Submit", role: "Employee", actionType: "process" },
      { name: "DM Approval", role: "District Manager", actionType: "approve" },
      { name: "HR Review", role: "HR", actionType: "review" },
      { name: "Approved / Rejected", role: "System", actionType: "notify" },
    ],
    active: true,
    activeInstances: 1,
  },
  {
    id: "wf-visit",
    name: "Visit Approval",
    description: "Medical rep visit logs reviewed and approved by district managers.",
    steps: [
      { name: "Logged", role: "Medical Rep", actionType: "process" },
      { name: "DM Review", role: "District Manager", actionType: "review" },
      { name: "Approved / Rejected", role: "System", actionType: "notify" },
    ],
    active: true,
    activeInstances: 4,
  },
];

const SEED_INSTANCES: WorkflowInstance[] = [
  {
    id: "inst-1",
    workflowId: "wf-invoice",
    workflowName: "Invoice Approval",
    initiatedBy: "Ahmed Hassan",
    currentStep: 1,
    status: "Active",
    startedAt: "2026-04-28T09:15:00Z",
  },
  {
    id: "inst-2",
    workflowId: "wf-po",
    workflowName: "Purchase Order",
    initiatedBy: "Fatima Ali",
    currentStep: 2,
    status: "Active",
    startedAt: "2026-04-27T14:30:00Z",
  },
  {
    id: "inst-3",
    workflowId: "wf-leave",
    workflowName: "Leave Request",
    initiatedBy: "Mohamed Sayed",
    currentStep: 1,
    status: "Active",
    startedAt: "2026-04-29T08:00:00Z",
  },
];

function loadTemplates(): WorkflowTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error("Failed to load workflow templates from localStorage:", error);
  }
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(SEED_TEMPLATES));
  return SEED_TEMPLATES;
}

function loadInstances(): WorkflowInstance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INSTANCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error("Failed to load workflow instances from localStorage:", error);
  }
  localStorage.setItem(INSTANCES_STORAGE_KEY, JSON.stringify(SEED_INSTANCES));
  return SEED_INSTANCES;
}

function saveTemplates(templates: WorkflowTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

function saveInstances(instances: WorkflowInstance[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANCES_STORAGE_KEY, JSON.stringify(instances));
}

const ROLE_OPTIONS = [
  "Employee",
  "Medical Rep",
  "District Manager",
  "Manager",
  "Finance",
  "Finance Director",
  "HR",
  "Procurement Officer",
  "Marketing",
  "Regulatory Affairs",
  "Production",
  "Supply Chain",
  "Sales Manager",
  "Warehouse",
  "System",
  "Accountant",
  "Product Manager",
];

const ACTION_TYPES: WorkflowStep["actionType"][] = [
  "approve",
  "review",
  "process",
  "notify",
];

// ════════════════════════════════════════════════════════════════════════════
// Page Component
// ════════════════════════════════════════════════════════════════════════════

export default function WorkflowsPage() {
  const [tab, setTab] = useState("templates");
  const [templates, setTemplatesRaw] = useState<WorkflowTemplate[]>([]);
  const [instances, setInstancesRaw] = useState<WorkflowInstance[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTemplatesRaw(loadTemplates());
    setInstancesRaw(loadInstances());
    setMounted(true);
  }, []);

  const setTemplates = useCallback((updater: WorkflowTemplate[] | ((prev: WorkflowTemplate[]) => WorkflowTemplate[])) => {
    setTemplatesRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveTemplates(next);
      return next;
    });
  }, []);

  const setInstances = useCallback((updater: WorkflowInstance[] | ((prev: WorkflowInstance[]) => WorkflowInstance[])) => {
    setInstancesRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveInstances(next);
      return next;
    });
  }, []);
  const [instanceSearch, setInstanceSearch] = useState("");

  // Custom builder dialog state (also used for edit)
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderSteps, setBuilderSteps] = useState<WorkflowStep[]>([]);
  const [newStepName, setNewStepName] = useState("");
  const [newStepRole, setNewStepRole] = useState("");
  const [newStepAction, setNewStepAction] = useState<WorkflowStep["actionType"]>("process");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Template actions ───────────────────────────────────────────────────

  function toggleTemplate(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  }

  // ── Instance actions ───────────────────────────────────────────────────

  function advanceInstance(id: string) {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== id || inst.status !== "Active") return inst;
        const tpl = templates.find((t) => t.id === inst.workflowId);
        const maxStep = tpl ? tpl.steps.length - 1 : inst.currentStep;
        const nextStep = inst.currentStep + 1;
        if (nextStep >= maxStep) {
          return { ...inst, currentStep: maxStep, status: "Completed" };
        }
        return { ...inst, currentStep: nextStep };
      })
    );
  }

  function rejectInstance(id: string) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === id && inst.status === "Active"
          ? { ...inst, status: "Rejected" }
          : inst
      )
    );
  }

  // ── Builder actions ────────────────────────────────────────────────────

  function addBuilderStep() {
    if (!newStepName || !newStepRole) return;
    setBuilderSteps((prev) => [
      ...prev,
      { name: newStepName, role: newStepRole, actionType: newStepAction },
    ]);
    setNewStepName("");
    setNewStepRole("");
    setNewStepAction("process");
  }

  function removeBuilderStep(index: number) {
    setBuilderSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBuilderStep(index: number, direction: "up" | "down") {
    setBuilderSteps((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function saveCustomWorkflow() {
    if (!builderName || builderSteps.length === 0) return;
    if (editingTemplateId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplateId
            ? { ...t, name: builderName, description: builderDescription || t.description, steps: builderSteps }
            : t
        )
      );
    } else {
      const newTemplate: WorkflowTemplate = {
        id: `wf-custom-${Date.now()}`,
        name: builderName,
        description: builderDescription || "Custom workflow",
        steps: builderSteps,
        active: false,
        activeInstances: 0,
        custom: true,
      };
      setTemplates((prev) => [...prev, newTemplate]);
    }
    setBuilderOpen(false);
    setEditingTemplateId(null);
    setBuilderName("");
    setBuilderDescription("");
    setBuilderSteps([]);
  }

  function openBuilder() {
    setEditingTemplateId(null);
    setBuilderName("");
    setBuilderDescription("");
    setBuilderSteps([]);
    setNewStepName("");
    setNewStepRole("");
    setNewStepAction("process");
    setBuilderOpen(true);
  }

  function editTemplate(tpl: WorkflowTemplate) {
    setEditingTemplateId(tpl.id);
    setBuilderName(tpl.name);
    setBuilderDescription(tpl.description);
    setBuilderSteps([...tpl.steps]);
    setNewStepName("");
    setNewStepRole("");
    setNewStepAction("process");
    setBuilderOpen(true);
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setInstances((prev) => prev.filter((i) => i.workflowId !== id));
    setDeleteConfirmId(null);
  }

  function deleteInstance(id: string) {
    setInstances((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  const activeTemplates = templates.filter((t) => t.active).length;
  const activeInstances = instances.filter((i) => i.status === "Active").length;
  const completedInstances = instances.filter((i) => i.status === "Completed").length;
  const rejectedInstances = instances.filter((i) => i.status === "Rejected").length;

  // ── DataTable columns for instances ────────────────────────────────────

  const instanceColumns: Column<WorkflowInstance>[] = [
    {
      key: "workflowName",
      label: "Workflow",
      sortable: true,
      render: (val: string) => (
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{val}</span>
        </div>
      ),
    },
    { key: "initiatedBy", label: "Initiated By", sortable: true },
    {
      key: "currentStep",
      label: "Current Step",
      sortable: true,
      render: (val: number, row: WorkflowInstance) => {
        const tpl = templates.find((t) => t.id === row.workflowId);
        const stepName = tpl?.steps[val]?.name ?? `Step ${val + 1}`;
        return (
          <span className="text-sm">
            {stepName} ({val + 1}/{tpl?.steps.length ?? "?"})
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val: string) => (
        <Badge
          variant={
            val === "Completed"
              ? "default"
              : val === "Rejected"
              ? "destructive"
              : "secondary"
          }
          className={
            val === "Completed"
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : val === "Active"
              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
              : ""
          }
        >
          {val === "Active" && <Play className="mr-1 h-3 w-3" />}
          {val === "Completed" && <CheckCircle className="mr-1 h-3 w-3" />}
          {val === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
          {val}
        </Badge>
      ),
    },
    {
      key: "startedAt",
      label: "Started",
      sortable: true,
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: string, row: WorkflowInstance) => (
        <div className="flex gap-1">
          {row.status === "Active" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => advanceInstance(row.id)}
              >
                <ArrowRight className="mr-1 h-3 w-3" />
                Advance
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectInstance(row.id)}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </>
          )}
          {row.status !== "Active" && (
            <span className="text-xs text-muted-foreground">--</span>
          )}
          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteInstance(row.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Step dot color helper ──────────────────────────────────────────────

  function stepDotColor(actionType: WorkflowStep["actionType"]) {
    switch (actionType) {
      case "approve":
        return "bg-green-500";
      case "review":
        return "bg-blue-500";
      case "process":
        return "bg-yellow-500";
      case "notify":
        return "bg-purple-500";
      default:
        return "bg-gray-400";
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  if (!mounted) return null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Workflows"
        description="Automate business processes with configurable approval workflows."
      />

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          icon={<GitBranch className="h-5 w-5" />}
          title="Total Templates"
          value={templates.length}
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={<Play className="h-5 w-5" />}
          title="Active Templates"
          value={activeTemplates}
          iconColor="text-green-600"
        />
        <StatsCard
          icon={<Clock className="h-5 w-5" />}
          title="Running Instances"
          value={activeInstances}
          iconColor="text-yellow-600"
        />
        <StatsCard
          icon={<CheckCircle className="h-5 w-5" />}
          title="Completed"
          value={completedInstances}
          subtitle={`${rejectedInstances} rejected`}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="templates">Workflow Templates</TabsTrigger>
          <TabsTrigger value="instances">Active Instances</TabsTrigger>
          <TabsTrigger value="builder">Custom Workflow Builder</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Templates ────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Button onClick={openBuilder}><Plus className="mr-1 h-4 w-4" />New Template</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())).map((tpl) => (
              <Card
                key={tpl.id}
                className={`flex flex-col transition-opacity ${
                  !tpl.active ? "opacity-70" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <Badge
                      variant={tpl.active ? "default" : "secondary"}
                      className={
                        tpl.active
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : ""
                      }
                    >
                      {tpl.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {tpl.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  {/* Step visualization */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {tpl.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div className="relative group">
                          <div
                            className={`h-3 w-3 rounded-full ${stepDotColor(
                              step.actionType
                            )} ring-2 ring-white dark:ring-slate-900`}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                            {step.name} ({step.role})
                          </div>
                        </div>
                        {idx < tpl.steps.length - 1 && (
                          <div className="h-0.5 w-4 bg-muted-foreground/30" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tpl.steps.length} steps</span>
                    <span>
                      {tpl.activeInstances} active instance
                      {tpl.activeInstances !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {tpl.custom && (
                    <Badge variant="outline" className="w-fit text-[10px]">
                      Custom
                    </Badge>
                  )}

                  <div className="mt-auto flex gap-1">
                    <Button
                      size="sm"
                      variant={tpl.active ? "outline" : "default"}
                      className="flex-1"
                      onClick={() => toggleTemplate(tpl.id)}
                    >
                      {tpl.active ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => editTemplate(tpl)} title="Edit">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirmId(tpl.id)} title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab 2: Active Instances ─────────────────────────────────── */}
        <TabsContent value="instances" className="mt-6">
          <div className="mb-4">
            <Input placeholder="Search instances..." value={instanceSearch} onChange={(e) => setInstanceSearch(e.target.value)} className="max-w-sm" />
          </div>
          <DataTable
            columns={instanceColumns as unknown as Column<Record<string, unknown>>[]}
            data={(instanceSearch ? instances.filter((i) => i.workflowName.toLowerCase().includes(instanceSearch.toLowerCase()) || i.initiatedBy.toLowerCase().includes(instanceSearch.toLowerCase())) : instances) as unknown as Record<string, unknown>[]}
            emptyMessage="No active workflow instances."
          />
        </TabsContent>

        {/* ── Tab 3: Custom Workflow Builder ──────────────────────────── */}
        <TabsContent value="builder" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Custom Workflow Builder
              </CardTitle>
              <CardDescription>
                Create your own workflow with custom steps and approval roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={openBuilder}>
                <Plus className="mr-1 h-4 w-4" />
                Create New Workflow
              </Button>
            </CardContent>
          </Card>

          {/* List custom workflows */}
          {templates.filter((t) => t.custom).length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">Your Custom Workflows</h4>
              {templates
                .filter((t) => t.custom)
                .map((t) => (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.steps.length} steps &mdash; {t.description}
                        </p>
                      </div>
                      <Badge variant={t.active ? "default" : "secondary"}>
                        {t.active ? "Active" : "Inactive"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Builder Dialog ────────────────────────────────────────────── */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? "Edit Workflow" : "Create Custom Workflow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wf-name">Workflow Name</Label>
              <Input
                id="wf-name"
                placeholder="e.g. Contract Approval"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wf-desc">Description</Label>
              <Input
                id="wf-desc"
                placeholder="Brief description of the workflow"
                value={builderDescription}
                onChange={(e) => setBuilderDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Steps list */}
            <div>
              <Label>Steps</Label>
              {builderSteps.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  No steps added yet. Add at least one step below.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {builderSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {step.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {step.role} &middot; {step.actionType}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => moveBuilderStep(idx, "up")}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === builderSteps.length - 1}
                        onClick={() => moveBuilderStep(idx, "down")}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeBuilderStep(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add step form */}
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold">Add Step</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="step-name" className="text-xs">
                    Step Name
                  </Label>
                  <Input
                    id="step-name"
                    placeholder="e.g. Review"
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="step-role" className="text-xs">
                    Role
                  </Label>
                  <Select value={newStepRole} onValueChange={setNewStepRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="step-action" className="text-xs">
                    Action Type
                  </Label>
                  <Select
                    value={newStepAction}
                    onValueChange={(v) =>
                      setNewStepAction(v as WorkflowStep["actionType"])
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={addBuilderStep}
                disabled={!newStepName || !newStepRole}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Step
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveCustomWorkflow}
              disabled={!builderName || builderSteps.length === 0}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              {editingTemplateId ? "Update Workflow" : "Save Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workflow Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this workflow template? This will also remove all associated instances. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteTemplate(deleteConfirmId)}>
              <Trash2 className="mr-1 h-4 w-4" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
