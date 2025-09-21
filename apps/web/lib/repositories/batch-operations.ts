/**
 * Batch Operations Utility
 * 
 * This file provides utilities for efficient batch operations including
 * bulk inserts, updates, deletes, and data processing with proper error
 * handling and transaction management.
 */

import { DrizzleDatabase } from '@/lib/db/connection'
import { BaseRepository, FilterCondition, TransactionContext } from './base-repository'
import { DatabaseError, ValidationError } from '@/lib/errors/custom-errors'

/**
 * Batch operation configuration
 */
export interface BatchConfig {
  batchSize: number // Number of items to process per batch
  maxConcurrency: number // Maximum concurrent batches
  retryAttempts: number // Number of retry attempts on failure
  retryDelay: number // Delay between retries in milliseconds
  continueOnError: boolean // Whether to continue processing on individual item errors
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[]
  failed: Array<{
    item: any
    error: string
    index: number
  }>
  totalProcessed: number
  totalSuccessful: number
  totalFailed: number
  duration: number
}

/**
 * Batch operation progress callback
 */
export type BatchProgressCallback = (progress: {
  processed: number
  total: number
  successful: number
  failed: number
  currentBatch: number
  totalBatches: number
}) => void

/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 100,
  maxConcurrency: 3,
  retryAttempts: 3,
  retryDelay: 1000,
  continueOnError: true
}

/**
 * Batch Operations Utility Class
 */
export class BatchOperations {
  private config: BatchConfig

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config }
  }

  /**
   * Execute batch create operations
   */
  async batchCreate<TEntity, TInsert>(
    repository: BaseRepository<TEntity, TInsert, any>,
    items: TInsert[],
    progressCallback?: BatchProgressCallback
  ): Promise<BatchResult<TEntity>> {
    const startTime = Date.now()
    const result: BatchResult<TEntity> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      duration: 0
    }

    if (items.length === 0) {
      result.duration = Date.now() - startTime
      return result
    }

    const batches = this.createBatches(items)
    const totalBatches = batches.length

    // Process batches with controlled concurrency
    const semaphore = new Semaphore(this.config.maxConcurrency)
    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire()
      
      try {
        return await this.processBatchCreate(
          repository,
          batch,
          batchIndex,
          totalBatches,
          result,
          progressCallback
        )
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(batchPromises)

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Execute batch update operations
   */
  async batchUpdate<TEntity, TUpdate>(
    repository: BaseRepository<TEntity, any, TUpdate>,
    updates: Array<{ id: string; data: TUpdate }>,
    progressCallback?: BatchProgressCallback
  ): Promise<BatchResult<TEntity>> {
    const startTime = Date.now()
    const result: BatchResult<TEntity> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      duration: 0
    }

    if (updates.length === 0) {
      result.duration = Date.now() - startTime
      return result
    }

    const batches = this.createBatches(updates)
    const totalBatches = batches.length

    // Process batches with controlled concurrency
    const semaphore = new Semaphore(this.config.maxConcurrency)
    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire()
      
      try {
        return await this.processBatchUpdate(
          repository,
          batch,
          batchIndex,
          totalBatches,
          result,
          progressCallback
        )
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(batchPromises)

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Execute batch delete operations
   */
  async batchDelete<TEntity>(
    repository: BaseRepository<TEntity, any, any>,
    ids: string[],
    progressCallback?: BatchProgressCallback
  ): Promise<BatchResult<void>> {
    const startTime = Date.now()
    const result: BatchResult<void> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      duration: 0
    }

    if (ids.length === 0) {
      result.duration = Date.now() - startTime
      return result
    }

    const batches = this.createBatches(ids)
    const totalBatches = batches.length

    // Process batches with controlled concurrency
    const semaphore = new Semaphore(this.config.maxConcurrency)
    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire()
      
      try {
        return await this.processBatchDelete(
          repository,
          batch,
          batchIndex,
          totalBatches,
          result,
          progressCallback
        )
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(batchPromises)

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Execute batch operations within a transaction
   */
  async batchWithTransaction<T>(
    repository: BaseRepository<any, any, any>,
    operation: (ctx: TransactionContext) => Promise<T>
  ): Promise<T> {
    return await repository.withTransaction(operation)
  }

  /**
   * Upsert operations (insert or update)
   */
  async batchUpsert<TEntity, TInsert, TUpdate>(
    repository: BaseRepository<TEntity, TInsert, TUpdate>,
    items: Array<{
      id?: string
      data: TInsert | TUpdate
    }>,
    progressCallback?: BatchProgressCallback
  ): Promise<BatchResult<TEntity>> {
    const startTime = Date.now()
    const result: BatchResult<TEntity> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      duration: 0
    }

    if (items.length === 0) {
      result.duration = Date.now() - startTime
      return result
    }

    // Separate inserts and updates
    const inserts: TInsert[] = []
    const updates: Array<{ id: string; data: TUpdate }> = []

    for (const item of items) {
      if (item.id) {
        updates.push({ id: item.id, data: item.data as TUpdate })
      } else {
        inserts.push(item.data as TInsert)
      }
    }

    // Process inserts
    if (inserts.length > 0) {
      const insertResult = await this.batchCreate(repository, inserts, progressCallback)
      result.successful.push(...insertResult.successful)
      result.failed.push(...insertResult.failed)
      result.totalProcessed += insertResult.totalProcessed
      result.totalSuccessful += insertResult.totalSuccessful
      result.totalFailed += insertResult.totalFailed
    }

    // Process updates
    if (updates.length > 0) {
      const updateResult = await this.batchUpdate(repository, updates, progressCallback)
      result.successful.push(...updateResult.successful)
      result.failed.push(...updateResult.failed)
      result.totalProcessed += updateResult.totalProcessed
      result.totalSuccessful += updateResult.totalSuccessful
      result.totalFailed += updateResult.totalFailed
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Process a single batch of create operations
   */
  private async processBatchCreate<TEntity, TInsert>(
    repository: BaseRepository<TEntity, TInsert, any>,
    batch: Array<{ item: TInsert; originalIndex: number }>,
    batchIndex: number,
    totalBatches: number,
    result: BatchResult<TEntity>,
    progressCallback?: BatchProgressCallback
  ): Promise<void> {
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Try batch insert first
        const items = batch.map(b => b.item)
        const created = await repository.createMany(items)
        
        result.successful.push(...created)
        result.totalSuccessful += created.length
        result.totalProcessed += batch.length
        
        this.updateProgress(result, batchIndex + 1, totalBatches, progressCallback)
        return
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          // Final attempt failed, try individual items if configured
          if (this.config.continueOnError) {
            await this.processIndividualCreates(repository, batch, result)
            result.totalProcessed += batch.length
            this.updateProgress(result, batchIndex + 1, totalBatches, progressCallback)
            return
          } else {
            // Mark all items as failed
            batch.forEach(({ item, originalIndex }) => {
              result.failed.push({
                item,
                error: error instanceof Error ? error.message : 'Unknown error',
                index: originalIndex
              })
            })
            result.totalFailed += batch.length
            result.totalProcessed += batch.length
            this.updateProgress(result, batchIndex + 1, totalBatches, progressCallback)
            return
          }
        }
        
        // Wait before retry
        await this.delay(this.config.retryDelay * (attempt + 1))
      }
    }
  }

  /**
   * Process individual create operations when batch fails
   */
  private async processIndividualCreates<TEntity, TInsert>(
    repository: BaseRepository<TEntity, TInsert, any>,
    batch: Array<{ item: TInsert; originalIndex: number }>,
    result: BatchResult<TEntity>
  ): Promise<void> {
    for (const { item, originalIndex } of batch) {
      try {
        const created = await repository.create(item)
        result.successful.push(created)
        result.totalSuccessful++
      } catch (error) {
        result.failed.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error',
          index: originalIndex
        })
        result.totalFailed++
      }
    }
  }

  /**
   * Process a single batch of update operations
   */
  private async processBatchUpdate<TEntity, TUpdate>(
    repository: BaseRepository<TEntity, any, TUpdate>,
    batch: Array<{ item: { id: string; data: TUpdate }; originalIndex: number }>,
    batchIndex: number,
    totalBatches: number,
    result: BatchResult<TEntity>,
    progressCallback?: BatchProgressCallback
  ): Promise<void> {
    // Updates are processed individually since there's no batch update method
    for (const { item, originalIndex } of batch) {
      let success = false
      
      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const updated = await repository.update(item.id, item.data)
          result.successful.push(updated)
          result.totalSuccessful++
          success = true
          break
        } catch (error) {
          if (attempt === this.config.retryAttempts) {
            result.failed.push({
              item,
              error: error instanceof Error ? error.message : 'Unknown error',
              index: originalIndex
            })
            result.totalFailed++
          } else {
            await this.delay(this.config.retryDelay * (attempt + 1))
          }
        }
      }
      
      result.totalProcessed++
    }
    
    this.updateProgress(result, batchIndex + 1, totalBatches, progressCallback)
  }

  /**
   * Process a single batch of delete operations
   */
  private async processBatchDelete<TEntity>(
    repository: BaseRepository<TEntity, any, any>,
    batch: Array<{ item: string; originalIndex: number }>,
    batchIndex: number,
    totalBatches: number,
    result: BatchResult<void>,
    progressCallback?: BatchProgressCallback
  ): Promise<void> {
    // Deletes are processed individually
    for (const { item: id, originalIndex } of batch) {
      let success = false
      
      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          await repository.delete(id)
          result.totalSuccessful++
          success = true
          break
        } catch (error) {
          if (attempt === this.config.retryAttempts) {
            result.failed.push({
              item: id,
              error: error instanceof Error ? error.message : 'Unknown error',
              index: originalIndex
            })
            result.totalFailed++
          } else {
            await this.delay(this.config.retryDelay * (attempt + 1))
          }
        }
      }
      
      result.totalProcessed++
    }
    
    this.updateProgress(result, batchIndex + 1, totalBatches, progressCallback)
  }

  /**
   * Create batches from items array
   */
  private createBatches<T>(items: T[]): Array<Array<{ item: T; originalIndex: number }>> {
    const batches: Array<Array<{ item: T; originalIndex: number }>> = []
    
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items
        .slice(i, i + this.config.batchSize)
        .map((item, index) => ({
          item,
          originalIndex: i + index
        }))
      
      batches.push(batch)
    }
    
    return batches
  }

  /**
   * Update progress and call callback
   */
  private updateProgress<T>(
    result: BatchResult<T>,
    currentBatch: number,
    totalBatches: number,
    progressCallback?: BatchProgressCallback
  ): void {
    if (progressCallback) {
      progressCallback({
        processed: result.totalProcessed,
        total: result.totalProcessed + (totalBatches - currentBatch) * this.config.batchSize,
        successful: result.totalSuccessful,
        failed: result.totalFailed,
        currentBatch,
        totalBatches
      })
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return Promise.resolve()
    }

    return new Promise<void>(resolve => {
      this.waiting.push(resolve)
    })
  }

  release(): void {
    this.permits++
    
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!
      this.permits--
      resolve()
    }
  }
}

/**
 * Global batch operations instance
 */
let globalBatchOperations: BatchOperations | undefined

/**
 * Get or create global batch operations instance
 */
export function getBatchOperations(): BatchOperations {
  if (!globalBatchOperations) {
    globalBatchOperations = new BatchOperations()
  }
  return globalBatchOperations
}

/**
 * Set global batch operations instance (useful for testing)
 */
export function setBatchOperations(batchOps: BatchOperations): void {
  globalBatchOperations = batchOps
}

/**
 * Clear global batch operations instance (useful for testing)
 */
export function clearBatchOperations(): void {
  globalBatchOperations = undefined
}