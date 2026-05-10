import { PrismaClient } from '@prisma/client';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: unknown;
}

export interface QueryOptions {
  pagination?: PaginationParams;
  sort?: SortParams[];
  filters?: FilterParams[];
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}

export abstract class BaseRepository<T, CreateInput = unknown, UpdateInput = unknown> {
  protected prisma: PrismaClient;
  protected abstract modelName: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  protected buildWhereClause(tenantId: string, filters?: FilterParams[]): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId };

    if (!filters || filters.length === 0) return where;

    for (const filter of filters) {
      switch (filter.operator) {
        case 'eq':
          where[filter.field] = filter.value;
          break;
        case 'neq':
          where[filter.field] = { not: filter.value };
          break;
        case 'gt':
          where[filter.field] = { gt: filter.value };
          break;
        case 'gte':
          where[filter.field] = { gte: filter.value };
          break;
        case 'lt':
          where[filter.field] = { lt: filter.value };
          break;
        case 'lte':
          where[filter.field] = { lte: filter.value };
          break;
        case 'contains':
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
          break;
        case 'startsWith':
          where[filter.field] = { startsWith: filter.value, mode: 'insensitive' };
          break;
        case 'endsWith':
          where[filter.field] = { endsWith: filter.value, mode: 'insensitive' };
          break;
        case 'in':
          where[filter.field] = { in: filter.value };
          break;
        case 'notIn':
          where[filter.field] = { notIn: filter.value };
          break;
      }
    }

    return where;
  }

  protected buildOrderBy(sort?: SortParams[]): Record<string, string>[] | undefined {
    if (!sort || sort.length === 0) return undefined;
    return sort.map(s => ({ [s.field]: s.direction }));
  }

  async findById(tenantId: string, id: string, options?: { include?: Record<string, boolean | object> }): Promise<T | null> {
    return this.model.findFirst({
      where: { id, tenantId },
      ...(options?.include && { include: options.include }),
    });
  }

  async findMany(tenantId: string, options?: QueryOptions): Promise<PaginatedResult<T>> {
    const where = this.buildWhereClause(tenantId, options?.filters);
    const orderBy = this.buildOrderBy(options?.sort);

    const page = options?.pagination?.page || 1;
    const pageSize = options?.pagination?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        ...(orderBy && { orderBy }),
        skip,
        take: pageSize,
        ...(options?.include && { include: options.include }),
        ...(options?.select && { select: options.select }),
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findAll(tenantId: string, options?: { filters?: FilterParams[]; sort?: SortParams[]; include?: Record<string, boolean | object> }): Promise<T[]> {
    const where = this.buildWhereClause(tenantId, options?.filters);
    const orderBy = this.buildOrderBy(options?.sort);

    return this.model.findMany({
      where,
      ...(orderBy && { orderBy }),
      ...(options?.include && { include: options.include }),
    });
  }

  async create(tenantId: string, data: CreateInput): Promise<T> {
    return this.model.create({
      data: { ...data, tenantId },
    });
  }

  async createMany(tenantId: string, data: CreateInput[]): Promise<{ count: number }> {
    return this.model.createMany({
      data: data.map(item => ({ ...item, tenantId })),
    });
  }

  async update(tenantId: string, id: string, data: UpdateInput): Promise<T> {
    // Verify record belongs to tenant before updating
    const existing = await this.model.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(tenantId: string, id: string): Promise<T> {
    // Verify record belongs to tenant before deleting
    const existing = await this.model.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }
    return this.model.delete({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<T> {
    const existing = await this.model.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(tenantId: string, filters?: FilterParams[]): Promise<number> {
    const where = this.buildWhereClause(tenantId, filters);
    return this.model.count({ where });
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id, tenantId } });
    return count > 0;
  }

  async aggregate(tenantId: string, options: {
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _count?: Record<string, boolean> | boolean;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
    filters?: FilterParams[];
  }) {
    const where = this.buildWhereClause(tenantId, options.filters);
    return this.model.aggregate({
      where,
      ...(options._sum && { _sum: options._sum }),
      ...(options._avg && { _avg: options._avg }),
      ...(options._count && { _count: options._count }),
      ...(options._min && { _min: options._min }),
      ...(options._max && { _max: options._max }),
    });
  }
}
