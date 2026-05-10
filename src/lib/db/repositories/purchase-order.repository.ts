import { PrismaClient, PurchaseOrder } from '@prisma/client';
import { BaseRepository } from './base';

type POCreateInput = Omit<PurchaseOrder, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type POUpdateInput = Partial<POCreateInput>;

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrder, POCreateInput, POUpdateInput> {
  protected modelName = 'purchaseOrder';

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findPendingApproval(tenantId: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'status', operator: 'eq', value: 'PENDING_APPROVAL' }],
      sort: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async findBySupplier(tenantId: string, supplierId: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
    });
  }

  async getSpendBySupplier(tenantId: string) {
    return this.model.groupBy({
      by: ['supplierId'],
      where: { tenantId, status: { in: ['APPROVED', 'RECEIVED'] } },
      _sum: { totalAmount: true },
      _count: true,
    });
  }
}
