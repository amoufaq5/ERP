import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  auditor: z.string().optional(),
  auditee: z.string().optional(),
  department: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'audits',
  modelName: 'qAudit',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee'],
  allowedIncludes: ['findings'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map type
      const typeMap: Record<string, string> = {
        internal: 'INTERNAL', external: 'EXTERNAL',
        supplier: 'SUPPLIER', 'gmp-inspection': 'EXTERNAL',
      };
      if (data.type && typeMap[data.type]) {
        data.type = typeMap[data.type];
      }

      // Map status
      const statusMap: Record<string, string> = {
        planned: 'PLANNED', 'in-progress': 'IN_PROGRESS',
        completed: 'COMPLETED', closed: 'CLOSED',
        cancelled: 'CLOSED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }

      if (data.leadAuditor && !data.auditor) {
        data.auditor = data.leadAuditor;
      }

      // Remove non-Prisma fields
      const { scope, leadAuditor, auditors, objectives, findings,
        ...prismaData } = data;
      return prismaData;
    },
  },
});
