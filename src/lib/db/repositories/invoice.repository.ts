import { PrismaClient, Invoice } from '@prisma/client';
import { BaseRepository } from './base';

type InvoiceCreateInput = Omit<Invoice, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type InvoiceUpdateInput = Partial<InvoiceCreateInput>;

export class InvoiceRepository extends BaseRepository<Invoice, InvoiceCreateInput, InvoiceUpdateInput> {
  protected modelName = 'invoice';

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findOverdue(tenantId: string) {
    return this.model.findMany({
      where: {
        tenantId,
        status: 'SENT',
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findByCustomer(tenantId: string, customerId: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    });
  }

  async getTotalsByStatus(tenantId: string) {
    return this.model.groupBy({
      by: ['status'],
      where: { tenantId },
      _sum: { totalAmount: true },
      _count: true,
    });
  }
}
