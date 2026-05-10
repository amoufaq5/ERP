import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  product: z.string().optional(),
  batchNumbers: z.string().optional(),
  reason: z.string().optional(),
  affectedQuantity: z.number().optional(),
  distributionScope: z.string().optional(),
  healthHazard: z.string().optional(),
  strategy: z.string().optional(),
  effectiveness: z.string().optional(),
  initiatedBy: z.string().optional(),
  initiatedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'recalls',
  modelName: 'recall',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'product'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map status from frontend format
      const statusMap: Record<string, string> = {
        initiated: 'INITIATED', 'risk-assessment': 'IN_PROGRESS',
        notification: 'IN_PROGRESS', retrieval: 'IN_PROGRESS',
        reconciliation: 'IN_PROGRESS', 'effectiveness-check': 'IN_PROGRESS',
        closed: 'CLOSED', completed: 'COMPLETED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }

      // Remove non-Prisma fields
      const { recallClass, priority, department, riskAssessment,
        notifications, retrievals, effectivenessChecks,
        affectedBatches, initiatedAt, description, ...prismaData } = data;

      return prismaData;
    },
  },
});
