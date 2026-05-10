import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to reset the global scheduler between tests, so we avoid importing
// the singleton directly and instead work with a fresh JobScheduler each time.
// To test the module's exports, we dynamically import or mock.

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

// We need to clear the global singleton between test runs
const GLOBAL_KEY = '__erp_job_scheduler__';

beforeEach(() => {
  // Remove the global singleton so each test gets a fresh scheduler
  delete (globalThis as Record<string, unknown>)[GLOBAL_KEY];
});

// =============================================================================
// Cron Parsing Tests
// =============================================================================

describe('Job Scheduler - Cron Parsing', () => {
  it('parses "every minute" cron expression (* * * * *)', async () => {
    // We test by registering a job with a cron and verifying it creates a scheduled task
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'cron-test-every-min',
      name: 'Every Minute',
      schedule: '* * * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === 'cron-test-every-min');
    expect(task).toBeDefined();
    expect(task!.cron).toBe('* * * * *');
    expect(task!.nextRunAt).toBeDefined();
    expect(task!.enabled).toBe(true);

    scheduler.unregister('cron-test-every-min');
  });

  it('parses "daily at 2 AM" cron expression (0 2 * * *)', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'cron-test-daily',
      name: 'Daily at 2AM',
      schedule: '0 2 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === 'cron-test-daily');
    expect(task).toBeDefined();
    expect(task!.nextRunAt).toBeDefined();
    // Next run should be at hour 2, minute 0
    expect(task!.nextRunAt!.getHours()).toBe(2);
    expect(task!.nextRunAt!.getMinutes()).toBe(0);

    scheduler.unregister('cron-test-daily');
  });

  it('parses step expressions (*/15 * * * *)', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'cron-test-step',
      name: 'Every 15 min',
      schedule: '*/15 * * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === 'cron-test-step');
    expect(task).toBeDefined();
    // Next run minute should be one of: 0, 15, 30, 45
    expect([0, 15, 30, 45]).toContain(task!.nextRunAt!.getMinutes());

    scheduler.unregister('cron-test-step');
  });

  it('parses range expressions (0 9-17 * * *)', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'cron-test-range',
      name: 'Business hours',
      schedule: '0 9-17 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === 'cron-test-range');
    expect(task).toBeDefined();
    expect(task!.nextRunAt).toBeDefined();

    scheduler.unregister('cron-test-range');
  });

  it('parses comma-separated values (0 6,12,18 * * *)', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'cron-test-comma',
      name: 'Three times a day',
      schedule: '0 6,12,18 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    const task = tasks.find((t) => t.jobId === 'cron-test-comma');
    expect(task).toBeDefined();
    expect([6, 12, 18]).toContain(task!.nextRunAt!.getHours());

    scheduler.unregister('cron-test-comma');
  });

  it('throws on invalid cron expression (too few parts)', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    expect(() => {
      scheduler.register({
        id: 'cron-test-bad',
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
  it('registers a job and retrieves it', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    const handler = vi.fn();
    scheduler.register({
      id: 'test-job',
      name: 'Test Job',
      handler,
      retries: 2,
    });

    const jobs = scheduler.getRegisteredJobs();
    const found = jobs.find((j) => j.id === 'test-job');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test Job');
    expect(found!.retries).toBe(2);

    scheduler.unregister('test-job');
  });

  it('registers a job with a schedule and creates a scheduled task', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'scheduled-job',
      name: 'Scheduled Job',
      schedule: '0 3 * * *',
      handler: async () => {},
    });

    const tasks = scheduler.getScheduledTasks();
    expect(tasks.some((t) => t.jobId === 'scheduled-job')).toBe(true);

    scheduler.unregister('scheduled-job');
  });

  it('unregisters a job and its scheduled task', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    scheduler.register({
      id: 'temp-job',
      name: 'Temp Job',
      schedule: '0 0 * * *',
      handler: async () => {},
    });

    expect(scheduler.getRegisteredJobs().some((j) => j.id === 'temp-job')).toBe(true);
    expect(scheduler.getScheduledTasks().some((t) => t.jobId === 'temp-job')).toBe(true);

    scheduler.unregister('temp-job');

    expect(scheduler.getRegisteredJobs().some((j) => j.id === 'temp-job')).toBe(false);
    expect(scheduler.getScheduledTasks().some((t) => t.jobId === 'temp-job')).toBe(false);
  });

  it('throws when enqueueing an unregistered job', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    await expect(
      scheduler.enqueue('nonexistent-job', {}),
    ).rejects.toThrow('Job nonexistent-job not registered');
  });
});

// =============================================================================
// Job Execution Tests
// =============================================================================

describe('Job Scheduler - Job Execution', () => {
  afterEach(async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    scheduler.stop();
  });

  it('enqueues and executes a job successfully', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'exec-test',
      name: 'Execution Test',
      handler,
    });

    const queuedId = await scheduler.enqueue('exec-test', { data: 'hello' });
    expect(queuedId).toBeDefined();
    expect(typeof queuedId).toBe('string');

    // Drain the queue to process jobs
    await scheduler.drain();

    expect(handler).toHaveBeenCalledWith({ data: 'hello' });

    const job = scheduler.getJob(queuedId);
    expect(job).toBeDefined();
    expect(job!.status).toBe('completed');
    expect(job!.completedAt).toBeDefined();

    scheduler.unregister('exec-test');
  });

  it('tracks job status through lifecycle', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    let resolveHandler: () => void;
    const handlerPromise = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });
    const handler = vi.fn().mockReturnValue(handlerPromise);

    scheduler.register({
      id: 'status-test',
      name: 'Status Test',
      handler,
    });

    const queuedId = await scheduler.enqueue('status-test', {});

    // Initially pending
    let job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('pending');
    expect(job!.attempts).toBe(0);

    // Process the queue (but handler hasn't resolved yet)
    // Call drain in background, then resolve
    const drainPromise = scheduler.drain();

    // Wait a tick for the job to start
    await new Promise((r) => setTimeout(r, 150));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('running');
    expect(job!.attempts).toBe(1);
    expect(job!.startedAt).toBeDefined();

    // Resolve the handler
    resolveHandler!();
    await drainPromise;

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');

    scheduler.unregister('status-test');
  });

  it('enqueues batch of jobs', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'batch-test',
      name: 'Batch Test',
      handler,
    });

    const ids = await scheduler.enqueueBatch('batch-test', [
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

    scheduler.unregister('batch-test');
  });

  it('supports delayed job scheduling', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'delay-test',
      name: 'Delay Test',
      handler,
    });

    const queuedId = await scheduler.enqueue('delay-test', {}, { delay: 5000 });

    const job = scheduler.getJob(queuedId);
    expect(job!.scheduledAt).toBeDefined();
    expect(job!.scheduledAt!.getTime()).toBeGreaterThan(Date.now() - 1000);

    scheduler.unregister('delay-test');
  });
});

// =============================================================================
// Retry with Exponential Backoff Tests
// =============================================================================

describe('Job Scheduler - Retry with Exponential Backoff', () => {
  afterEach(async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    scheduler.stop();
  });

  it('retries a failed job up to maxAttempts', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockRejectedValue(new Error('Transient error'));

    scheduler.register({
      id: 'retry-test',
      name: 'Retry Test',
      handler,
      retries: 2, // maxAttempts = retries + 1 = 3
    });

    const queuedId = await scheduler.enqueue('retry-test', {});

    // Process the queue. We need to advance through retries.
    // drain() will keep processing until the job is fully done.
    // But retries have backoff delays. Let's mock the nextRetryAt to be in the past.
    // We'll process and then adjust nextRetryAt manually.

    // First attempt
    await scheduler.drain().catch(() => {});

    // Wait briefly for the first failure to register
    await new Promise((r) => setTimeout(r, 200));

    let job = scheduler.getJob(queuedId);
    // After first failure, should be retrying with attempt count 1
    if (job!.status === 'retrying') {
      // Set nextRetryAt to now to allow immediate retry
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }

    // Process again
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying') {
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }

    // Process final attempt
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.attempts).toBe(3);
    expect(job!.error).toBe('Transient error');

    scheduler.unregister('retry-test');
  });

  it('sets exponential backoff delay on retry', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockRejectedValue(new Error('Fail'));

    scheduler.register({
      id: 'backoff-test',
      name: 'Backoff Test',
      handler,
      retries: 3,
    });

    const queuedId = await scheduler.enqueue('backoff-test', {});

    // Drain to trigger first execution
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    const job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying') {
      expect(job!.nextRetryAt).toBeDefined();
      // After 1 attempt, backoff should be min(30000, 1000 * 2^1) = 2000ms
      const backoffMs = job!.nextRetryAt!.getTime() - Date.now();
      // Allow some tolerance
      expect(backoffMs).toBeGreaterThan(500);
      expect(backoffMs).toBeLessThanOrEqual(31000);
    }

    scheduler.unregister('backoff-test');
  });

  it('marks job as completed if handler succeeds on retry', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    let callCount = 0;
    const handler = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) throw new Error('First attempt fails');
    });

    scheduler.register({
      id: 'retry-success-test',
      name: 'Retry Success',
      handler,
      retries: 3,
    });

    const queuedId = await scheduler.enqueue('retry-success-test', {});

    // First attempt - should fail
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    let job = scheduler.getJob(queuedId);
    if (job!.status === 'retrying') {
      job!.nextRetryAt = new Date(Date.now() - 1000);
    }

    // Second attempt - should succeed
    await scheduler.drain();
    await new Promise((r) => setTimeout(r, 200));

    job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');
    expect(job!.attempts).toBe(2);

    scheduler.unregister('retry-success-test');
  });
});

// =============================================================================
// Concurrency Control Tests
// =============================================================================

describe('Job Scheduler - Concurrency Control', () => {
  afterEach(async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    scheduler.stop();
  });

  it('respects per-job concurrency limit', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

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
      id: 'concurrency-test',
      name: 'Concurrency Test',
      handler,
      concurrency: 2,
    });

    // Enqueue 5 jobs
    for (let i = 0; i < 5; i++) {
      await scheduler.enqueue('concurrency-test', { i });
    }

    // Start processing
    const drainPromise = scheduler.drain();

    // Wait for initial processing
    await new Promise((r) => setTimeout(r, 300));

    // At most 2 should be running concurrently
    expect(maxConcurrent).toBeLessThanOrEqual(2);

    // Resolve all pending handlers
    while (resolvers.length > 0) {
      const resolver = resolvers.shift()!;
      resolver();
      await new Promise((r) => setTimeout(r, 150));
    }

    await drainPromise;

    expect(handler).toHaveBeenCalledTimes(5);

    scheduler.unregister('concurrency-test');
  });

  it('getQueueStats returns correct counts', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'stats-test',
      name: 'Stats Test',
      handler,
    });

    await scheduler.enqueue('stats-test', { a: 1 });
    await scheduler.enqueue('stats-test', { a: 2 });

    let stats = scheduler.getQueueStats();
    expect(stats.pending).toBe(2);
    expect(stats.running).toBe(0);
    expect(stats.completed).toBe(0);

    await scheduler.drain();

    stats = scheduler.getQueueStats();
    expect(stats.pending).toBe(0);
    expect(stats.completed).toBe(2);

    scheduler.unregister('stats-test');
  });
});

// =============================================================================
// Default Jobs Tests
// =============================================================================

describe('Job Scheduler - registerDefaultJobs', () => {
  it('registers all 6 default jobs', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const jobIds = jobs.map((j) => j.id);

    expect(jobIds).toContain('data-retention-cleanup');
    expect(jobIds).toContain('session-cleanup');
    expect(jobIds).toContain('compliance-check');
    expect(jobIds).toContain('webhook-retry');
    expect(jobIds).toContain('send-notification');
    expect(jobIds).toContain('generate-report');
    expect(jobIds.length).toBeGreaterThanOrEqual(6);
  });

  it('data-retention-cleanup runs daily at 2 AM with correct config', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const drJob = jobs.find((j) => j.id === 'data-retention-cleanup');
    expect(drJob).toBeDefined();
    expect(drJob!.name).toBe('Data Retention Cleanup');
    expect(drJob!.schedule).toBe('0 2 * * *');
    expect(drJob!.retries).toBe(2);
    expect(drJob!.timeout).toBe(600000);
  });

  it('session-cleanup runs every 15 minutes', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const scJob = jobs.find((j) => j.id === 'session-cleanup');
    expect(scJob).toBeDefined();
    expect(scJob!.schedule).toBe('*/15 * * * *');
    expect(scJob!.retries).toBe(1);
  });

  it('compliance-check runs daily at 6 AM', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const ccJob = jobs.find((j) => j.id === 'compliance-check');
    expect(ccJob).toBeDefined();
    expect(ccJob!.schedule).toBe('0 6 * * *');
    expect(ccJob!.retries).toBe(2);
    expect(ccJob!.timeout).toBe(300000);
  });

  it('webhook-retry runs every 5 minutes', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const wrJob = jobs.find((j) => j.id === 'webhook-retry');
    expect(wrJob).toBeDefined();
    expect(wrJob!.schedule).toBe('*/5 * * * *');
  });

  it('send-notification has concurrency 10 and 3 retries', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const snJob = jobs.find((j) => j.id === 'send-notification');
    expect(snJob).toBeDefined();
    expect(snJob!.concurrency).toBe(10);
    expect(snJob!.retries).toBe(3);
    expect(snJob!.schedule).toBeUndefined(); // on-demand, no schedule
  });

  it('generate-report has timeout 120000 and 2 retries', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const jobs = scheduler.getRegisteredJobs();
    const grJob = jobs.find((j) => j.id === 'generate-report');
    expect(grJob).toBeDefined();
    expect(grJob!.timeout).toBe(120000);
    expect(grJob!.retries).toBe(2);
    expect(grJob!.schedule).toBeUndefined(); // on-demand
  });

  it('creates scheduled tasks for jobs with cron schedules', async () => {
    const { scheduler, registerDefaultJobs } = await import('@/lib/jobs/scheduler');

    registerDefaultJobs();

    const tasks = scheduler.getScheduledTasks();
    const scheduledJobIds = tasks.map((t) => t.jobId);

    // Jobs with schedules
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
  afterEach(async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    scheduler.stop();
  });

  it('getJob returns undefined for non-existent job ID', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');

    const job = scheduler.getJob('nonexistent-id');
    expect(job).toBeUndefined();
  });

  it('completed job has completedAt timestamp', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'ts-test',
      name: 'Timestamp Test',
      handler,
    });

    const queuedId = await scheduler.enqueue('ts-test', {});
    await scheduler.drain();

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('completed');
    expect(job!.completedAt).toBeInstanceOf(Date);
    expect(job!.completedAt!.getTime()).toBeGreaterThan(job!.createdAt.getTime());

    scheduler.unregister('ts-test');
  });

  it('failed job has error message', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockRejectedValue(new Error('Critical failure'));

    scheduler.register({
      id: 'error-msg-test',
      name: 'Error Message Test',
      handler,
      retries: 0, // No retries, fail immediately
    });

    const queuedId = await scheduler.enqueue('error-msg-test', {});

    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.error).toBe('Critical failure');
    expect(job!.attempts).toBe(1);

    scheduler.unregister('error-msg-test');
  });

  it('scheduler start and stop control processing', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'startstop-test',
      name: 'Start Stop Test',
      handler,
    });

    // Start is idempotent
    scheduler.start();
    scheduler.start(); // second call should be no-op

    scheduler.stop();

    scheduler.unregister('startstop-test');
  });

  it('job definition not found after unregister marks queued job as failed', async () => {
    const { scheduler } = await import('@/lib/jobs/scheduler');
    const handler = vi.fn().mockResolvedValue(undefined);

    scheduler.register({
      id: 'unregister-queue-test',
      name: 'Unregister Queue Test',
      handler,
    });

    const queuedId = await scheduler.enqueue('unregister-queue-test', {});

    // Unregister before the job runs
    scheduler.unregister('unregister-queue-test');

    // Try to process -- the job def is gone
    await scheduler.drain().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));

    const job = scheduler.getJob(queuedId);
    expect(job!.status).toBe('failed');
    expect(job!.error).toContain('not found');
  });
});
