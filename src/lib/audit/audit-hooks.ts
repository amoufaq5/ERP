"use client";

import { useCallback } from "react";
import { useAudit } from "./audit-context";
import {
  AuditAction,
  type AuditEntity,
  type AuditEntry,
  computeChanges,
} from "./audit-service";

/**
 * Convenience hook that wraps common audit patterns (create, update, delete,
 * approve, reject) so callers don't have to import enums or build changes
 * manually.
 */
export function useAuditedAction() {
  const { logAction } = useAudit();

  const auditCreate = useCallback(
    (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      data?: Record<string, unknown>
    ): AuditEntry => {
      return logAction(
        AuditAction.CREATE,
        entity,
        entityId,
        entityName,
        undefined,
        data ? { createdData: data } : undefined
      );
    },
    [logAction]
  );

  const auditUpdate = useCallback(
    (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      before: Record<string, unknown>,
      after: Record<string, unknown>
    ): AuditEntry => {
      const changes = computeChanges(before, after);
      return logAction(
        AuditAction.UPDATE,
        entity,
        entityId,
        entityName,
        changes
      );
    },
    [logAction]
  );

  const auditDelete = useCallback(
    (
      entity: AuditEntity,
      entityId: string,
      entityName: string
    ): AuditEntry => {
      return logAction(AuditAction.DELETE, entity, entityId, entityName);
    },
    [logAction]
  );

  const auditApprove = useCallback(
    (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      metadata?: Record<string, unknown>
    ): AuditEntry => {
      return logAction(
        AuditAction.APPROVE,
        entity,
        entityId,
        entityName,
        undefined,
        metadata
      );
    },
    [logAction]
  );

  const auditReject = useCallback(
    (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      metadata?: Record<string, unknown>
    ): AuditEntry => {
      return logAction(
        AuditAction.REJECT,
        entity,
        entityId,
        entityName,
        undefined,
        metadata
      );
    },
    [logAction]
  );

  return {
    auditCreate,
    auditUpdate,
    auditDelete,
    auditApprove,
    auditReject,
  };
}
