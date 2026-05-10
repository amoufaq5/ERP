import { PrismaClient, Product } from '@prisma/client';
import { BaseRepository } from './base';

type ProductCreateInput = Omit<Product, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type ProductUpdateInput = Partial<ProductCreateInput>;

export class ProductRepository extends BaseRepository<Product, ProductCreateInput, ProductUpdateInput> {
  protected modelName = 'product';

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByCategory(tenantId: string, category: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'category', operator: 'eq', value: category }],
    });
  }

  async findByStatus(tenantId: string, status: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'status', operator: 'eq', value: status }],
    });
  }

  async searchByName(tenantId: string, query: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'name', operator: 'contains', value: query }],
    });
  }
}
