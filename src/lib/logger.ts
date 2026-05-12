// Structured logger for the ERP service.
// Provides JSON-line output, level filtering, PII redaction, child loggers,
// and per-request scoping via `withRequest(requestId, tenantId, userId)`.
//
// Satisfies the ADR-0009 §Layer 5 requirement for structured logs and the
// ADR-0017 §Instrumentation requirement for per-tenant scoping and PHI
// redaction. We do not depend on `pino`; this hand-rolled logger is small
// enough to maintain and avoids the JSON-serialization-quirk debt that
// off-the-shelf alternatives bring at our scale.
//
// Sentry and OpenTelemetry handle error capture + tracing independently
// (see `sentry.server.config.ts` and `instrumentation.ts`).

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  service: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  duration?: number;
  error?: { message: string; stack?: string; code?: string };
  [key: string]: unknown;
}

interface LoggerConfig {
  level: LogLevel;
  service: string;
  pretty?: boolean;
  redactPaths?: string[];
}

const PII_PATTERNS = [
  /password/i, /secret/i, /token/i, /apikey/i, /api_key/i,
  /authorization/i, /credit.?card/i, /ssn/i, /social.?security/i,
];

const REDACT_REPLACEMENT = '[REDACTED]';

class Logger {
  private config: LoggerConfig;
  private contextData: Record<string, unknown> = {};

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  child(bindings: Record<string, unknown>): Logger {
    const child = new Logger(this.config);
    child.contextData = { ...this.contextData, ...bindings };
    return child;
  }

  trace(msg: string, data?: Record<string, unknown>): void { this.log('trace', msg, data); }
  debug(msg: string, data?: Record<string, unknown>): void { this.log('debug', msg, data); }
  info(msg: string, data?: Record<string, unknown>): void { this.log('info', msg, data); }
  warn(msg: string, data?: Record<string, unknown>): void { this.log('warn', msg, data); }
  error(msg: string, data?: Record<string, unknown>): void { this.log('error', msg, data); }
  fatal(msg: string, data?: Record<string, unknown>): void { this.log('fatal', msg, data); }

  withRequest(requestId: string, tenantId?: string, userId?: string): Logger {
    return this.child({ requestId, tenantId, userId });
  }

  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { duration, label });
    };
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) return;

    const entry: LogEntry = {
      level,
      msg,
      timestamp: new Date().toISOString(),
      service: this.config.service,
      ...this.contextData,
      ...data,
    };

    if (data?.error instanceof Error) {
      entry.error = {
        message: data.error.message,
        stack: data.error.stack,
        code: (data.error as { code?: string }).code,
      };
      delete entry.error;
      entry.error = {
        message: (data.error as Error).message,
        stack: (data.error as Error).stack,
        code: (data.error as { code?: string }).code,
      };
    }

    const sanitized = this.redact(entry);

    if (this.config.pretty) {
      this.prettyPrint(sanitized);
    } else {
      const output = JSON.stringify(sanitized);
      if (LOG_LEVELS[level] >= LOG_LEVELS['error']) {
        process.stderr.write(output + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    }
  }

  private redact(entry: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (PII_PATTERNS.some(p => p.test(key))) {
        result[key] = REDACT_REPLACEMENT;
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = this.redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private prettyPrint(entry: Record<string, unknown>): void {
    const level = entry.level as string;
    const colors: Record<string, string> = {
      trace: '\x1b[90m', debug: '\x1b[36m', info: '\x1b[32m',
      warn: '\x1b[33m', error: '\x1b[31m', fatal: '\x1b[35m',
    };
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    const time = (entry.timestamp as string).split('T')[1]?.replace('Z', '') || '';
    const msg = entry.msg;
    const extra = { ...entry };
    delete extra.level; delete extra.msg; delete extra.timestamp; delete extra.service;

    const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
    process.stdout.write(`${color}[${time}] ${level.toUpperCase().padEnd(5)}${reset} ${msg}${extraStr}\n`);
  }
}

const globalLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const isPretty = process.env.NODE_ENV !== 'production';

export const logger = new Logger({
  level: globalLevel,
  service: 'erp-platform',
  pretty: isPretty,
});

export function createLogger(service: string): Logger {
  return new Logger({ level: globalLevel, service, pretty: isPretty });
}
