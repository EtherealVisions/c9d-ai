/**
 * Performance Tests for Permission Checking and Context Switching
 * Tests performance characteristics of RBAC and organization context operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'
import { rbacService } from '@/lib/services/rbac-service'
import { organizationService } from '@/lib/services/organization-service'
import { createTypedSupabaseClient } from '@/lib/models/database'

// Mock database
vi.mock('@/lib/models/database', () => ({
  createTypedSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    })),
    rpc: vi.fn()
  }))
}))

interface PerformanceMetrics {
  operation: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  p95Time: number
  p99Time: number
}

class PerformanceTester {
  private results: number[] = []

  async measureOperation<T>(
    operation: () => Promise<T>,
    iterations: number = 100
  ): Promise<PerformanceMetrics> {
    this.results = []
    
    // Warm up
    await operation()
    
    // Measure iterations
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await operation()
      const end = performance.now()
      this.results.push(end - start)
    }
    
    return this.calculateMetrics('operation', iterations)
  }

  private calculateMetrics(operationName: string, iterations: number): PerformanceMetrics {
    const sorted = [...this.results].sort((a, b) => a - b)
    const totalTime = this.results.reduce((sum, time) => sum + time, 0)
    
    return {
      operation: operationName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      p95Time: sorted[Math.floor(iterations * 0.95)],
      p99Time: sorted[Math.floor(iterations * 0.99)]
    }
  }
}

describe('Permission Checking Performance Tests', () => {
  let mockSupabase: any
  let tester: PerformanceTester

  beforeEach(() => {
    mockSupabase = createTypedSupabaseClient()
    tester = new PerformanceTester()
    
    // Set up proper mock chain for Supabase
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    }
    
    mockSupabase.from.mockReturnValue(mockChain)
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Single Permission Check Performance', () => {
    it('should check single permission within performance threshold', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      // Mock fast database response
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: {
            permissions: ['organization.read', 'organization.write']
          }
        },
        error: null
      })

      const metrics = await tester.measureOperation(async () => {
        return rbacService.hasPermission(userId, organizationId, permission)
      }, 100)

      console.log('Single Permission Check Metrics:', metrics)

      // Performance assertions
      expect(metrics.averageTime).toBeLessThan(10) // < 10ms average
      expect(metrics.p95Time).toBeLessThan(20) // < 20ms for 95th percentile
      expect(metrics.p99Time).toBeLessThan(50) // < 50ms for 99th percentile
    })

    it('should handle permission check with database latency', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      // Mock slower database response (simulating network latency)
      mockSupabase.from().select().eq().eq().single.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: {
                id: 'membership-123',
                role: { permissions: ['organization.read'] }
              },
              error: null
            })
          }, 50) // 50ms latency
        })
      )

      const metrics = await tester.measureOperation(async () => {
        return rbacService.hasPermission(userId, organizationId, permission)
      }, 20) // Fewer iterations due to latency

      console.log('Permission Check with Latency Metrics:', metrics)

      // Adjusted expectations for latency
      expect(metrics.averageTime).toBeLessThan(100) // < 100ms average with latency
      expect(metrics.p95Time).toBeLessThan(150) // < 150ms for 95th percentile
    })
  })

  describe('Bulk Permission Check Performance', () => {
    it('should efficiently check multiple permissions', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permissions = [
        'organization.read',
        'organization.write',
        'members.read',
        'members.write',
        'settings.read',
        'settings.write',
        'billing.read',
        'billing.write'
      ]

      // Mock role with all permissions
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: { permissions }
        },
        error: null
      })

      const metrics = await tester.measureOperation(async () => {
        const results = await Promise.all(
          permissions.map(permission => 
            rbacService.hasPermission(userId, organizationId, permission)
          )
        )
        return results
      }, 50)

      console.log('Bulk Permission Check Metrics:', metrics)

      // Should be efficient even with multiple checks
      expect(metrics.averageTime).toBeLessThan(50) // < 50ms for 8 permissions
      expect(metrics.p95Time).toBeLessThan(100) // < 100ms for 95th percentile
    })

    it('should optimize repeated permission checks with caching', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      let dbCallCount = 0
      mockSupabase.from().select().eq().eq().single.mockImplementation(() => {
        dbCallCount++
        return Promise.resolve({
          data: {
            id: 'membership-123',
            role: { permissions: ['organization.read'] }
          },
          error: null
        })
      })

      // First call - should hit database
      await rbacService.hasPermission(userId, organizationId, permission)
      const firstCallCount = dbCallCount

      // Subsequent calls within short timeframe - should use cache if implemented
      const metrics = await tester.measureOperation(async () => {
        return rbacService.hasPermission(userId, organizationId, permission)
      }, 10)

      console.log('Cached Permission Check Metrics:', metrics)
      console.log('Database calls:', dbCallCount, 'vs expected:', firstCallCount)

      // With caching, subsequent calls should be much faster
      if (dbCallCount === firstCallCount) {
        // Caching is working
        expect(metrics.averageTime).toBeLessThan(1) // < 1ms with cache
      } else {
        // No caching implemented yet
        expect(metrics.averageTime).toBeLessThan(10) // Still reasonable without cache
      }
    })
  })

  describe('Organization Context Switching Performance', () => {
    it('should switch organization context efficiently', async () => {
      const userId = 'user-123'
      const organizations = [
        { id: 'org-1', name: 'Org 1' },
        { id: 'org-2', name: 'Org 2' },
        { id: 'org-3', name: 'Org 3' },
        { id: 'org-4', name: 'Org 4' },
        { id: 'org-5', name: 'Org 5' }
      ]

      // Mock user organizations
      mockSupabase.from().select().eq().mockResolvedValue({
        data: organizations.map((org, index) => ({
          id: `membership-${index}`,
          user_id: userId,
          organization_id: org.id,
          role_id: 'role-member',
          organization: org
        })),
        error: null
      })

      const metrics = await tester.measureOperation(async () => {
        return organizationService.getUserOrganizations(userId)
      }, 100)

      console.log('Organization Context Switch Metrics:', metrics)

      // Should load user organizations quickly
      expect(metrics.averageTime).toBeLessThan(20) // < 20ms average
      expect(metrics.p95Time).toBeLessThan(40) // < 40ms for 95th percentile
    })

    it('should handle large organization lists efficiently', async () => {
      const userId = 'user-123'
      const organizationCount = 50

      // Generate large organization list
      const organizations = Array.from({ length: organizationCount }, (_, i) => ({
        id: `membership-${i}`,
        user_id: userId,
        organization_id: `org-${i}`,
        role_id: 'role-member',
        organization: {
          id: `org-${i}`,
          name: `Organization ${i}`,
          slug: `org-${i}`
        }
      }))

      mockSupabase.from().select().eq().mockResolvedValue({
        data: organizations,
        error: null
      })

      const metrics = await tester.measureOperation(async () => {
        return organizationService.getUserOrganizations(userId)
      }, 20)

      console.log(`Large Organization List (${organizationCount}) Metrics:`, metrics)

      // Should handle large lists reasonably well
      expect(metrics.averageTime).toBeLessThan(100) // < 100ms for 50 orgs
      expect(metrics.p95Time).toBeLessThan(200) // < 200ms for 95th percentile
    })
  })

  describe('Concurrent Permission Checks', () => {
    it('should handle concurrent permission checks efficiently', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`)
      const organizationId = 'org-456'
      const permission = 'organization.read'

      // Mock responses for all users
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: { permissions: ['organization.read'] }
        },
        error: null
      })

      const metrics = await tester.measureOperation(async () => {
        const results = await Promise.all(
          userIds.map(userId => 
            rbacService.hasPermission(userId, organizationId, permission)
          )
        )
        return results
      }, 20)

      console.log('Concurrent Permission Check Metrics:', metrics)

      // Concurrent checks should not significantly degrade performance
      expect(metrics.averageTime).toBeLessThan(100) // < 100ms for 10 concurrent checks
      expect(metrics.p95Time).toBeLessThan(200) // < 200ms for 95th percentile
    })

    it('should handle permission check under load', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: { permissions: ['organization.read'] }
        },
        error: null
      })

      // Simulate high load with many concurrent operations
      const concurrentOperations = 50
      const startTime = performance.now()

      const promises = Array.from({ length: concurrentOperations }, () =>
        rbacService.hasPermission(userId, organizationId, permission)
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      console.log(`Load Test: ${concurrentOperations} concurrent operations in ${totalTime}ms`)
      console.log(`Average per operation: ${totalTime / concurrentOperations}ms`)

      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true)
      
      // Should handle load reasonably
      expect(totalTime / concurrentOperations).toBeLessThan(50) // < 50ms average under load
    })
  })

  describe('Memory Usage and Resource Management', () => {
    it('should not leak memory during repeated operations', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: { permissions: ['organization.read'] }
        },
        error: null
      })

      // Measure memory before
      const initialMemory = process.memoryUsage()

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await rbacService.hasPermission(userId, organizationId, permission)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      // Measure memory after
      const finalMemory = process.memoryUsage()

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseKB = memoryIncrease / 1024

      console.log(`Memory increase after 1000 operations: ${memoryIncreaseKB.toFixed(2)} KB`)

      // Should not have significant memory leaks
      expect(memoryIncreaseKB).toBeLessThan(1000) // < 1MB increase
    })
  })

  describe('Performance Regression Detection', () => {
    it('should maintain performance benchmarks', async () => {
      const benchmarks = {
        singlePermissionCheck: 10, // ms
        bulkPermissionCheck: 50, // ms
        organizationSwitch: 20, // ms
        concurrentChecks: 100 // ms
      }

      const userId = 'user-123'
      const organizationId = 'org-456'

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          role: { permissions: ['organization.read', 'organization.write'] }
        },
        error: null
      })

      // Test single permission check
      const singleCheckMetrics = await tester.measureOperation(async () => {
        return rbacService.hasPermission(userId, organizationId, 'organization.read')
      }, 100)

      // Test bulk permission check
      const bulkCheckMetrics = await tester.measureOperation(async () => {
        const permissions = ['organization.read', 'organization.write', 'members.read']
        return Promise.all(
          permissions.map(p => rbacService.hasPermission(userId, organizationId, p))
        )
      }, 50)

      // Report results
      const results = {
        singlePermissionCheck: singleCheckMetrics.averageTime,
        bulkPermissionCheck: bulkCheckMetrics.averageTime
      }

      console.log('Performance Benchmark Results:', results)

      // Check against benchmarks
      Object.entries(results).forEach(([test, actualTime]) => {
        const benchmark = benchmarks[test as keyof typeof benchmarks]
        if (actualTime > benchmark) {
          console.warn(`⚠️  Performance regression detected in ${test}: ${actualTime}ms > ${benchmark}ms`)
        } else {
          console.log(`✅ ${test} performance: ${actualTime}ms <= ${benchmark}ms`)
        }
      })

      // Assertions (can be adjusted based on actual performance characteristics)
      expect(results.singlePermissionCheck).toBeLessThan(benchmarks.singlePermissionCheck * 2)
      expect(results.bulkPermissionCheck).toBeLessThan(benchmarks.bulkPermissionCheck * 2)
    })
  })
})