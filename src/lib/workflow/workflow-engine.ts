"use client";

// ─── Core Types ───

export interface WorkflowStep {
  id: string;
  type: "approval" | "notification" | "condition" | "action" | "delay" | "webhook";
  name: string;
  config: Record<string, unknown>;
  nextSteps: string[]; // IDs of next steps
  position: { x: number; y: number };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: "manual" | "on_create" | "on_update" | "on_status_change" | "scheduled";
  triggerEntity: string; // "invoice", "sales_order", "leave_request", etc.
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
  lastRun?: string;
  runCount: number;
}

export interface WorkflowLog {
  stepId: string;
  stepName: string;
  status: "success" | "failed" | "skipped" | "pending";
  message: string;
  timestamp: string;
  duration?: number; // milliseconds
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "failed" | "paused";
  currentStepId: string;
  startedAt: string;
  completedAt?: string;
  logs: WorkflowLog[];
  triggerData?: Record<string, unknown>;
}

// ─── Step type metadata ───

export interface StepTypeMeta {
  type: WorkflowStep["type"];
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const STEP_TYPE_META: StepTypeMeta[] = [
  {
    type: "approval",
    label: "Approval",
    description: "Requires user approval to proceed",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
  },
  {
    type: "notification",
    label: "Notification",
    description: "Send email, SMS, or in-app notification",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-300",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch based on a condition",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
  },
  {
    type: "action",
    label: "Action",
    description: "Perform an automated action",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  {
    type: "delay",
    label: "Delay",
    description: "Wait for a specified duration",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
  },
  {
    type: "webhook",
    label: "Webhook",
    description: "Call an external API endpoint",
    color: "text-green-700",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
  },
];

export function getStepMeta(type: WorkflowStep["type"]): StepTypeMeta {
  return STEP_TYPE_META.find((m) => m.type === type) ?? STEP_TYPE_META[3];
}

// ─── Trigger metadata ───

export const TRIGGER_OPTIONS: { value: Workflow["trigger"]; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "on_create", label: "On Create" },
  { value: "on_update", label: "On Update" },
  { value: "on_status_change", label: "On Status Change" },
  { value: "scheduled", label: "Scheduled" },
];

export const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "sales_order", label: "Sales Order" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "leave_request", label: "Leave Request" },
  { value: "employee", label: "Employee" },
  { value: "expense_report", label: "Expense Report" },
  { value: "quality_batch", label: "Quality Batch" },
  { value: "customer", label: "Customer" },
];

// ─── Storage keys ───

const WORKFLOWS_KEY = "pharma_erp_workflows";
const EXECUTIONS_KEY = "pharma_erp_workflow_executions";

// ─── Workflow CRUD ───

export function getWorkflows(): Workflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWorkflows(workflows: Workflow[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
}

export function createWorkflow(
  data: Pick<Workflow, "name" | "description" | "trigger" | "triggerEntity"> & {
    steps?: WorkflowStep[];
  }
): Workflow {
  const workflows = getWorkflows();
  const workflow: Workflow = {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.name,
    description: data.description,
    trigger: data.trigger,
    triggerEntity: data.triggerEntity,
    steps: data.steps ?? [],
    isActive: false,
    createdAt: new Date().toISOString(),
    runCount: 0,
  };
  workflows.push(workflow);
  saveWorkflows(workflows);
  return workflow;
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
  const workflows = getWorkflows();
  const idx = workflows.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  workflows[idx] = { ...workflows[idx], ...updates };
  saveWorkflows(workflows);
  return workflows[idx];
}

export function deleteWorkflow(id: string): boolean {
  const workflows = getWorkflows();
  const filtered = workflows.filter((w) => w.id !== id);
  if (filtered.length === workflows.length) return false;
  saveWorkflows(filtered);
  return true;
}

export function toggleWorkflow(id: string): Workflow | null {
  const workflows = getWorkflows();
  const wf = workflows.find((w) => w.id === id);
  if (!wf) return null;
  wf.isActive = !wf.isActive;
  saveWorkflows(workflows);
  return wf;
}

// ─── Execution history ───

export function getExecutions(): WorkflowExecution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXECUTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExecutions(executions: WorkflowExecution[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXECUTIONS_KEY, JSON.stringify(executions));
}

export function getWorkflowHistory(workflowId?: string): WorkflowExecution[] {
  const all = getExecutions();
  if (!workflowId) return all;
  return all.filter((e) => e.workflowId === workflowId);
}

// ─── Workflow execution (simulated) ───

function simulateStepExecution(step: WorkflowStep): WorkflowLog {
  const duration = Math.floor(Math.random() * 3000) + 200;
  const success = Math.random() > 0.08; // 92% success rate

  let message: string;
  switch (step.type) {
    case "approval":
      message = success
        ? `Approval granted by ${(step.config.approver as string) || "manager"}`
        : "Approval timed out after 48 hours";
      break;
    case "notification":
      message = success
        ? `${(step.config.channel as string) || "email"} notification sent successfully`
        : "Failed to deliver notification - recipient not found";
      break;
    case "condition":
      message = `Condition evaluated: ${(step.config.field as string) || "field"} ${(step.config.operator as string) || "equals"} ${(step.config.value as string) || "value"} => ${success ? "TRUE" : "FALSE"}`;
      break;
    case "action":
      message = success
        ? `Action completed: ${(step.config.actionType as string) || "update"} on ${(step.config.target as string) || "record"}`
        : "Action failed: insufficient permissions";
      break;
    case "delay":
      message = `Waited ${(step.config.duration as string) || "1"} ${(step.config.unit as string) || "hours"}`;
      break;
    case "webhook":
      message = success
        ? `Webhook call to ${(step.config.url as string) || "API endpoint"} returned 200 OK`
        : `Webhook call failed with status 500`;
      break;
    default:
      message = success ? "Step completed" : "Step failed";
  }

  return {
    stepId: step.id,
    stepName: step.name,
    status: success ? "success" : "failed",
    message,
    timestamp: new Date().toISOString(),
    duration,
  };
}

export function executeWorkflow(workflowId: string): WorkflowExecution | null {
  const workflows = getWorkflows();
  const wf = workflows.find((w) => w.id === workflowId);
  if (!wf || wf.steps.length === 0) return null;

  const logs: WorkflowLog[] = [];
  let overallStatus: WorkflowExecution["status"] = "completed";

  for (const step of wf.steps) {
    const log = simulateStepExecution(step);
    logs.push(log);
    if (log.status === "failed") {
      overallStatus = "failed";
      // remaining steps are skipped
      const remainingIndex = wf.steps.indexOf(step) + 1;
      for (let i = remainingIndex; i < wf.steps.length; i++) {
        logs.push({
          stepId: wf.steps[i].id,
          stepName: wf.steps[i].name,
          status: "skipped",
          message: "Skipped due to previous step failure",
          timestamp: new Date().toISOString(),
        });
      }
      break;
    }
  }

  const execution: WorkflowExecution = {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workflowId: wf.id,
    workflowName: wf.name,
    status: overallStatus,
    currentStepId: logs[logs.length - 1]?.stepId ?? "",
    startedAt: new Date(Date.now() - logs.reduce((s, l) => s + (l.duration || 0), 0)).toISOString(),
    completedAt: new Date().toISOString(),
    logs,
  };

  // Save execution
  const executions = getExecutions();
  executions.unshift(execution);
  // Keep last 100 executions
  if (executions.length > 100) executions.length = 100;
  saveExecutions(executions);

  // Update workflow run count and last run
  const wfIdx = workflows.findIndex((w) => w.id === workflowId);
  if (wfIdx >= 0) {
    workflows[wfIdx].runCount += 1;
    workflows[wfIdx].lastRun = new Date().toISOString();
    saveWorkflows(workflows);
  }

  return execution;
}

export function pauseWorkflow(executionId: string): WorkflowExecution | null {
  const executions = getExecutions();
  const exec = executions.find((e) => e.id === executionId);
  if (!exec || exec.status !== "running") return null;
  exec.status = "paused";
  saveExecutions(executions);
  return exec;
}

// ─── Helper: Generate step ID ───

let _stepIdCounter = 1000;
export function generateStepId(): string {
  return `step-${Date.now()}-${_stepIdCounter++}`;
}

// ─── Helper: Create a new step ───

export function createStep(
  type: WorkflowStep["type"],
  overrides?: Partial<WorkflowStep>
): WorkflowStep {
  const meta = getStepMeta(type);
  return {
    id: generateStepId(),
    type,
    name: overrides?.name ?? meta.label,
    config: overrides?.config ?? {},
    nextSteps: overrides?.nextSteps ?? [],
    position: overrides?.position ?? { x: 0, y: 0 },
  };
}
