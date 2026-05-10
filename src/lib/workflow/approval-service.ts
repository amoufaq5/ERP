// ─── Approval Service ───
// Manages pending approvals for workflow steps.
// Provides a queryable interface for approval UIs and integrates
// with the workflow executor for decision resolution.

import { eventBus } from "../notifications/event-bus";
import { workflowExecutor } from "./workflow-engine";

// ─── Types ───

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "EXPIRED";

export interface PendingApproval {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  requiredRole: string;
  requiredUserId?: string;
  title: string;
  description: string;
  status: ApprovalStatus;
  assignedTo?: string;
  decidedBy?: string;
  decision?: "approve" | "reject";
  comments?: string;
  createdAt: Date;
  dueDate?: Date;
  decidedAt?: Date;
  escalatedTo?: string;
  escalatedAt?: Date;
  escalationReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalFilter {
  tenantId?: string;
  userId?: string;
  role?: string;
  status?: ApprovalStatus | ApprovalStatus[];
  entityType?: string;
  entityId?: string;
  workflowInstanceId?: string;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  expired: number;
  averageDecisionTimeMs: number;
}

export interface ApprovalEvent {
  type: "approval:created" | "approval:decided" | "approval:escalated" | "approval:expired";
  approval: PendingApproval;
  timestamp: Date;
}

// ─── Approval Service ───

export class ApprovalService {
  private approvals = new Map<string, PendingApproval>();
  private eventListeners: Array<(event: ApprovalEvent) => void> = [];

  // ─── Event System ───

  onEvent(listener: (event: ApprovalEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx >= 0) this.eventListeners.splice(idx, 1);
    };
  }

  private emit(event: ApprovalEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[ApprovalService] Event listener error:", err);
      }
    }
  }

  // ─── Create Approval ───

  createApproval(params: {
    workflowInstanceId: string;
    stepId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    requiredRole: string;
    requiredUserId?: string;
    title: string;
    description: string;
    assignedTo?: string;
    dueDate?: Date;
    metadata?: Record<string, unknown>;
  }): PendingApproval {
    const approval: PendingApproval = {
      id: generateApprovalId(),
      workflowInstanceId: params.workflowInstanceId,
      stepId: params.stepId,
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      requiredRole: params.requiredRole,
      requiredUserId: params.requiredUserId,
      title: params.title,
      description: params.description,
      status: "PENDING",
      assignedTo: params.assignedTo ?? params.requiredUserId,
      createdAt: new Date(),
      dueDate: params.dueDate,
      metadata: params.metadata,
    };

    this.approvals.set(approval.id, approval);

    this.emit({
      type: "approval:created",
      approval,
      timestamp: new Date(),
    });

    // Notify the assigned user or role via event bus
    if (approval.assignedTo) {
      eventBus.publish(approval.assignedTo, {
        type: "approval_request",
        payload: {
          approvalId: approval.id,
          title: approval.title,
          description: approval.description,
          entityType: approval.entityType,
          entityId: approval.entityId,
          dueDate: approval.dueDate?.toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      // Broadcast to role
      eventBus.publishToRole(approval.requiredRole, {
        type: "approval_request",
        payload: {
          approvalId: approval.id,
          title: approval.title,
          description: approval.description,
          entityType: approval.entityType,
          entityId: approval.entityId,
          dueDate: approval.dueDate?.toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    return approval;
  }

  // ─── Query Approvals ───

  getApproval(approvalId: string): PendingApproval | undefined {
    return this.approvals.get(approvalId);
  }

  getPendingApprovals(tenantId: string, userId: string, role: string): PendingApproval[] {
    return Array.from(this.approvals.values()).filter((a) => {
      if (a.tenantId !== tenantId) return false;
      if (a.status !== "PENDING") return false;

      // Match by assigned user or required role
      if (a.requiredUserId && a.requiredUserId === userId) return true;
      if (a.assignedTo && a.assignedTo === userId) return true;
      if (a.requiredRole === role) return true;

      return false;
    });
  }

  queryApprovals(filter: ApprovalFilter): PendingApproval[] {
    let results = Array.from(this.approvals.values());

    if (filter.tenantId) {
      results = results.filter((a) => a.tenantId === filter.tenantId);
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter((a) => statuses.includes(a.status));
    }

    if (filter.entityType) {
      results = results.filter((a) => a.entityType === filter.entityType);
    }

    if (filter.entityId) {
      results = results.filter((a) => a.entityId === filter.entityId);
    }

    if (filter.workflowInstanceId) {
      results = results.filter((a) => a.workflowInstanceId === filter.workflowInstanceId);
    }

    if (filter.userId) {
      results = results.filter(
        (a) =>
          a.requiredUserId === filter.userId ||
          a.assignedTo === filter.userId
      );
    }

    if (filter.role) {
      results = results.filter((a) => a.requiredRole === filter.role);
    }

    // Sort by creation date, newest first
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  // ─── Approve ───

  async approve(approvalId: string, userId: string, comments?: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== "PENDING") {
      throw new Error(`Approval is not pending (status: ${approval.status})`);
    }

    approval.status = "APPROVED";
    approval.decision = "approve";
    approval.decidedBy = userId;
    approval.comments = comments;
    approval.decidedAt = new Date();

    this.emit({
      type: "approval:decided",
      approval,
      timestamp: new Date(),
    });

    // Notify the workflow executor to resume
    await workflowExecutor.approveStep(
      approval.workflowInstanceId,
      approval.stepId,
      userId,
      "approve",
      comments
    );

    // Notify relevant parties
    eventBus.publishToAll({
      type: "approval_decided",
      payload: {
        approvalId: approval.id,
        title: approval.title,
        decision: "approve",
        decidedBy: userId,
        entityType: approval.entityType,
        entityId: approval.entityId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Reject ───

  async reject(approvalId: string, userId: string, comments?: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== "PENDING") {
      throw new Error(`Approval is not pending (status: ${approval.status})`);
    }

    approval.status = "REJECTED";
    approval.decision = "reject";
    approval.decidedBy = userId;
    approval.comments = comments;
    approval.decidedAt = new Date();

    this.emit({
      type: "approval:decided",
      approval,
      timestamp: new Date(),
    });

    // Notify the workflow executor
    await workflowExecutor.approveStep(
      approval.workflowInstanceId,
      approval.stepId,
      userId,
      "reject",
      comments
    );

    // Notify relevant parties
    eventBus.publishToAll({
      type: "approval_decided",
      payload: {
        approvalId: approval.id,
        title: approval.title,
        decision: "reject",
        decidedBy: userId,
        comments,
        entityType: approval.entityType,
        entityId: approval.entityId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Escalate ───

  async escalate(approvalId: string, toUserId: string, reason: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== "PENDING") {
      throw new Error(`Approval is not pending (status: ${approval.status})`);
    }

    approval.status = "ESCALATED";
    approval.escalatedTo = toUserId;
    approval.escalatedAt = new Date();
    approval.escalationReason = reason;

    this.emit({
      type: "approval:escalated",
      approval,
      timestamp: new Date(),
    });

    // Create a new approval for the escalated user
    const escalatedApproval = this.createApproval({
      workflowInstanceId: approval.workflowInstanceId,
      stepId: approval.stepId,
      tenantId: approval.tenantId,
      entityType: approval.entityType,
      entityId: approval.entityId,
      requiredRole: approval.requiredRole,
      requiredUserId: toUserId,
      title: `[Escalated] ${approval.title}`,
      description: `${approval.description}\n\nEscalation reason: ${reason}`,
      assignedTo: toUserId,
      dueDate: approval.dueDate,
      metadata: {
        ...approval.metadata,
        escalatedFrom: approval.id,
        escalationReason: reason,
      },
    });

    // Notify the escalation target
    eventBus.publish(toUserId, {
      type: "approval_escalated",
      payload: {
        approvalId: escalatedApproval.id,
        originalApprovalId: approval.id,
        title: escalatedApproval.title,
        description: escalatedApproval.description,
        reason,
        entityType: approval.entityType,
        entityId: approval.entityId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Expire ───

  async expire(approvalId: string, reason?: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== "PENDING") return;

    approval.status = "EXPIRED";
    approval.comments = reason ?? "Approval expired due to timeout";
    approval.decidedAt = new Date();

    this.emit({
      type: "approval:expired",
      approval,
      timestamp: new Date(),
    });
  }

  // ─── Statistics ───

  getStats(tenantId: string): ApprovalStats {
    const approvals = Array.from(this.approvals.values()).filter(
      (a) => a.tenantId === tenantId
    );

    const decided = approvals.filter((a) => a.decidedAt && a.createdAt);
    const totalDecisionTime = decided.reduce((sum, a) => {
      return sum + (a.decidedAt!.getTime() - a.createdAt.getTime());
    }, 0);

    return {
      pending: approvals.filter((a) => a.status === "PENDING").length,
      approved: approvals.filter((a) => a.status === "APPROVED").length,
      rejected: approvals.filter((a) => a.status === "REJECTED").length,
      escalated: approvals.filter((a) => a.status === "ESCALATED").length,
      expired: approvals.filter((a) => a.status === "EXPIRED").length,
      averageDecisionTimeMs: decided.length > 0 ? totalDecisionTime / decided.length : 0,
    };
  }

  // ─── Bulk Operations ───

  getApprovalsByInstance(workflowInstanceId: string): PendingApproval[] {
    return Array.from(this.approvals.values()).filter(
      (a) => a.workflowInstanceId === workflowInstanceId
    );
  }

  cancelApprovalsForInstance(workflowInstanceId: string): void {
    for (const approval of this.approvals.values()) {
      if (approval.workflowInstanceId === workflowInstanceId && approval.status === "PENDING") {
        approval.status = "EXPIRED";
        approval.comments = "Workflow cancelled";
        approval.decidedAt = new Date();
      }
    }
  }

  // ─── Cleanup ───

  /**
   * Remove old decided approvals from memory.
   * In production, these would be in the database and this wouldn't be needed.
   */
  pruneOldApprovals(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let pruned = 0;

    for (const [id, approval] of this.approvals.entries()) {
      if (
        approval.status !== "PENDING" &&
        approval.decidedAt &&
        approval.decidedAt.getTime() < cutoff
      ) {
        this.approvals.delete(id);
        pruned++;
      }
    }

    return pruned;
  }
}

// ─── ID Generation ───

function generateApprovalId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `appr-${timestamp}-${random.slice(0, 8)}`;
}

// ─── Singleton (survives HMR) ───

const APPROVAL_SERVICE_GLOBAL_KEY = "__pharma_erp_approval_service__";

function getApprovalService(): ApprovalService {
  const g = globalThis as unknown as Record<string, ApprovalService>;
  if (!g[APPROVAL_SERVICE_GLOBAL_KEY]) {
    g[APPROVAL_SERVICE_GLOBAL_KEY] = new ApprovalService();
  }
  return g[APPROVAL_SERVICE_GLOBAL_KEY];
}

export const approvalService = getApprovalService();
