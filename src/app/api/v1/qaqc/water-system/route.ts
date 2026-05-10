import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  system: z.string().optional(),
  point: z.string().min(1),
  parameter: z.string().optional(),
  value: z.number(),
  unit: z.string().min(1),
  limit: z.number(),
  status: z.string().default('PASS'),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'water-system',
  modelName: 'waterSystemReading',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['point', 'equipment', 'recordedBy'],
  defaultSort: { field: 'readingDate', direction: 'desc' },
  hooks: {
    beforeCreate: async (data) => {
      // Map system to Prisma enum
      const sysMap: Record<string, string> = {
        purified: 'PURIFIED_WATER', 'purified-water': 'PURIFIED_WATER',
        purified_water: 'PURIFIED_WATER',
        wfi: 'WFI', 'clean-steam': 'CLEAN_STEAM', clean_steam: 'CLEAN_STEAM',
      };
      if (data.system && sysMap[data.system.toLowerCase()]) {
        data.system = sysMap[data.system.toLowerCase()];
      }
      if (!data.system) data.system = 'PURIFIED_WATER';

      // Map parameter to Prisma enum
      const paramMap: Record<string, string> = {
        toc: 'TOC', conductivity: 'CONDUCTIVITY', ph: 'PH',
        endotoxin: 'ENDOTOXIN', microbial: 'MICROBIAL',
      };
      if (data.parameter && paramMap[data.parameter.toLowerCase()]) {
        data.parameter = paramMap[data.parameter.toLowerCase()];
      }
      if (!data.parameter) data.parameter = 'TOC';

      // Map status to Prisma enum
      const statusMap: Record<string, string> = {
        pass: 'PASS', fail: 'FAIL', alert: 'ALERT',
        normal: 'PASS', action: 'FAIL', shutdown: 'FAIL',
      };
      if (data.status && statusMap[data.status.toLowerCase()]) {
        data.status = statusMap[data.status.toLowerCase()];
      }

      // Handle readingDate
      if (data.readingDate) {
        data.readingDate = new Date(data.readingDate).toISOString();
      } else if (data.timestamp) {
        data.readingDate = new Date(data.timestamp).toISOString();
      } else {
        data.readingDate = new Date().toISOString();
      }

      // Remove non-Prisma fields
      const { pointId, samplingPointId, timestamp, result, systemId, ...prismaData } = data;
      return prismaData;
    },
  },
});
