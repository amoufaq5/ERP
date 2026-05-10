// ─── Workflow Trigger Service ───
// Starts workflows automatically when conditions are met.
// Integrates with entity lifecycle events and schedules.

import { workflowExecutor, type Workflow } from "./workflow-engine";

// ─── Types ───

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  tenantId: string;
  type: "entity_create" | "entity_update" | "status_change" | "schedule" | "manual" | "webhook";
  entityType?: string;
  condition?: TriggerCondition;
  schedule?: string; // cron expression
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TriggerCondition {
  /** Field-level conditions that must all be true */
  rules: TriggerRule[];
  /** Logical operator for combining rules */
  operator: "AND" | "OR";
}

export interface TriggerRule {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in" | "changed_to" | "changed_from";
  value: unknown;
}

export interface EntityChangeEvent {
  type: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  tenantId: string;
  data: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  userId?: string;
  timestamp?: Date;
}

export interface StatusChangeEvent {
  entityType: string;
  entityId: string;
  tenantId: string;
  previousStatus: string;
  newStatus: string;
  userId?: string;
  data?: Record<string, unknown>;
  timestamp?: Date;
}

export interface WebhookTriggerEvent {
  triggerId: string;
  tenantId: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  timestamp?: Date;
}

export interface TriggerExecutionLog {
  id: string;
  triggerId: string;
  workflowId: string;
  instanceId: string;
  tenantId: string;
  event: EntityChangeEvent | StatusChangeEvent | WebhookTriggerEvent;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ─── Cron Parser (simplified) ───

interface CronSchedule {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
}

function parseCron(expression: string): CronSchedule | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  try {
    return {
      minutes: parseCronField(parts[0], 0, 59),
      hours: parseCronField(parts[1], 0, 23),
      daysOfMonth: parseCronField(parts[2], 1, 31),
      months: parseCronField(parts[3], 1, 12),
      daysOfWeek: parseCronField(parts[4], 0, 6),
    };
  } catch {
    return null;
  }
}

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  const values: number[] = [];

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      const [start, end] = range === "*" ? [min, max] : range.split("-").map(Number);
      for (let i = start; i <= (end ?? max); i += step) {
        values.push(i);
      }
    } else if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
    } else {
      values.push(parseInt(part, 10));
    }
  }

  return values.filter((v) => v >= min && v <= max);
}

function matchesCron(schedule: CronSchedule, date: Date): boolean {
  return (
    schedule.minutes.includes(date.getMinutes()) &&
    schedule.hours.includes(date.getHours()) &&
    schedule.daysOfMonth.includes(date.getDate()) &&
    schedule.months.includes(date.getMonth() + 1) &&
    schedule.daysOfWeek.includes(date.getDay())
  );
}

// ─── Trigger Service ───

export class WorkflowTriggerService {
  private triggers: WorkflowTrigger[] = [];
  private executionLogs: TriggerExecutionLog[] = [];
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private lastScheduleCheck: Date = new Date();

  // ─── Trigger Registration ───

  register(trigger: WorkflowTrigger): void {
    // Remove existing trigger with same ID if present
    this.triggers = this.triggers.filter((t) => t.id !== trigger.id);
    this.triggers.push(trigger);

    // Start scheduler if we have schedule triggers
    if (trigger.type === "schedule" && trigger.isActive) {
      this.ensureSchedulerRunning();
    }
  }

  unregister(triggerId: string): void {
    this.triggers = this.triggers.filter((t) => t.id !== triggerId);

    // Stop scheduler if no more schedule triggers
    const hasScheduleTriggers = this.triggers.some((t) => t.type === "schedule" && t.isActive);
    if (!hasScheduleTriggers && this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  getTrigger(triggerId: string): WorkflowTrigger | undefined {
    return this.triggers.find((t) => t.id === triggerId);
  }

  getTriggersByWorkflow(workflowId: string): WorkflowTrigger[] {
    return this.triggers.filter((t) => t.workflowId === workflowId);
  }

  getTriggersByTenant(tenantId: string): WorkflowTrigger[] {
    return this.triggers.filter((t) => t.tenantId === tenantId);
  }

  getAllTriggers(): WorkflowTrigger[] {
    return [...this.triggers];
  }

  setActive(triggerId: string, isActive: boolean): void {
    const trigger = this.triggers.find((t) => t.id === triggerId);
    if (trigger) {
      trigger.isActive = isActive;
      trigger.updatedAt = new Date();
    }
  }

  // ─── Event Handlers ───

  /**
   * Called by Prisma middleware or API routes when entities change.
   * Finds matching triggers and starts workflows.
   */
  async onEntityChange(event: EntityChangeEvent): Promise<string[]> {
    const startedInstances: string[] = [];

    const matchingTriggers = this.triggers.filter((trigger) => {
      if (!trigger.isActive) return false;
      if (trigger.tenantId !== event.tenantId) return false;
      if (trigger.entityType && trigger.entityType !== event.entityType) return false;

      // Match event type to trigger type
      if (event.type === "create" && trigger.type !== "entity_create") return false;
      if (event.type === "update" && trigger.type !== "entity_update") return false;
      if (event.type === "delete") return false; // No delete triggers for now

      // Evaluate conditions
      if (trigger.condition) {
        return this.evaluateCondition(trigger.condition, event.data, event.previousData);
      }

      return true;
    });

    for (const trigger of matchingTriggers) {
      try {
        const instance = await workflowExecutor.startWorkflow({
          workflowId: trigger.workflowId,
          tenantId: trigger.tenantId,
          entityType: event.entityType,
          entityId: event.entityId,
          context: event.data,
          triggerData: {
            triggerType: trigger.type,
            triggerId: trigger.id,
            eventType: event.type,
            previousData: event.previousData,
            userId: event.userId,
          },
        });

        startedInstances.push(instance.id);

        this.logExecution({
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          instanceId: instance.id,
          tenantId: trigger.tenantId,
          event,
          success: true,
        });
      } catch (err) {
        this.logExecution({
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          instanceId: "",
          tenantId: trigger.tenantId,
          event,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return startedInstances;
  }

  /**
   * Called specifically on status field changes.
   * Triggers workflows that listen for specific status transitions.
   */
  async onStatusChange(event: StatusChangeEvent): Promise<string[]> {
    const startedInstances: string[] = [];

    const matchingTriggers = this.triggers.filter((trigger) => {
      if (!trigger.isActive) return false;
      if (trigger.tenantId !== event.tenantId) return false;
      if (trigger.type !== "status_change") return false;
      if (trigger.entityType && trigger.entityType !== event.entityType) return false;

      // Evaluate status-specific conditions
      if (trigger.condition) {
        const statusData: Record<string, unknown> = {
          ...event.data,
          status: event.newStatus,
          previousStatus: event.previousStatus,
        };
        return this.evaluateCondition(trigger.condition, statusData);
      }

      return true;
    });

    for (const trigger of matchingTriggers) {
      try {
        const instance = await workflowExecutor.startWorkflow({
          workflowId: trigger.workflowId,
          tenantId: trigger.tenantId,
          entityType: event.entityType,
          entityId: event.entityId,
          context: {
            ...event.data,
            status: event.newStatus,
            previousStatus: event.previousStatus,
          },
          triggerData: {
            triggerType: "status_change",
            triggerId: trigger.id,
            previousStatus: event.previousStatus,
            newStatus: event.newStatus,
            userId: event.userId,
          },
        });

        startedInstances.push(instance.id);

        this.logExecution({
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          instanceId: instance.id,
          tenantId: trigger.tenantId,
          event,
          success: true,
        });
      } catch (err) {
        this.logExecution({
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          instanceId: "",
          tenantId: trigger.tenantId,
          event,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return startedInstances;
  }

  /**
   * Called when a webhook trigger endpoint is hit.
   */
  async onWebhookReceived(event: WebhookTriggerEvent): Promise<string | null> {
    const trigger = this.triggers.find(
      (t) => t.id === event.triggerId && t.type === "webhook" && t.isActive
    );

    if (!trigger) return null;

    try {
      const instance = await workflowExecutor.startWorkflow({
        workflowId: trigger.workflowId,
        tenantId: trigger.tenantId,
        entityType: trigger.entityType ?? "webhook",
        entityId: `webhook-${Date.now()}`,
        context: event.payload,
        triggerData: {
          triggerType: "webhook",
          triggerId: trigger.id,
          headers: event.headers,
        },
      });

      this.logExecution({
        triggerId: trigger.id,
        workflowId: trigger.workflowId,
        instanceId: instance.id,
        tenantId: trigger.tenantId,
        event,
        success: true,
      });

      return instance.id;
    } catch (err) {
      this.logExecution({
        triggerId: trigger.id,
        workflowId: trigger.workflowId,
        instanceId: "",
        tenantId: trigger.tenantId,
        event,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // ─── Schedule Management ───

  private ensureSchedulerRunning(): void {
    if (this.schedulerInterval) return;

    // Check every minute
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledTriggers();
    }, 60_000);
  }

  private async checkScheduledTriggers(): Promise<void> {
    const now = new Date();

    // Only process if we've moved to a new minute
    if (
      now.getMinutes() === this.lastScheduleCheck.getMinutes() &&
      now.getHours() === this.lastScheduleCheck.getHours()
    ) {
      return;
    }
    this.lastScheduleCheck = now;

    const scheduleTriggers = this.triggers.filter(
      (t) => t.type === "schedule" && t.isActive && t.schedule
    );

    for (const trigger of scheduleTriggers) {
      const schedule = parseCron(trigger.schedule!);
      if (!schedule) continue;

      if (matchesCron(schedule, now)) {
        try {
          await workflowExecutor.startWorkflow({
            workflowId: trigger.workflowId,
            tenantId: trigger.tenantId,
            entityType: trigger.entityType ?? "scheduled",
            entityId: `scheduled-${Date.now()}`,
            context: {
              scheduledAt: now.toISOString(),
              cronExpression: trigger.schedule,
            },
            triggerData: {
              triggerType: "schedule",
              triggerId: trigger.id,
              scheduledAt: now.toISOString(),
            },
          });
        } catch (err) {
          console.error(`[TriggerService] Scheduled trigger ${trigger.id} failed:`, err);
        }
      }
    }
  }

  // ─── Condition Evaluation ───

  private evaluateCondition(
    condition: TriggerCondition,
    data: Record<string, unknown>,
    previousData?: Record<string, unknown>
  ): boolean {
    const results = condition.rules.map((rule) => this.evaluateRule(rule, data, previousData));

    if (condition.operator === "AND") {
      return results.every(Boolean);
    } else {
      return results.some(Boolean);
    }
  }

  private evaluateRule(
    rule: TriggerRule,
    data: Record<string, unknown>,
    previousData?: Record<string, unknown>
  ): boolean {
    const fieldValue = this.getNestedValue(data, rule.field);

    switch (rule.operator) {
      case "equals":
        return String(fieldValue) === String(rule.value);
      case "not_equals":
        return String(fieldValue) !== String(rule.value);
      case "greater_than":
        return Number(fieldValue) > Number(rule.value);
      case "less_than":
        return Number(fieldValue) < Number(rule.value);
      case "contains":
        return String(fieldValue).includes(String(rule.value));
      case "in":
        return Array.isArray(rule.value) && rule.value.includes(fieldValue);
      case "changed_to":
        if (!previousData) return String(fieldValue) === String(rule.value);
        return (
          String(fieldValue) === String(rule.value) &&
          String(this.getNestedValue(previousData, rule.field)) !== String(rule.value)
        );
      case "changed_from":
        if (!previousData) return false;
        return String(this.getNestedValue(previousData, rule.field)) === String(rule.value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
      if (current === null || current === undefined) return undefined;
      if (typeof current === "object") return (current as Record<string, unknown>)[key];
      return undefined;
    }, obj);
  }

  // ─── Execution Logging ───

  private logExecution(params: {
    triggerId: string;
    workflowId: string;
    instanceId: string;
    tenantId: string;
    event: EntityChangeEvent | StatusChangeEvent | WebhookTriggerEvent;
    success: boolean;
    error?: string;
  }): void {
    const log: TriggerExecutionLog = {
      id: `tlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      triggerId: params.triggerId,
      workflowId: params.workflowId,
      instanceId: params.instanceId,
      tenantId: params.tenantId,
      event: params.event,
      timestamp: new Date(),
      success: params.success,
      error: params.error,
    };

    this.executionLogs.push(log);

    // Keep only last 1000 logs in memory
    if (this.executionLogs.length > 1000) {
      this.executionLogs = this.executionLogs.slice(-1000);
    }
  }

  getExecutionLogs(options?: {
    triggerId?: string;
    workflowId?: string;
    tenantId?: string;
    limit?: number;
  }): TriggerExecutionLog[] {
    let logs = [...this.executionLogs];

    if (options?.triggerId) {
      logs = logs.filter((l) => l.triggerId === options.triggerId);
    }
    if (options?.workflowId) {
      logs = logs.filter((l) => l.workflowId === options.workflowId);
    }
    if (options?.tenantId) {
      logs = logs.filter((l) => l.tenantId === options.tenantId);
    }

    // Return most recent first
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  // ─── Cleanup ───

  destroy(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }
}

// ─── Singleton (survives HMR) ───

const TRIGGER_SERVICE_GLOBAL_KEY = "__pharma_erp_workflow_trigger_service__";

function getWorkflowTriggerService(): WorkflowTriggerService {
  const g = globalThis as unknown as Record<string, WorkflowTriggerService>;
  if (!g[TRIGGER_SERVICE_GLOBAL_KEY]) {
    g[TRIGGER_SERVICE_GLOBAL_KEY] = new WorkflowTriggerService();
  }
  return g[TRIGGER_SERVICE_GLOBAL_KEY];
}

export const workflowTriggerService = getWorkflowTriggerService();

// ─── Helper: Create a trigger from a Workflow definition ───

export function createTriggerFromWorkflow(workflow: Workflow, tenantId: string): WorkflowTrigger | null {
  let triggerType: WorkflowTrigger["type"];

  switch (workflow.trigger) {
    case "on_create":
      triggerType = "entity_create";
      break;
    case "on_update":
      triggerType = "entity_update";
      break;
    case "on_status_change":
      triggerType = "status_change";
      break;
    case "scheduled":
      triggerType = "schedule";
      break;
    case "manual":
      triggerType = "manual";
      break;
    default:
      return null;
  }

  return {
    id: `trigger-${workflow.id}-${tenantId}`,
    workflowId: workflow.id,
    tenantId,
    type: triggerType,
    entityType: workflow.triggerEntity,
    isActive: workflow.isActive,
    createdAt: new Date(),
  };
}
