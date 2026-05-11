import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional integrations
  REDIS_URL: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.warn(`⚠️ Environment validation warnings:\n${errorMessages}`);
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-minimum-32-characters-long!!',
    });
  }

  return parsed.data;
}

export const env = validateEnv();
