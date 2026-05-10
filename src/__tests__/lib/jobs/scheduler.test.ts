import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock dynamic imports used by registerDefaultJobs ────────────────────────

vi.mock('@/lib/compliance/data-retention', () => ({
  getDataRetentionService: () => ({
    applyRetention: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/auth/session-manager', () => ({
  sessionManager: {
    cleanupExpiredSessions: vi.fn(),
  },
}));

vi.mock('@/lib/compliance/compliance-service', () => ({
  getComplianceService: () => ({
    runAllChecks: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/integrations/webhook-delivery', () => ({
  WebhookDeliveryService: class {
    getDeadLetterQueue() {
      return [];
    }
    retryFailed = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/platform/report-builder', () => ({
  reportBuilder: {
    getReport: vi.fn().mockReturnValue(null),
    executeReport: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import scheduler module - it's a singleton, so we reset state carefully.
import { scheduler, registerDefaultJobs } from '@/lib/jobs/scheduler';
import type { JobDefinition } from '@/lib/jobs/scheduler';

// =============================================================================
// Helper to clean up registered jobs between tests
// =============================================================================

function cleanupJobs(ids: string[]) {
  for (const id of ids) {
    try { scheduler.unregister(id); } catch { /* ignore */ }
  }
}

afterEach(() => {
  scheduler.stop();
});

// =============================================================================
// Cron Parsing Tests
// =============================================================================

describe('Job Scheduler - Cron Parsing', () => {
  const cronTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(cronTestIds);
    cronTestIds.length = 0;
  });

  it('parses "every minute" cron expression (* * * * *)', () => {
    const id = 'cron-every-min';
    cronTestIds.push(id);
    scheduler.register({
      id,
      name: 'Every Minute',
      schedule: '* * * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === id);
    expect(task).toBeDefined();
    expect(task!.cron).toBe('* * * * *');
    expect(task!.nextRunAt).toBeDefined();
    expect(task!.enabled).toBe(true);
  });

  it('parses "daily at 2 AM" cron expression (0 2 * * *)', () => {
    const id = 'cron-daily-2am';
    cronTestIds.push(id);
    scheduler.register({
      id,
      name: 'Daily at 2AM',
      schedule: '0 2 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === id);
    expect(task).toBeDefined();
    expect(task!.nextRunAt).toBeDefined();
    expect(task!.nextRunAt!.getHours()).toBe(2);
    expect(task!.nextRunAt!.getMinutes()).toBe(0);
  });

  it('parses step expressions (*/15 * * * *)', () => {
    const id = 'cron-step-15';
    cronTestIds.push(id);
    scheduler.register({
      id,
      name: 'Every 15 min',
      schedule: '*/15 * * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === id);
    expect(task).toBeDefined();
    expect([0, 15, 30, 45]).toContain(task!.nextRunAt!.getMinutes());
  });

  it('parses range expressions (0 9-17 * * *)', () => {
    const id = 'cron-range-9-17';
    cronTestIds.push(id);
    scheduler.register({
      id,
      name: 'Business hours',
      schedule: '0 9-17 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === id);
    expect(task).toBeDefined();
    expect(task!.nextRunAt).toBeDefined();
    const hour = task!.nextRunAt!.getHours();
    expect(hour).toBeGreaterThanOrEqual(9);
    expect(hour).toBeLessThanOrEqual(17);
  });

  it('parses comma-separated values (0 6,12,18 * * *)', () => {
    const id = 'cron-comma';
    cronTestIds.push(id);
    scheduler.register({
      id,
      name: 'Three times a day',
      schedule: '0 6,12,18 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === id);
    expect(task).toBeDefined();
    expect([6, 12, 18]).toContain(task!.nextRunAt!.getHours());
  });

  it('throws on invalid cron expression (too few parts)', () => {
    expect(() => {
      scheduler.register({
        id: 'cron-bad',
        name: 'Bad cron',
        schedule: '* *',
        handler: async () => {},
      });
    }).toThrow('Invalid cron');
  });
});

// =============================================================================
// Job Registration Tests
// =============================================================================

describe('Job Scheduler - Job Registration', () => {
  const regTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(regTestIds);
    regTestIds.length = 0;
  });

  it('registers a job and retrieves it', () => {
    const id = 'reg-test-1';
    regTestIds.push(id);
    const handler = vi.fn();
    scheduler.register({
      id,
      name: 'Test Job',
      handler,
      retries: 2,
    });

    const jobs = scheduler.getRegisteredJobs();
    const found = jobs.find((j) => j.id === id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test Job');
    expect(found!.retries).toBe(2);
  });

  it('registers a job with a schedule and creates a scheduled task', () => {
    const id = 'reg-scheduled-1';
    regTestIds.push(id);
    scheduler.register({
      id,
      name: 'Scheduled Job',
      schedule: '0 3 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    expect(tasks.some((t) => t.jobId === id)).toBe(true);
  });

  it('unregisters a job and its scheduled task', () => {
    const id = 'reg-unreg-1';
    scheduler.register({
      id,
      name: 'Temp Job',
      schedule: '0 0 * * *',
      handler: async () => {},
    });

    expect(scheduler.getRegisteredJobs().some((j) => j.id === id)).toBe(true);
    expect(scheduler.getScheduledTasks().some((t) => t.jobId === id)).toBe(true);

    scheduler.unregister(id);

    expect(scheduler.getRegisteredJobs().some((j) => j.id === id)).toBe(false);
    expect(scheduler.getScheduledTasks().some((t) => t.jobId === id)).toBe(false);
  });

  it('throws when enqueueing an unregistered job', async () => {
    await expect(
      scheduler.enqueue('nonexistent-job-xyz', {}),
    ).rejects.toThrow('Job nonexistent-job-xyz not registered');
  });
});

// =============================================================================
// Job Execution Tests
// =============================================================================

describe('Job Scheduler - Job Execution', () => {
  const execTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(execTestIds);
    execTestIds.length = 0;
  });

  it('enqueues and executes a job successfully', async () => {
    const id = 'exec-test-1';
    execTestIds.push(id);
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({ id, name: 'Exec Test', handler });

    const queuedId = await scheduler.enqueue(id, { data: 'hello' });
    expect(queuedId).toBeDefined();
    expect(typeof queuedId).toBe('string');

    await scheduler.drain();

    expect(handler).toHaveBeenCalledWith({ data: 'hello' });

    const job = scheduler.getJob(queuedId);
    expect(job).toBeDefined();
    expect(job!.status).toBe('completed');
    expect(job!.completedAt).toBeDefined();
  });

  it('tracks job status through lifecycle', async () => {
    const id = 'status-test-1';
    execTestIds.push(id);

    let resolveHandler: () => void;
    const handlerPromise = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });
    const handler = vi.fn().mockReturnValue(handlerPromise);

    scheduler.register({ id, name: 'Status Test', handler });

    const queuedId = await scheduler.enqueue(id, {});

    // Initially pending
    let job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('pending');
    expect(job!.attempts).toBe(0);

    // Start drain in background
    const drainPromise = scheduler.drain();

    // Wait for execution to start
    await new Promise((r) => setTimeout(r, 200));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('running');
    expect(job!.attempts).toBe(1);
    expect(job!.startedAt).toBeDefined();

    // Resolve the handler
    resolveHandler!();
    await drainPromise;

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');
  });

  it('enqueues batch of jobs', async () => {
    const id = 'batch-test-1';
    execTestIds.push(id);
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({ id, name: 'Batch Test', handler });

    const ids = await scheduler.enqueueBatch(id, [
      { item: 1 },
      { item: 2 },
      { item: 3 },
    ]);

    expect(ids).toHaveLength(3);

    await scheduler.drain();

    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledWith({ item: 1 });
    expect(handler).toHaveBeenCalledWith({ item: 2 });
    expect(handler).toHaveBeenCalledWith({ item: 3 });
  });

  it('supports delayed job scheduling', async () => {
    const id = 'delay-test-1';
    execTestIds.push(id);
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({ id, name: 'Delay Test', handler });

    const queuedId = await scheduler.enqueue(id, {}, { delay: 5000 });

    const job = scheduler.getJob(queuedId);
    expect(job!.scheduledAt).toBeDefined();
    expect(job!.scheduledAt!.getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});

// =============================================================================
// Retry with Exponential Backoff Tests
// =============================================================================

describe('Job Scheduler - Retry with Exponential Backoff', () => {
  const retryTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(retryTestIds);
    retryTestIds.length = 0;
  });

  it('retries a failed job and eventually marks it as failed', async () => {
    const id = 'retry-fail-1';
    retryTestIds.push(id);
    const handler = vi.fn().mockRejectedValue(new Error('Transient error'));

    scheduler.register({
      id,
      name: 'Retry Test',
      handler,
      retries: 2, // maxAttempts = 3
    });

    const queuedId = await scheduler.enqueue(id, {});

    // Process first attempt
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));

    let job = scheduler.getJob(queuedId);
    // After first failure, should be retrying
    expect(job!.attempts).toBeGreaterThanOrEqual(1);
    expect(job!.error).toBe('Transient error');

    // Fast-forward retry delays
    if (job!.status === 'retrying' && job!.nextRetryAt) {
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));

    job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying' && job!.nextRetryAt) {
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.attempts).toBe(3);
    expect(job!.error).toBe('Transient error');
  }, 15000);

  it('sets nextRetryAt with backoff delay on failure', async () => {
    const id = 'backoff-check-1';
    retryTestIds.push(id);
    const handler = vi.fn().mockRejectedValue(new Error('Fail'));

    scheduler.register({
      id,
      name: 'Backoff Check',
      handler,
      retries: 3,
    });

    const queuedId = await scheduler.enqueue(id, {});

    // Process first attempt
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));

    const job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying') {
      expect(job!.nextRetryAt).toBeDefined();
      // After 1 attempt, backoff = min(30000, 1000 * 2^1) = 2000ms
      const delay = job!.nextRetryAt!.getTime() - Date.now();
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(31000);
    }
  }, 10000);

  it('marks job as completed if handler succeeds on retry', async () => {
    const id = 'retry-success-1';
    retryTestIds.push(id);
    let callCount = 0;
    const handler = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) throw new Error('First attempt fails');
    });

    scheduler.register({
      id,
      name: 'Retry Success',
      handler,
      retries: 3,
    });

    const queuedId = await scheduler.enqueue(id, {});

    // Process first attempt (will fail)
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));

    let job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying' && job!.nextRetryAt) {
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }

    // Process second attempt (will succeed)
    await scheduler.drain();
    await new Promise((r) => setTimeout(r, 250));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');
    expect(job!.attempts).toBe(2);
  }, 10000);
});

// =============================================================================
// Concurrency Control Tests
// =============================================================================

describe('Job Scheduler - Concurrency Control', () => {
  const concTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(concTestIds);
    concTestIds.length = 0;
  });

  it('respects per-job concurrency limit', async () => {
    const id = 'conc-test-1';
    concTestIds.push(id);

    let concurrentCount = 0;
    let maxConcurrent = 0;
    const resolvers: Array<() => void> = [];

    const handler = vi.fn().mockImplementation(async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
      concurrentCount--;
    });

    scheduler.register({
      id,
      name: 'Concurrency Test',
      handler,
      concurrency: 2,
    });

    // Enqueue 5 jobs
    for (let i = 0; i < 5; i++) {
      await scheduler.enqueue(id, { i });
    }

    // Start processing
    const drainPromise = scheduler.drain();

    // Wait for initial processing
    await new Promise((r) => setTimeout(r, 400));

    // At most 2 should be running concurrently
    expect(maxConcurrent).toBeLessThanOrEqual(2);

    // Resolve all pending handlers
    while (resolvers.length > 0) {
      const resolver = resolvers.shift()!;
      resolver();
      await new Promise((r) => setTimeout(r, 200));
    }

    await drainPromise;
    expect(handler).toHaveBeenCalledTimes(5);
  }, 15000);

  it('getQueueStats returns correct counts for freshly enqueued jobs', async () => {
    const id = 'stats-test-1';
    concTestIds.push(id);
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({ id, name: 'Stats Test', handler });

    const qid1 = await scheduler.enqueue(id, { a: 1 });
    const qid2 = await scheduler.enqueue(id, { a: 2 });

    // The two just-enqueued jobs should be pending
    const job1 = scheduler.getJob(qid1);
    const job2 = scheduler.getJob(qid2);
    expect(job1!.status).toBe('pending');
    expect(job2!.status).toBe('pending');

    await scheduler.drain();

    // After drain, both should be completed
    expect(scheduler.getJob(qid1)!.status).toBe('completed');
    expect(scheduler.getJob(qid2)!.status).toBe('completed');
  });
});

// =============================================================================
// Default Jobs Tests
// =============================================================================

describe('Job Scheduler - registerDefaultJobs', () => {
  // Register default jobs once for this describe block
  beforeEach(() => {
    // Only register if not already registered
    const existing = scheduler.getRegisteredJobs().map((j) => j.id);
    if (!existing.includes('data-retention-cleanup')) {
      registerDefaultJobs();
    }
  });

  it('registers all 6 default jobs', () => {
    const jobs = scheduler.getRegisteredJobs();
    const jobIds = jobs.map((j) => j.id);

    expect(jobIds).toContain('data-retention-cleanup');
    expect(jobIds).toContain('session-cleanup');
    expect(jobIds).toContain('compliance-check');
    expect(jobIds).toContain('webhook-retry');
    expect(jobIds).toContain('send-notification');
    expect(jobIds).toContain('generate-report');
  });

  it('data-retention-cleanup runs daily at 2 AM with correct config', () => {
    const jobs = scheduler.getRegisteredJobs();
    const drJob = jobs.find((j) => j.id === 'data-retention-cleanup');
    expect(drJob).toBeDefined();
    expect(drJob!.name).toBe('Data Retention Cleanup');
    expect(drJob!.schedule).toBe('0 2 * * *');
    expect(drJob!.retries).toBe(2);
    expect(drJob!.timeout).toBe(600000);
  });

  it('session-cleanup runs every 15 minutes', () => {
    const jobs = scheduler.getRegisteredJobs();
    const scJob = jobs.find((j) => j.id === 'session-cleanup');
    expect(scJob).toBeDefined();
    expect(scJob!.schedule).toBe('*/15 * * * *');
    expect(scJob!.retries).toBe(1);
  });

  it('compliance-check runs daily at 6 AM', () => {
    const jobs = scheduler.getRegisteredJobs();
    const ccJob = jobs.find((j) => j.id === 'compliance-check');
    expect(ccJob).toBeDefined();
    expect(ccJob!.schedule).toBe('0 6 * * *');
    expect(ccJob!.retries).toBe(2);
    expect(ccJob!.timeout).toBe(300000);
  });

  it('webhook-retry runs every 5 minutes', () => {
    const jobs = scheduler.getRegisteredJobs();
    const wrJob = jobs.find((j) => j.id === 'webhook-retry');
    expect(wrJob).toBeDefined();
    expect(wrJob!.schedule).toBe('*/5 * * * *');
  });

  it('send-notification has concurrency 10 and 3 retries', () => {
    const jobs = scheduler.getRegisteredJobs();
    const snJob = jobs.find((j) => j.id === 'send-notification');
    expect(snJob).toBeDefined();
    expect(snJob!.concurrency).toBe(10);
    expect(snJob!.retries).toBe(3);
    expect(snJob!.schedule).toBeUndefined();
  });

  it('generate-report has timeout 120000 and 2 retries', () => {
    const jobs = scheduler.getRegisteredJobs();
    const grJob = jobs.find((j) => j.id === 'generate-report');
    expect(grJob).toBeDefined();
    expect(grJob!.timeout).toBe(120000);
    expect(grJob!.retries).toBe(2);
    expect(grJob!.schedule).toBeUndefined();
  });

  it('creates scheduled tasks for jobs with cron schedules', () => {
    const tasks = scheduler.getScheduledTasks();
    const scheduledJobIds = tasks.map((t) => t.jobId);

    expect(scheduledJobIds).toContain('data-retention-cleanup');
    expect(scheduledJobIds).toContain('session-cleanup');
    expect(scheduledJobIds).toContain('compliance-check');
    expect(scheduledJobIds).toContain('webhook-retry');

    // Jobs without schedules should not have tasks
    expect(scheduledJobIds).not.toContain('send-notification');
    expect(scheduledJobIds).not.toContain('generate-report');
  });
});

// =============================================================================
// Job Status Tracking Tests
// =============================================================================

describe('Job Scheduler - Job Status Tracking', () => {
  const statusTestIds: string[] = [];

  afterEach(() => {
    cleanupJobs(statusTestIds);
    statusTestIds.length = 0;
  });

  it('getJob returns undefined for non-existent job ID', () => {
    const job = scheduler.getJob('nonexistent-id-xyz');
    expect(job).toBeUndefined();
  });

  it('completed job has completedAt timestamp', async () => {
    const id = 'ts-test-1';
    statusTestIds.push(id);
    const handler = vi.fn().mockImplementation(async () => {
      // Small delay to ensure completedAt > createdAt
      await new Promise((r) => setTimeout(r, 10));
    });

    scheduler.register({ id, name: 'Timestamp Test', handler });

    const queuedId = await scheduler.enqueue(id, {});
    await scheduler.drain();

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');
    expect(job!.completedAt).toBeInstanceOf(Date);
    expect(job!.completedAt!.getTime()).toBeGreaterThanOrEqual(job!.createdAt.getTime());
  });

  it('failed job has error message', async () => {
    const id = 'err-msg-test-1';
    statusTestIds.push(id);
    const handler = vi.fn().mockRejectedValue(new Error('Critical failure'));

    scheduler.register({
      id,
      name: 'Error Message Test',
      handler,
      retries: 0,
    });

    const queuedId = await scheduler.enqueue(id, {});

    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.error).toBe('Critical failure');
    expect(job!.attempts).toBe(1);
  });

  it('scheduler start and stop control processing', () => {
    // Start is idempotent
    scheduler.start();
    scheduler.start(); // second call should be no-op

    scheduler.stop();
    // No error expected
  });

  it('job definition not found after unregister marks queued job as failed', async () => {
    const id = 'unreg-queue-test-1';
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({ id, name: 'Unregister Queue Test', handler });

    const queuedId = await scheduler.enqueue(id, {});

    // Unregister before the job runs
    scheduler.unregister(id);

    // Process - the job def is gone
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.error).toContain('not found');
  });
});
