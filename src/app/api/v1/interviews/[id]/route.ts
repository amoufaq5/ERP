import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  type: z.enum(['PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'FINAL', 'OTHER']),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']),
  scheduledAt: z.string(),
  duration: z.number().min(15),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  interviewerId: z.string().optional(),
  interviewerName: z.string().optional(),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  recommendation: z.enum(['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO']).optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'interviews',
  modelName: 'interview',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['candidate', 'application', 'job'],
});
