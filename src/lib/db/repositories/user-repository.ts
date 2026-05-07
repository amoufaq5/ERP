// @ts-nocheck
import type { PrismaClient, User, Prisma } from '@prisma/client'
import { BaseRepository, type PaginatedResult, type PaginationParams, type SortParams } from './base'

export interface UserFilters {
  role?: string
  department?: string
  isActive?: boolean
  search?: string // search by name or email
}

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  protected get model() {
    return this.prisma.user
  }

  /**
   * Find a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    // TODO: implement when DB is available
    // return this.model.findUnique({ where: { email } })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find all users matching a specific role.
   */
  async findByRole(
    role: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    // TODO: implement when DB is available
    // const where = { role }
    // const total = await this.model.count({ where })
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pagination ?? { page: 1, pageSize: 50 }),
    //   orderBy: { name: 'asc' },
    // })
    // return this.toPaginatedResult(data, total, pagination ?? { page: 1, pageSize: 50 })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Get users who report to a given manager (via business unit membership).
   * In the pharma hierarchy: BUM -> Marketeer -> DM -> MedRep
   */
  async getReportsOf(managerId: string): Promise<User[]> {
    // TODO: implement when DB is available
    // Strategy: find BUs where this user is manager, then return members
    // Also consider the district manager -> medical rep hierarchy
    // return this.prisma.user.findMany({
    //   where: {
    //     buMemberships: {
    //       some: {
    //         businessUnit: { managerId },
    //       },
    //     },
    //   },
    //   include: { buMemberships: true },
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Search users by name or email with filters.
   */
  async search(
    filters: UserFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<User>> {
    // TODO: implement when DB is available
    // const where: Prisma.UserWhereInput = {}
    // if (filters.role) where.role = filters.role
    // if (filters.department) where.department = filters.department
    // if (filters.isActive !== undefined) where.isActive = filters.isActive
    // if (filters.search) {
    //   where.OR = [
    //     { name: { contains: filters.search, mode: 'insensitive' } },
    //     { email: { contains: filters.search, mode: 'insensitive' } },
    //   ]
    // }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: this.buildSort(sort) ?? { name: 'asc' },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find active users in a specific department.
   */
  async findByDepartment(department: string): Promise<User[]> {
    // TODO: implement when DB is available
    // return this.model.findMany({
    //   where: { department, isActive: true },
    //   orderBy: { name: 'asc' },
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }
}
