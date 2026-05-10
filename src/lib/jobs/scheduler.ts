export interface JobDefinition {
  id: string;
  name: string;
  handler: (payload: unknown) => Promise<void>;
  schedule?: string;
  retries?: number;
  timeout?: number;
  concurrency?: number;
}

export interface QueuedJob {
  id: string;
  jobId: string;
  payload: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  nextRetryAt?: Date;
  scheduledAt?: Date;
}

export interface ScheduledTask {
  id: string;
  jobId: string;
  cron: string;
  payload: unknown;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

type CronField = number[];

interface ParsedCron {
  minutes: CronField;
  hours: CronField;
  daysOfMonth: CronField;
  months: CronField;
  daysOfWeek: CronField;
}

function parseCronField(field: string, min: number, max: number): CronField {
  if (field === '*') return Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const values: number[] = [];
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const stepNum = parseInt(step, 10);
      const [start, end] = range === '*' ? [min, max] : range.split('-').map(Number);
      for (let i = start; i <= (end || max); i += stepNum) values.push(i);
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) values.push(i);
    } else {
      values.push(parseInt(part, 10));
    }
  }
  return values.filter(v => v >= min && v <= max);
}

function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron: ${expression}`);
  return {
    minutes: parseCronField(parts[0], 0, 59),
    hours: parseCronField(parts[1], 0, 23),
    daysOfMonth: parseCronField(parts[2], 1, 31),
    months: parseCronField(parts[3], 1, 12),
    daysOfWeek: parseCronField(parts[4], 0, 6),
  };
}

function matchesCron(cron: ParsedCron, date: Date): boolean {
  return (
    cron.minutes.includes(date.getMinutes()) &&
    cron.hours.includes(date.getHours()) &&
    cron.daysOfMonth.includes(date.getDate()) &&
    cron.months.includes(date.getMonth() + 1) &&
    cron.daysOfWeek.includes(date.getDay())
  );
}

function getNextCronTime(expression: string, after: Date = new Date()): Date {
  const cron = parseCron(expression);
  const next = new Date(after);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  for (let i = 0; i < 525960; i++) {
    if (matchesCron(cron, next)) return next;
    next.setMinutes(next.getMinutes() + 1);
  }
  throw new Error(`No next run found for ${expression}`);
}

class JobScheduler {
  private jobs = new Map<string, JobDefinition>();
  private queue: QueuedJob[] = [];
  private scheduledTasks: ScheduledTask[] = [];
  private running = new Map<string, Promise<void>>();
  private cronTimer: ReturnType<typeof setInterval> | null = null;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private maxConcurrency = 5;
  private started = false;

  register(job: JobDefinition): void {
    this.jobs.set(job.id, job);

    if (job.schedule) {
      const nextRunAt = getNextCronTime(job.schedule);
      this.scheduledTasks.push({
        id: `sched_${job.id}`,
        jobId: job.id,
        cron: job.schedule,
        payload: {},
        enabled: true,
        nextRunAt,
      });
    }
  }

  unregister(jobId: string): void {
    this.jobs.delete(jobId);
    this.scheduledTasks = this.scheduledTasks.filter(t => t.jobId !== jobId);
  }

  async enqueue(jobId: string, payload: unknown, options?: { delay?: number; priority?: number }): Promise<string> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not registered`);

    const queuedJob: QueuedJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      jobId,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: (job.retries ?? 3) + 1,
      createdAt: new Date(),
      scheduledAt: options?.delay ? new Date(Date.now() + options.delay) : undefined,
    };

    this.queue.push(queuedJob);
    return queuedJob.id;
  }

  async enqueueBatch(jobId: string, payloads: unknown[]): Promise<string[]> {
    const ids: string[] = [];
    for (const payload of payloads) {
      ids.push(await this.enqueue(jobId, payload));
    }
    return ids;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.processTimer = setInterval(() => this.processQueue(), 1000);
    this.cronTimer = setInterval(() => this.checkScheduledTasks(), 60000);
    this.checkScheduledTasks();
  }

  stop(): void {
    this.started = false;
    if (this.processTimer) { clearInterval(this.processTimer); this.processTimer = null; }
    if (this.cronTimer) { clearInterval(this.cronTimer); this.cronTimer = null; }
  }

  getQueueStats(): { pending: number; running: number; completed: number; failed: number } {
    return {
      pending: this.queue.filter(j => j.status === 'pending').length,
      running: this.running.size,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
    };
  }

  getJob(queuedJobId: string): QueuedJob | undefined {
    return this.queue.find(j => j.id === queuedJobId);
  }

  getScheduledTasks(): ScheduledTask[] {
    return [...this.scheduledTasks];
  }

  getRegisteredJobs(): JobDefinition[] {
    return Array.from(this.jobs.values());
  }

  async drain(): Promise<void> {
    while (this.queue.some(j => j.status === 'pending' || j.status === 'retrying') || this.running.size > 0) {
      await new Promise(r => setTimeout(r, 100));
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.running.size >= this.maxConcurrency) return;

    const now = Date.now();
    const pending = this.queue.filter(j =>
      (j.status === 'pending' || j.status === 'retrying') &&
      (!j.scheduledAt || j.scheduledAt.getTime() <= now) &&
      (!j.nextRetryAt || j.nextRetryAt.getTime() <= now)
    );

    for (const queuedJob of pending) {
      if (this.running.size >= this.maxConcurrency) break;

      const jobDef = this.jobs.get(queuedJob.jobId);
      if (!jobDef) {
        queuedJob.status = 'failed';
        queuedJob.error = 'Job definition not found';
        continue;
      }

      const concurrency = jobDef.concurrency ?? this.maxConcurrency;
      const runningForJob = Array.from(this.running.keys()).filter(k => k.startsWith(queuedJob.jobId)).length;
      if (runningForJob >= concurrency) continue;

      this.executeJob(queuedJob, jobDef);
    }
  }

  private executeJob(queuedJob: QueuedJob, jobDef: JobDefinition): void {
    queuedJob.status = 'running';
    queuedJob.startedAt = new Date();
    queuedJob.attempts++;

    const runKey = `${queuedJob.jobId}_${queuedJob.id}`;
    const timeout = jobDef.timeout ?? 300000;

    const execution = Promise.race([
      jobDef.handler(queuedJob.payload),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Job timeout')), timeout)),
    ])
      .then(() => {
        queuedJob.status = 'completed';
        queuedJob.completedAt = new Date();
      })
      .catch((err: Error) => {
        queuedJob.error = err.message;
        if (queuedJob.attempts < queuedJob.maxAttempts) {
          queuedJob.status = 'retrying';
          const backoff = Math.min(30000, 1000 * Math.pow(2, queuedJob.attempts));
          queuedJob.nextRetryAt = new Date(Date.now() + backoff);
        } else {
          queuedJob.status = 'failed';
        }
      })
      .finally(() => {
        this.running.delete(runKey);
      });

    this.running.set(runKey, execution);
  }

  private checkScheduledTasks(): void {
    const now = new Date();
    for (const task of this.scheduledTasks) {
      if (!task.enabled) continue;
      if (!task.nextRunAt || task.nextRunAt.getTime() > now.getTime()) continue;

      this.enqueue(task.jobId, task.payload).catch(() => {});
      task.lastRunAt = now;
      task.nextRunAt = getNextCronTime(task.cron, now);
    }
  }
}

const globalKey = '__erp_job_scheduler__';

function getScheduler(): JobScheduler {
  const g = globalThis as unknown as Record<string, JobScheduler>;
  if (!g[globalKey]) {
    g[globalKey] = new JobScheduler();
  }
  return g[globalKey];
}

export const scheduler = getScheduler();

export function registerDefaultJobs(): void {
  scheduler.register({
    id: 'data-retention-cleanup',
    name: 'Data Retention Cleanup',
    schedule: '0 2 * * *',
    handler: async () => {
      const { getDataRetentionService } = await import('@/lib/compliance/data-retention');
      const service = getDataRetentionService();
      await service.applyRetention('default');
    },
    retries: 2,
    timeout: 600000,
  });

  scheduler.register({
    id: 'session-cleanup',
    name: 'Expired Session Cleanup',
    schedule: '*/15 * * * *',
    handler: async () => {
      const { sessionManager } = await import('@/lib/auth/session-manager');
      sessionManager.cleanupExpiredSessions();
    },
    retries: 1,
  });

  scheduler.register({
    id: 'compliance-check',
    name: 'Daily Compliance Check',
    schedule: '0 6 * * *',
    handler: async () => {
      const { getComplianceService } = await import('@/lib/compliance/compliance-service');
      const service = getComplianceService();
      await service.runAllChecks('default');
    },
    retries: 2,
    timeout: 300000,
  });

  scheduler.register({
    id: 'webhook-retry',
    name: 'Retry Failed Webhooks',
    schedule: '*/5 * * * *',
    handler: async () => {
      const { WebhookDeliveryService } = await import('@/lib/integrations/webhook-delivery');
      const service = new WebhookDeliveryService();
      const deadLetters = service.getDeadLetterQueue();
      for (const item of deadLetters.slice(0, 10)) {
        await service.retryFailed(item.webhookId);
      }
    },
    retries: 1,
  });

  scheduler.register({
    id: 'send-notification',
    name: 'Send Notification',
    handler: async (payload) => {
      const { notificationService } = await import('@/lib/notifications/notification-service');
      const p = payload as { tenantId: string; userId: string; channel: string; title: string; body: string };
      await notificationService.send({
        tenantId: p.tenantId,
        userId: p.userId,
        channel: p.channel as 'email' | 'in_app',
        priority: 'medium',
        title: p.title,
        body: p.body,
      });
    },
    retries: 3,
    concurrency: 10,
  });

  scheduler.register({
    id: 'generate-report',
    name: 'Generate Scheduled Report',
    handler: async (payload) => {
      const { reportBuilder } = await import('@/lib/platform/report-builder');
      const p = payload as { reportId: string };
      const report = reportBuilder.getReport(p.reportId);
      if (report) {
        await reportBuilder.executeReport(report);
      }
    },
    retries: 2,
    timeout: 120000,
  });
}
