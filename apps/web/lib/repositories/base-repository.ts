/**
 * Base Repository Pattern for Drizzle ORM
 * 
 * This file provides the base repository interface and implementation for type-safe
 * database operations with Drizzle ORM. It includes generic CRUD operations,
 * query builders, filters, transaction support, and error handling.
 */

import { eq, and, or, like, ilike, gte, lte, gt, lt, ne, isNull, isNotNull, inArray, notInArray, desc, asc, sql, SQL } from 'drizzle-orm'
import { PgTable, PgColumn } from 'drizzle-orm/pg-core'
import { DrizzleDatabase } from '@/lib/db/connection'
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

/**
 * Base filter operators for type-safe querying
 */
export type FilterOperator = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'like' | 'ilike' | 'in' | 'notIn' 
  | 'isNull' | 'isNotNull'

/**
 * Filter condition for building WHERE clauses
 */
export interface FilterCondition<T = any> {
  field: string
  operator: FilterOperator
  value?: T | T[]
}

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = 'and' | 'or'

/**
 * Complex filter with logical operators
 */
export interface ComplexFilter {
  operator: LogicalOperator
  conditions: (FilterCondition | ComplexFilter)[]
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  limit: number
  offset: number
}

/**
 * Query options for repository operations
 */
export interface QueryOptions {
  filters?: (FilterCondition | ComplexFilter)[]
  sort?: SortConfig[]
  pagination?: PaginationConfig
  select?: string[]
  include?: string[]
}

/**
 * Repository result with pagination metadata
 */
export interface RepositoryResult<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * Transaction context for repository operations
 */
export interface TransactionContext {
  db: DrizzleDatabase
  rollback: () => void
}

/**
 * Base repository interface defining standard CRUD operations
 */
export interface BaseRepositoryInterface<TEntity, TInsert, TUpdate> {
  // Basic CRUD operations
  findById(id: string): Promise<TEntity | null>
  findMany(options?: QueryOptions): Promise<RepositoryResult<TEntity>>
  findOne(filters: FilterCondition[]): Promise<TEntity | null>
  create(data: TInsert): Promise<TEntity>
  createMany(data: TInsert[]): Promise<TEntity[]>
  update(id: string, data: TUpdate): Promise<TEntity>
  updateMany(filters: FilterCondition[], data: TUpdate): Promise<TEntity[]>
  delete(id: string): Promise<void>
  deleteMany(filters: FilterCondition[]): Promise<number>
  
  // Utility operations
  exists(id: string): Promise<boolean>
  count(filters?: FilterCondition[]): Promise<number>
  
  // Transaction support
  withTransaction<R>(callback: (ctx: TransactionContext) => Promise<R>): Promise<R>
}

/**
 * Abstract base repository implementation
 */
export abstract class BaseRepository<TEntity, TInsert, TUpdate> implements BaseRepositoryInterface<TEntity, TInsert, TUpdate> {
  protected abstract table: PgTable
  protected abstract insertSchema: z.ZodSchema<TInsert>
  protected abstract updateSchema: z.ZodSchema<TUpdate>
  
  constructor(protected db: DrizzleDatabase) {}

  /**
   * Build WHERE clause from filter conditions
   */
  protected buildWhereClause(filters: (FilterCondition | ComplexFilter)[]): SQL | undefined {
    if (!filters.length) return undefined

    const conditions = filters.map(filter => this.buildCondition(filter))
    return conditions.length === 1 ? conditions[0] : and(...conditions)
  }

  /**
   * Build individual condition from filter
   */
  protected buildCondition(filter: FilterCondition | ComplexFilter): SQL {
    if ('operator' in filter && (filter.operator === 'and' || filter.operator === 'or')) {
      // Handle complex filter
      const complexFilter = filter as ComplexFilter
      const conditions = complexFilter.conditions.map(condition => this.buildCondition(condition))
      
      return complexFilter.operator === 'and' 
        ? and(...conditions)! 
        : or(...conditions)!
    }

    // Handle simple filter condition
    const condition = filter as FilterCondition
    const column = this.getColumn(condition.field)
    
    switch (condition.operator) {
      case 'eq':
        return eq(column, condition.value)
      case 'ne':
        return ne(column, condition.value)
      case 'gt':
        return gt(column, condition.value)
      case 'gte':
        return gte(column, condition.value)
      case 'lt':
        return lt(column, condition.value)
      case 'lte':
        return lte(column, condition.value)
      case 'like':
        return like(column, condition.value)
      case 'ilike':
        return ilike(column, condition.value)
      case 'in':
        return inArray(column, condition.value as any[])
      case 'notIn':
        return notInArray(column, condition.value as any[])
      case 'isNull':
        return isNull(column)
      case 'isNotNull':
        return isNotNull(column)
      default:
        throw new ValidationError('VALIDATION_ERROR', `Unsupported filter operator: ${condition.operator}`)
    }
  }

  /**
   * Get column reference from field name
   */
  protected getColumn(fieldName: string): PgColumn {
    const column = (this.table as any)[fieldName]
    if (!column) {
      throw new ValidationError('VALIDATION_ERROR', `Invalid field name: ${fieldName}`)
    }
    return column
  }

  /**
   * Build ORDER BY clause from sort configuration
   */
  protected buildOrderByClause(sort: SortConfig[]): SQL[] {
    return sort.map(sortConfig => {
      const column = this.getColumn(sortConfig.field)
      return sortConfig.direction === 'desc' ? desc(column) : asc(column)
    })
  }

  /**
   * Validate insert data using schema
   */
  protected validateInsertData(data: unknown): TInsert {
    try {
      return this.insertSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('VALIDATION_ERROR', 'Invalid insert data', {
          fieldErrors: error.errors.reduce((acc, err) => {
            const field = err.path.join('.')
            if (!acc[field]) acc[field] = []
            acc[field].push(err.message)
            return acc
          }, {} as Record<string, string[]>)
        })
      }
      throw error
    }
  }

  /**
   * Validate update data using schema
   */
  protected validateUpdateData(data: unknown): TUpdate {
    try {
      return this.updateSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('VALIDATION_ERROR', 'Invalid update data', {
          fieldErrors: error.errors.reduce((acc, err) => {
            const field = err.path.join('.')
            if (!acc[field]) acc[field] = []
            acc[field].push(err.message)
            return acc
          }, {} as Record<string, string[]>)
        })
      }
      throw error
    }
  }

  /**
   * Handle database errors and convert to appropriate error types
   */
  protected handleDatabaseError(error: unknown, operation: string): never {
    console.error(`Database error in ${operation}:`, error)
    
    if (error instanceof Error) {
      // Handle specific PostgreSQL error codes
      const pgError = error as any
      
      switch (pgError.code) {
        case '23505': // Unique violation
          throw new ValidationError('VALIDATION_ERROR', 'Duplicate entry', { operation, originalError: error.message })
        case '23503': // Foreign key violation
          throw new ValidationError('VALIDATION_ERROR', 'Referenced record not found', { operation, originalError: error.message })
        case '23502': // Not null violation
          throw new ValidationError('VALIDATION_ERROR', 'Required field missing', { operation, originalError: error.message })
        case '23514': // Check constraint violation
          throw new ValidationError('VALIDATION_ERROR', 'Data constraint violation', { operation, originalError: error.message })
        default:
          throw new DatabaseError('Database operation failed', operation, { originalError: error.message })
      }
    }
    
    throw new DatabaseError('Unknown database error', operation)
  }

  // Implementation of BaseRepositoryInterface methods

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<TEntity | null> {
    try {
      const result = await this.db
        .select()
        .from(this.table)
        .where(eq(this.getColumn('id'), id))
        .limit(1)

      return result[0] as TEntity || null
    } catch (error) {
      this.handleDatabaseError(error, 'findById')
    }
  }

  /**
   * Find multiple entities with options
   */
  async findMany(options: QueryOptions = {}): Promise<RepositoryResult<TEntity>> {
    try {
      const { filters = [], sort = [], pagination } = options

      let query = this.db.select().from(this.table)

      // Apply filters
      if (filters.length > 0) {
        const whereClause = this.buildWhereClause(filters)
        if (whereClause) {
          query = query.where(whereClause) as any
        }
      }

      // Apply sorting
      if (sort.length > 0) {
        const orderBy = this.buildOrderByClause(sort)
        query = query.orderBy(...orderBy) as any
      }

      // Apply pagination
      if (pagination) {
        query = query.limit(pagination.limit).offset(pagination.offset) as any
      }

      const data = await query as TEntity[]

      // Get total count for pagination
      let total = data.length
      if (pagination) {
        const countQuery = this.db
          .select({ count: sql<number>`count(*)` })
          .from(this.table)

        if (filters.length > 0) {
          const whereClause = this.buildWhereClause(filters)
          if (whereClause) {
            countQuery.where(whereClause)
          }
        }

        const countResult = await countQuery
        total = countResult[0]?.count || 0
      }

      return {
        data,
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findMany')
    }
  }

  /**
   * Find single entity by filters
   */
  async findOne(filters: FilterCondition[]): Promise<TEntity | null> {
    try {
      const whereClause = this.buildWhereClause(filters)
      
      const result = await this.db
        .select()
        .from(this.table)
        .where(whereClause)
        .limit(1)

      return result[0] as TEntity || null
    } catch (error) {
      this.handleDatabaseError(error, 'findOne')
    }
  }

  /**
   * Create new entity
   */
  async create(data: TInsert): Promise<TEntity> {
    try {
      const validatedData = this.validateInsertData(data)
      
      const result = await this.db
        .insert(this.table)
        .values(validatedData as any)
        .returning()

      if (!result[0]) {
        throw new DatabaseError('Failed to create entity', 'create')
      }

      return result[0] as TEntity
    } catch (error) {
      this.handleDatabaseError(error, 'create')
    }
  }

  /**
   * Create multiple entities
   */
  async createMany(data: TInsert[]): Promise<TEntity[]> {
    try {
      const validatedData = data.map(item => this.validateInsertData(item))
      
      const result = await this.db
        .insert(this.table)
        .values(validatedData as any[])
        .returning()

      return result as TEntity[]
    } catch (error) {
      this.handleDatabaseError(error, 'createMany')
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: TUpdate): Promise<TEntity> {
    try {
      const validatedData = this.validateUpdateData(data)
      
      const result = await this.db
        .update(this.table)
        .set({
          ...validatedData as any,
          updatedAt: new Date()
        })
        .where(eq(this.getColumn('id'), id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Entity not found for update')
      }

      return result[0] as TEntity
    } catch (error) {
      this.handleDatabaseError(error, 'update')
    }
  }

  /**
   * Update multiple entities by filters
   */
  async updateMany(filters: FilterCondition[], data: TUpdate): Promise<TEntity[]> {
    try {
      const validatedData = this.validateUpdateData(data)
      const whereClause = this.buildWhereClause(filters)
      
      const result = await this.db
        .update(this.table)
        .set({
          ...validatedData as any,
          updatedAt: new Date()
        })
        .where(whereClause)
        .returning()

      return result as TEntity[]
    } catch (error) {
      this.handleDatabaseError(error, 'updateMany')
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await this.db
        .delete(this.table)
        .where(eq(this.getColumn('id'), id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Entity not found for deletion')
      }
    } catch (error) {
      this.handleDatabaseError(error, 'delete')
    }
  }

  /**
   * Delete multiple entities by filters
   */
  async deleteMany(filters: FilterCondition[]): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(filters)
      
      const result = await this.db
        .delete(this.table)
        .where(whereClause)
        .returning()

      return result.length
    } catch (error) {
      this.handleDatabaseError(error, 'deleteMany')
    }
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ id: this.getColumn('id') })
        .from(this.table)
        .where(eq(this.getColumn('id'), id))
        .limit(1)

      return result.length > 0
    } catch (error) {
      this.handleDatabaseError(error, 'exists')
    }
  }

  /**
   * Count entities with optional filters
   */
  async count(filters: FilterCondition[] = []): Promise<number> {
    try {
      let query = this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table)

      if (filters.length > 0) {
        const whereClause = this.buildWhereClause(filters)
        if (whereClause) {
          query = query.where(whereClause)
        }
      }

      const result = await query
      return result[0]?.count || 0
    } catch (error) {
      this.handleDatabaseError(error, 'count')
    }
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<R>(callback: (ctx: TransactionContext) => Promise<R>): Promise<R> {
    return await this.db.transaction(async (tx) => {
      const context: TransactionContext = {
        db: tx as DrizzleDatabase,
        rollback: () => tx.rollback()
      }
      
      try {
        return await callback(context)
      } catch (error) {
        context.rollback()
        throw error
      }
    })
  }
}

/**
 * Helper functions for building common filter conditions
 */
export const FilterHelpers = {
  /**
   * Create equality filter
   */
  eq: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'eq',
    value
  }),

  /**
   * Create not equal filter
   */
  ne: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'ne',
    value
  }),

  /**
   * Create greater than filter
   */
  gt: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'gt',
    value
  }),

  /**
   * Create greater than or equal filter
   */
  gte: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'gte',
    value
  }),

  /**
   * Create less than filter
   */
  lt: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'lt',
    value
  }),

  /**
   * Create less than or equal filter
   */
  lte: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'lte',
    value
  }),

  /**
   * Create LIKE filter (case-sensitive)
   */
  like: (field: string, pattern: string): FilterCondition => ({
    field,
    operator: 'like',
    value: pattern
  }),

  /**
   * Create ILIKE filter (case-insensitive)
   */
  ilike: (field: string, pattern: string): FilterCondition => ({
    field,
    operator: 'ilike',
    value: pattern
  }),

  /**
   * Create IN filter
   */
  in: (field: string, values: any[]): FilterCondition => ({
    field,
    operator: 'in',
    value: values
  }),

  /**
   * Create NOT IN filter
   */
  notIn: (field: string, values: any[]): FilterCondition => ({
    field,
    operator: 'notIn',
    value: values
  }),

  /**
   * Create IS NULL filter
   */
  isNull: (field: string): FilterCondition => ({
    field,
    operator: 'isNull'
  }),

  /**
   * Create IS NOT NULL filter
   */
  isNotNull: (field: string): FilterCondition => ({
    field,
    operator: 'isNotNull'
  }),

  /**
   * Create AND complex filter
   */
  and: (...conditions: (FilterCondition | ComplexFilter)[]): ComplexFilter => ({
    operator: 'and',
    conditions
  }),

  /**
   * Create OR complex filter
   */
  or: (...conditions: (FilterCondition | ComplexFilter)[]): ComplexFilter => ({
    operator: 'or',
    conditions
  })
}

/**
 * Type exports for external use
 */
export type {
  FilterCondition,
  ComplexFilter,
  SortConfig,
  PaginationConfig,
  QueryOptions,
  RepositoryResult,
  TransactionContext,
  BaseRepositoryInterface
}