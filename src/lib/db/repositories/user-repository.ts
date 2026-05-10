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
  protected modelName = 'user'

  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  /**
   * Find a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return this.model.findUnique({ where: { email } })
    } catch (error) {
      throw new Error(`Failed to find user by email: ${(error as Error).message}`)
    }
  }

  /**
   * Find all users matching a specific role.
   */
  async findByRole(
    role: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    try {
      const where: Prisma.UserWhereInput = { role }
      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { name: 'asc' },
        }),
        this.model.count({ where }),
      ])

      return {
        data,
        total,
        page: pag.page,
        pageSize: pag.pageSize,
        totalPages: Math.ceil(total / pag.pageSize),
      }
    } catch (error) {
      throw new Error(`Failed to find users by role: ${(error as Error).message}`)
    }
  }

  /**
   * Get users who report to a given manager (via business unit membership).
   * In the pharma hierarchy: BUM -> Marketeer -> DM -> MedRep
   */
  async getReportsOf(managerId: string): Promise<User[]> {
    try {
      return this.prisma.user.findMany({
        where: {
          buMemberships: {
            some: {
              businessUnit: { managerId },
            },
          },
        },
        include: { buMemberships: true },
      })
    } catch (error) {
      throw new Error(`Failed to get reports of manager: ${(error as Error).message}`)
    }
  }

  /**
   * Search users by name or email with filters.
   */
  async search(
    filters: UserFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<User>> {
    try {
      const where: Prisma.UserWhereInput = {}
      if (filters.role) where.role = filters.role
      if (filters.department) where.department = filters.department
      if (filters.isActive !== undefined) where.isActive = filters.isActive
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize
      const orderBy = sort ? { [sort.field]: sort.direction } : { name: 'asc' as const }

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy,
        }),
        this.model.count({ where }),
      ])

      return {
        data,
        total,
        page: pag.page,
        pageSize: pag.pageSize,
        totalPages: Math.ceil(total / pag.pageSize),
      }
    } catch (error) {
      throw new Error(`Failed to search users: ${(error as Error).message}`)
    }
  }

  /**
   * Find active users in a specific department.
   */
  async findByDepartment(department: string): Promise<User[]> {
    try {
      return this.model.findMany({
        where: { department, isActive: true },
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      throw new Error(`Failed to find users by department: ${(error as Error).message}`)
    }
  }
}
