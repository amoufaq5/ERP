import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  system: z.string().optional(),
  point: z.string().optional(),
  parameter: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  limit: z.number().optional(),
  status: z.string().optional(),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'water-system',
  modelName: 'waterSystemReading',
  validationSchema: { update: updateSchema },
  searchFields: ['point', 'equipment'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map system
      const sysMap: Record<string, string> = {
        purified: 'PURIFIED_WATER', 'purified-water': 'PURIFIED_WATER',
        purified_water: 'PURIFIED_WATER',
        wfi: 'WFI', 'clean-steam': 'CLEAN_STEAM', clean_steam: 'CLEAN_STEAM',
      };
      if (data.system && sysMap[data.system.toLowerCase()]) {
        data.system = sysMap[data.system.toLowerCase()];
      }

      // Map parameter
      const paramMap: Record<string, string> = {
        toc: 'TOC', conductivity: 'CONDUCTIVITY', ph: 'PH',
        endotoxin: 'ENDOTOXIN', microbial: 'MICROBIAL',
      };
      if (data.parameter && paramMap[data.parameter.toLowerCase()]) {
        data.parameter = paramMap[data.parameter.toLowerCase()];
      }

      // Map status
      const statusMap: Record<string, string> = {
        pass: 'PASS', fail: 'FAIL', alert: 'ALERT',
        normal: 'PASS', action: 'FAIL', shutdown: 'FAIL',
      };
      if (data.status && statusMap[data.status.toLowerCase()]) {
        data.status = statusMap[data.status.toLowerCase()];
      }

      // Remove non-Prisma fields
      const { pointId, samplingPointId, timestamp, result, systemId, ...prismaData } = data;
      return prismaData;
    },
  },
});
