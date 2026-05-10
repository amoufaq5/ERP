import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  type: z.string().optional(),
  status: z.string().default('OPEN'),
  priority: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
}).passthrough();

const updateSchema = createSchema.partial();

let seq = 1;

export const { GET, POST } = createRouteHandlers({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'source'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['actions', 'findings'],
  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate number if not provided
      if (!data.number) {
        const year = new Date().getFullYear();
        data.number = `CAPA-${year}-${String(seq++).padStart(3, '0')}`;
      }
      // Map lowercase type to Prisma enum
      const typeMap: Record<string, string> = {
        corrective: 'CORRECTIVE', preventive: 'PREVENTIVE',
        both: 'CORRECTIVE', // no 'both' in Prisma enum
      };
      if (data.type && typeMap[data.type]) {
        data.type = typeMap[data.type];
      }
      if (!data.type) data.type = 'CORRECTIVE';

      // Map lowercase priority to Prisma enum
      const prioMap: Record<string, string> = {
        low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
      };
      if (data.priority && prioMap[data.priority]) {
        data.priority = prioMap[data.priority];
      }
      if (!data.priority) data.priority = 'MEDIUM';

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

      // Remove fields not in Prisma CAPA model
      const { initiatedBy, initiatedAt, department, actions,
        effectivenessChecks, sourceRecordId, sourceRecordNumber,
        ...prismaData } = data;
      return prismaData;
    },
  },
});
