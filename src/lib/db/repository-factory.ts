import { PrismaClient } from '@prisma/client';
import { ProductRepository } from './repositories/product.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';

let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export function createRepositories(prisma?: PrismaClient) {
  const client = prisma || getPrisma();
  return {
    products: new ProductRepository(client),
    invoices: new InvoiceRepository(client),
    employees: new EmployeeRepository(client),
    purchaseOrders: new PurchaseOrderRepository(client),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
