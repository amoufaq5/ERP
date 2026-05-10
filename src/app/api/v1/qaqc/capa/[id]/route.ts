import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  effectivenessCheck: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number'],
  allowedIncludes: ['actions', 'findings'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map lowercase type to Prisma enum
      const typeMap: Record<string, string> = {
        corrective: 'CORRECTIVE', preventive: 'PREVENTIVE',
        both: 'CORRECTIVE',
      };
      if (data.type && typeMap[data.type]) {
        data.type = typeMap[data.type];
      }

      // Map lowercase priority to Prisma enum
      const prioMap: Record<string, string> = {
        low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
      };
      if (data.priority && prioMap[data.priority]) {
        data.priority = prioMap[data.priority];
      }

      // Map frontend status to Prisma enum
      const statusMap: Record<string, string> = {
        initiated: 'OPEN', investigation: 'INVESTIGATION',
        'action-plan': 'ACTION_PLAN', implementation: 'IMPLEMENTATION',
        verification: 'VERIFICATION', 'effectiveness-check': 'VERIFICATION',
        closed: 'CLOSED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }

      // Handle dueDate conversion
      if (data.dueDate) {
        data.dueDate = new Date(data.dueDate).toISOString();
      }

      // Remove non-Prisma fields
      const { initiatedBy, initiatedAt, department, actions,
        effectivenessChecks, sourceRecordId, sourceRecordNumber,
        ...prismaData } = data;
      return prismaData;
    },
  },
});
