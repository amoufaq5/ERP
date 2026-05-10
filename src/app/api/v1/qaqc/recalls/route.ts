import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  status: z.string().default('INITIATED'),
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
}).passthrough();

const updateSchema = createSchema.partial();

let seq = 1;

export const { GET, POST } = createRouteHandlers({
  entity: 'recalls',
  modelName: 'recall',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'product', 'batchNumbers', 'reason'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate number and title
      if (!data.number) {
        const year = new Date().getFullYear();
        data.number = `RCL-${year}-${String(seq++).padStart(3, '0')}`;
      }
      if (!data.title) {
        data.title = `Recall: ${data.product ?? data.number}`;
      }

      // Map recallClass to type
      const typeMap: Record<string, string> = {
        I: 'CLASS_I', II: 'CLASS_II', III: 'CLASS_III',
        'class-i': 'CLASS_I', 'class-ii': 'CLASS_II', 'class-iii': 'CLASS_III',
      };
      const rawType = data.type || data.recallClass;
      if (rawType && typeMap[rawType]) {
        data.type = typeMap[rawType];
      }
      if (!data.type) data.type = 'CLASS_II';

      // Map status
      const statusMap: Record<string, string> = {
        initiated: 'INITIATED', 'risk-assessment': 'IN_PROGRESS',
        notification: 'IN_PROGRESS', retrieval: 'IN_PROGRESS',
        reconciliation: 'IN_PROGRESS', 'effectiveness-check': 'IN_PROGRESS',
        closed: 'CLOSED', completed: 'COMPLETED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }

      // Map initiatedAt to initiatedDate
      if (data.initiatedAt && !data.initiatedDate) {
        data.initiatedDate = data.initiatedAt;
      }

      // Map affectedBatches to batchNumbers
      if (data.affectedBatches && !data.batchNumbers) {
        if (Array.isArray(data.affectedBatches)) {
          data.batchNumbers = data.affectedBatches.map((b: any) => b.batchNumber ?? b).join(', ');
        }
      }

      // Remove non-Prisma fields
      const { recallClass, priority, department, riskAssessment,
        notifications, retrievals, effectivenessChecks,
        affectedBatches, initiatedAt, description, ...prismaData } = data;

      // Map description to reason if reason not set
      if (description && !prismaData.reason) {
        prismaData.reason = description;
      }

      return prismaData;
    },
  },
});
