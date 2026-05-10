import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the event bus to avoid side effects
vi.mock('@/lib/notifications/event-bus', () => ({
  eventBus: {
    publish: vi.fn(),
    publishToAll: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

import {
  WorkflowExecutor,
  type Workflow,
  type WorkflowStep,
  type WorkflowExecutorOptions,
} from '../workflow-engine';

function createTestWorkflow(steps: WorkflowStep[], overrides?: Partial<Workflow>): Workflow {
  return {
    id: 'wf-test-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    trigger: 'manual',
    triggerEntity: 'invoice',
    steps,
    isActive: true,
    createdAt: new Date().toISOString(),
    runCount: 0,
    ...overrides,
  };
}

function createStep(overrides: Partial<WorkflowStep> & { id: string; type: WorkflowStep['type'] }): WorkflowStep {
  return {
    name: overrides.name ?? `Step ${overrides.id}`,
    config: {},
    nextSteps: [],
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  let mockNotificationService: WorkflowExecutorOptions['notificationService'];
  let mockHttpClient: WorkflowExecutorOptions['httpClient'];
  let mockJobScheduler: WorkflowExecutorOptions['jobScheduler'];

  beforeEach(() => {
    mockNotificationService = {
      send: vi.fn().mockResolvedValue({ success: true }),
    };
    mockHttpClient = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        body: { ok: true },
        headers: { 'content-type': 'application/json' },
      }),
    };
    mockJobScheduler = {
      schedule: vi.fn(),
      cancel: vi.fn(),
    };

    executor = new WorkflowExecutor({
      notificationService: mockNotificationService,
      httpClient: mockHttpClient,
      jobScheduler: mockJobScheduler,
    });
  });

  // ===========================================================================
  // Condition Step Evaluation
  // ===========================================================================

  describe('condition step evaluation', () => {
    it('follows true branch when condition is met', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'cond-1',
          type: 'condition',
          name: 'Check Amount',
          config: {
            field: 'amount',
            operator: 'greater_than',
            value: 100,
          },
          nextSteps: ['action-true'],
        }),
        createStep({
          id: 'action-true',
          type: 'action',
          name: 'High Amount Action',
          config: { actionType: 'set_variable', variableName: 'result', variableValue: 'high' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
        context: { amount: 200 },
      });

      expect(instance.status).toBe('COMPLETED');
      expect(instance.stepResults['cond-1'].status).toBe('COMPLETED');
      expect(instance.stepResults['action-true'].status).toBe('COMPLETED');
      expect(instance.context.result).toBe('high');
    });

    it('follows else branch when condition is not met', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'cond-1',
          type: 'condition',
          name: 'Check Amount',
          config: {
            field: 'amount',
            operator: 'greater_than',
            value: 100,
            elseStepId: 'action-false',
          },
          nextSteps: ['action-true'],
        }),
        createStep({
          id: 'action-true',
          type: 'action',
          name: 'High Action',
          config: { actionType: 'set_variable', variableName: 'result', variableValue: 'high' },
          nextSteps: [],
        }),
        createStep({
          id: 'action-false',
          type: 'action',
          name: 'Low Action',
          config: { actionType: 'set_variable', variableName: 'result', variableValue: 'low' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
        context: { amount: 50 },
      });

      expect(instance.status).toBe('COMPLETED');
      expect(instance.context.result).toBe('low');
    });

    it('evaluates equals operator correctly', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'cond-1',
          type: 'condition',
          name: 'Check Status',
          config: {
            field: 'status',
            operator: 'equals',
            value: 'APPROVED',
          },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
        context: { status: 'APPROVED' },
      });

      expect(instance.status).toBe('COMPLETED');
      const output = instance.stepResults['cond-1'].output as Record<string, unknown>;
      expect(output.result).toBe(true);
    });
  });

  // ===========================================================================
  // Step Execution Order
  // ===========================================================================

  describe('step execution order', () => {
    it('executes steps in order following nextSteps chain', async () => {
      const executionOrder: string[] = [];

      executor.on('step:completed', (event) => {
        if (event.stepId) executionOrder.push(event.stepId);
      });

      const steps: WorkflowStep[] = [
        createStep({
          id: 'step-1',
          type: 'action',
          name: 'First',
          config: { actionType: 'set_variable', variableName: 'v1', variableValue: 'a' },
          nextSteps: ['step-2'],
        }),
        createStep({
          id: 'step-2',
          type: 'action',
          name: 'Second',
          config: { actionType: 'set_variable', variableName: 'v2', variableValue: 'b' },
          nextSteps: ['step-3'],
        }),
        createStep({
          id: 'step-3',
          type: 'action',
          name: 'Third',
          config: { actionType: 'set_variable', variableName: 'v3', variableValue: 'c' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('COMPLETED');
      expect(executionOrder).toEqual(['step-1', 'step-2', 'step-3']);
      expect(instance.context.v1).toBe('a');
      expect(instance.context.v2).toBe('b');
      expect(instance.context.v3).toBe('c');
    });

    it('completes workflow when last step has no nextSteps', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'only-step',
          type: 'action',
          name: 'Only Step',
          config: { actionType: 'set_variable', variableName: 'done', variableValue: true },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('COMPLETED');
      expect(instance.completedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // Parallel Gateway
  // ===========================================================================

  describe('parallel gateway handling', () => {
    it('executes parallel branches concurrently', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'parallel-1',
          type: 'parallel',
          name: 'Parallel Gate',
          config: {
            branches: [
              {
                id: 'branch-a',
                stepIds: ['action-a'],
              },
              {
                id: 'branch-b',
                stepIds: ['action-b'],
              },
            ],
          },
          nextSteps: [],
        }),
        createStep({
          id: 'action-a',
          type: 'action',
          name: 'Branch A Action',
          config: { actionType: 'set_variable', variableName: 'branchA', variableValue: 'done' },
          nextSteps: [],
        }),
        createStep({
          id: 'action-b',
          type: 'action',
          name: 'Branch B Action',
          config: { actionType: 'set_variable', variableName: 'branchB', variableValue: 'done' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('COMPLETED');
      expect(instance.context.branchA).toBe('done');
      expect(instance.context.branchB).toBe('done');
      expect(instance.stepResults['parallel-1'].status).toBe('COMPLETED');
    });

    it('completes with no branches configured', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'parallel-empty',
          type: 'parallel',
          name: 'Empty Parallel',
          config: { branches: [] },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('COMPLETED');
    });
  });

  // ===========================================================================
  // Notification Step
  // ===========================================================================

  describe('notification step', () => {
    it('sends notification and advances', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'notify-1',
          type: 'notification',
          name: 'Notify Manager',
          config: {
            channel: 'email',
            recipient: 'manager@test.com',
            subject: 'Invoice {{_entityId}}',
            template: 'Invoice {{_entityId}} needs review',
          },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('COMPLETED');
      expect(mockNotificationService!.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          recipient: 'manager@test.com',
        }),
      );
    });
  });

  // ===========================================================================
  // Approval Step
  // ===========================================================================

  describe('approval step', () => {
    it('pauses workflow at approval step', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'approval-1',
          type: 'approval',
          name: 'Manager Approval',
          config: { approver: 'manager' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('WAITING');
    });

    it('fails workflow when approval is rejected', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'approval-1',
          type: 'approval',
          name: 'Manager Approval',
          config: { approver: 'manager' },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      expect(instance.status).toBe('WAITING');

      await executor.approveStep(instance.id, 'approval-1', 'user-1', 'reject', 'Not acceptable');

      expect(instance.status).toBe('FAILED');
      expect(instance.error).toContain('rejected');
      expect(instance.stepResults['approval-1'].status).toBe('FAILED');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('fails workflow when starting with unknown workflow ID', async () => {
      await expect(
        executor.startWorkflow({
          workflowId: 'nonexistent',
          tenantId: 'tenant-1',
          entityType: 'invoice',
          entityId: 'inv-1',
        }),
      ).rejects.toThrow('Workflow not found');
    });

    it('fails workflow with no steps', async () => {
      const workflow = createTestWorkflow([], { id: 'wf-empty' });
      executor.registerWorkflow(workflow);

      await expect(
        executor.startWorkflow({
          workflowId: 'wf-empty',
          tenantId: 'tenant-1',
          entityType: 'invoice',
          entityId: 'inv-1',
        }),
      ).rejects.toThrow('no steps');
    });
  });

  // ===========================================================================
  // Instance Management
  // ===========================================================================

  describe('instance management', () => {
    it('tracks instances and allows retrieval', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'step-1',
          type: 'action',
          name: 'Action',
          config: { actionType: 'set_variable', variableName: 'x', variableValue: 1 },
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      const retrieved = executor.getInstance(instance.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.workflowId).toBe('wf-test-1');
    });

    it('cancels a running workflow', async () => {
      const steps: WorkflowStep[] = [
        createStep({
          id: 'approval-1',
          type: 'approval',
          name: 'Approval',
          config: {},
          nextSteps: [],
        }),
      ];

      const workflow = createTestWorkflow(steps);
      executor.registerWorkflow(workflow);

      const instance = await executor.startWorkflow({
        workflowId: 'wf-test-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
      });

      await executor.cancelWorkflow(instance.id, 'No longer needed');
      expect(instance.status).toBe('CANCELLED');
      expect(instance.error).toContain('No longer needed');
    });
  });
});
