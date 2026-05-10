import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  status: z.string().default('PLANNED'),
  auditor: z.string().optional(),
  auditee: z.string().optional(),
  department: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
}).passthrough();

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'audits',
  modelName: 'qAudit',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee', 'department'],
  defaultSort: { field: 'scheduledDate', direction: 'desc' },
  allowedIncludes: ['findings'],
  hooks: {
    beforeCreate: async (data) => {
      // Map lowercase type to Prisma enum
      const typeMap: Record<string, string> = {
        internal: 'INTERNAL', external: 'EXTERNAL',
        supplier: 'SUPPLIER', 'gmp-inspection': 'EXTERNAL',
      };
      if (data.type && typeMap[data.type]) {
        data.type = typeMap[data.type];
      }
      if (!data.type) data.type = 'INTERNAL';

      // Map lowercase status to Prisma enum
      const statusMap: Record<string, string> = {
        planned: 'PLANNED', 'in-progress': 'IN_PROGRESS',
        completed: 'COMPLETED', closed: 'CLOSED',
        cancelled: 'CLOSED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }

      // Map leadAuditor to auditor field
      if (data.leadAuditor && !data.auditor) {
        data.auditor = data.leadAuditor;
      }
      if (!data.auditor) data.auditor = 'System';
      if (!data.auditee) data.auditee = data.department ?? 'N/A';

      // Map scheduledDate
      if (data.scheduledDate) {
        data.scheduledDate = new Date(data.scheduledDate).toISOString();
      } else {
        data.scheduledDate = new Date().toISOString();
      }

      // Remove non-Prisma fields
      const { scope, leadAuditor, auditors, objectives, findings,
        ...prismaData } = data;
      return prismaData;
    },
  },
});
