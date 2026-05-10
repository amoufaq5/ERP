import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  applicationId: z.string(),
  candidateId: z.string(),
  jobId: z.string(),
  type: z.enum(['PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'FINAL', 'OTHER']).default('PHONE_SCREEN'),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).default('SCHEDULED'),
  scheduledAt: z.string(),
  duration: z.number().min(15).default(60),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  interviewerId: z.string().optional(),
  interviewerName: z.string().optional(),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  recommendation: z.enum(['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO']).optional(),
  notes: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'interviews',
  modelName: 'interview',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['interviewerName', 'feedback'],
  defaultSort: { field: 'scheduledAt', direction: 'desc' },
  allowedIncludes: ['candidate', 'application', 'job'],
});
