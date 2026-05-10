import { PrismaClient, Employee } from '@prisma/client';
import { BaseRepository } from './base';

type EmployeeCreateInput = Omit<Employee, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
type EmployeeUpdateInput = Partial<EmployeeCreateInput>;

export class EmployeeRepository extends BaseRepository<Employee, EmployeeCreateInput, EmployeeUpdateInput> {
  protected modelName = 'employee';

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByDepartment(tenantId: string, department: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'department', operator: 'eq', value: department }],
    });
  }

  async findActive(tenantId: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
    });
  }

  async findByManager(tenantId: string, managerId: string) {
    return this.findAll(tenantId, {
      filters: [{ field: 'managerId', operator: 'eq', value: managerId }],
    });
  }
}
