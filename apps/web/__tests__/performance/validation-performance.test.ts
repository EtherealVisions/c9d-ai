/**
 * Validation Performance Tests
 * 
 * This file provides performance tests for validation operations including:
 * - Schema validation performance benchmarks
 * - Memory usage analysis
 * - Concurrent validation testing
 * - Performance regression detection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { z } from 'zod'
import {
  ValidationPerformanceTester,
  ValidationTestDataGenerator
} from '../setup/zod-testing-framework'

// Import validation schemas for performance testing
import {
  createUserSchema,
  createOrganizationSchema,
  createRoleSchema,
  createContentSchema,
  createInvitationSchema,
  businessRuleSchema,
  searchSchema,
  paginationSchema,
  apiResponseSchema
} from '@/lib/validation/schemas'

describe('Validation Performance Tests', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    SIMPLE_SCHEMA: 0.1,      // Simple string/number validation
    MEDIUM_SCHEMA: 0.5,      // Object with 3-5 fields
    COMPLEX_SCHEMA: 2.0,     // Complex nested objects
    VERY_COMPLEX_SCHEMA: 5.0 // Highly nested with business rules
  }

  // Test data generators
  let testDataSets: {
    simple: any[]
    medium: any[]
    complex: any[]
    veryComplex: any[]
  }

  beforeAll(() => {
    // Generate test data sets for different complexity levels
    testDataSets = {
      simple: [
        'test@example.com',
        'another@test.com',
        'user@domain.org',
        'admin@company.co.uk'
      ],
      medium: [
        {
          name: 'Test User 1',
          email: 'user1@example.com',
          age: 25
        },
        {
          name: 'Test User 2',
          email: 'user2@example.com',
          age: 30
        },
        {
          name: 'Test User 3',
          email: 'user3@example.com',
          age: 35
        }
      ],
      complex: [
        {
          clerkUserId: 'clerk_user_1',
          email: 'complex1@example.com',
          firstName: 'Complex',
          lastName: 'User1',
          preferences: {
            theme: 'dark',
            notifications: true,
            language: 'en'
          }
        },
        {
          clerkUserId: 'clerk_user_2',
          email: 'complex2@example.com',
          firstName: 'Complex',
          lastName: 'User2',
          preferences: {
            theme: 'light',
            notifications: false,
            language: 'es'
          }
        }
      ],
      veryComplex: [
        {
          name: 'Complex Business Rule',
          description: 'A very complex business rule with multiple conditions',
          conditions: [
            { field: 'user.email', operator: 'required' },
            { field: 'user.age', operator: 'gte', value: 18 },
            { field: 'organization.type', operator: 'in', value: ['enterprise', 'business'] },
            { field: 'subscription.plan', operator: 'ne', value: 'free' }
          ],
          actions: [
            { type: 'validate', target: 'user.profile' },
            { type: 'notify', target: 'admin', template: 'user_validation' },
            { type: 'log', target: 'audit', level: 'info' },
            { type: 'trigger', target: 'webhook', url: 'https://api.example.com/webhook' }
          ],
          metadata: {
            priority: 'high',
            category: 'user_management',
            tags: ['validation', 'security', 'compliance'],
            dependencies: ['user_service', 'notification_service', 'audit_service']
          }
        }
      ]
    }
  })

  describe('Simple Schema Performance', () => {
    it('should validate email schema within performance threshold', async () => {
      const emailSchema = z.string().email()
      const testData = ValidationTestDataGenerator.generateEmailTestData()
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        emailSchema,
        testData.valid,
        1000
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(1000)
      
      console.log(`Email validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate UUID schema within performance threshold', async () => {
      const uuidSchema = z.string().uuid()
      const testData = ValidationTestDataGenerator.generateUUIDTestData()
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        uuidSchema,
        testData.valid,
        1000
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(1000)
      
      console.log(`UUID validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate number schema within performance threshold', async () => {
      const numberSchema = z.number().min(0).max(1000)
      const testData = ValidationTestDataGenerator.generateNumberTestData()
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        numberSchema,
        testData.valid,
        1000
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(1000)
      
      console.log(`Number validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Medium Complexity Schema Performance', () => {
    it('should validate pagination schema within performance threshold', async () => {
      const results = await ValidationPerformanceTester.benchmarkSchema(
        paginationSchema,
        [
          { page: 1, limit: 20 },
          { page: 2, limit: 50 },
          { page: 1, limit: 10, offset: 0 },
          {}
        ],
        1000
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(500)
      
      console.log(`Pagination validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate search schema within performance threshold', async () => {
      const results = await ValidationPerformanceTester.benchmarkSchema(
        searchSchema,
        [
          { query: 'test', sortBy: 'name', sortOrder: 'asc' },
          { filters: { status: 'active' }, sortBy: 'createdAt' },
          { page: 1, limit: 20, sortBy: 'updatedAt', sortOrder: 'desc' }
        ],
        1000
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(500)
      
      console.log(`Search validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Complex Schema Performance', () => {
    it('should validate user creation schema within performance threshold', async () => {
      const results = await ValidationPerformanceTester.benchmarkSchema(
        createUserSchema,
        testDataSets.complex,
        500
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(200)
      
      console.log(`User creation validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate organization creation schema within performance threshold', async () => {
      const testData = [
        {
          name: 'Test Organization 1',
          slug: 'test-org-1',
          description: 'A test organization',
          settings: { public: true, allowInvitations: true }
        },
        {
          name: 'Test Organization 2',
          slug: 'test-org-2',
          settings: { public: false }
        }
      ]
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        createOrganizationSchema,
        testData,
        500
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(200)
      
      console.log(`Organization creation validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate content creation schema within performance threshold', async () => {
      const testData = [
        {
          title: 'Test Content 1',
          type: 'onboarding_step',
          content: {
            text: 'Welcome to our platform!',
            media: [{ type: 'image', url: 'https://example.com/image.jpg' }]
          },
          metadata: { order: 1, estimatedDuration: 300 }
        },
        {
          title: 'Test Content 2',
          type: 'tutorial',
          content: {
            text: 'How to get started',
            steps: ['Step 1', 'Step 2', 'Step 3']
          }
        }
      ]
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        createContentSchema,
        testData,
        500
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(200)
      
      console.log(`Content creation validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Very Complex Schema Performance', () => {
    it('should validate business rule schema within performance threshold', async () => {
      const results = await ValidationPerformanceTester.benchmarkSchema(
        businessRuleSchema,
        testDataSets.veryComplex,
        200
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VERY_COMPLEX_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(50)
      
      console.log(`Business rule validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })

    it('should validate API response schema within performance threshold', async () => {
      const userDataSchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
        profile: z.object({
          bio: z.string().optional(),
          avatar: z.string().url().optional(),
          preferences: z.record(z.unknown()).optional()
        }).optional()
      })
      
      const responseSchema = apiResponseSchema(userDataSchema)
      
      const testData = [
        {
          success: true,
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'John Doe',
            email: 'john@example.com',
            profile: {
              bio: 'Software developer',
              avatar: 'https://example.com/avatar.jpg',
              preferences: { theme: 'dark', notifications: true }
            }
          },
          message: 'User retrieved successfully'
        },
        {
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        }
      ]
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        responseSchema,
        testData,
        200
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VERY_COMPLEX_SCHEMA)
      expect(results.operationsPerSecond).toBeGreaterThan(50)
      
      console.log(`API response validation: ${results.averageTime.toFixed(4)}ms avg, ${results.operationsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Comparative Performance Analysis', () => {
    it('should compare schema complexity performance', async () => {
      const schemas = [
        { name: 'Simple Email', schema: z.string().email() },
        { name: 'Medium Pagination', schema: paginationSchema },
        { name: 'Complex User', schema: createUserSchema },
        { name: 'Very Complex Business Rule', schema: businessRuleSchema }
      ]
      
      const testData = [
        'test@example.com',
        { page: 1, limit: 20 },
        testDataSets.complex[0],
        testDataSets.veryComplex[0]
      ]
      
      const results = await ValidationPerformanceTester.compareSchemaPerformance(
        schemas,
        testData,
        200
      )
      
      expect(results.results).toHaveLength(4)
      expect(results.fastest).toBeDefined()
      expect(results.slowest).toBeDefined()
      
      // Log performance comparison
      console.log('\nSchema Performance Comparison:')
      results.results
        .sort((a, b) => a.performance.averageTime - b.performance.averageTime)
        .forEach((result, index) => {
          console.log(`${index + 1}. ${result.name}: ${result.performance.averageTime.toFixed(4)}ms avg (${result.performance.operationsPerSecond.toFixed(0)} ops/sec)`)
        })
      
      // Verify performance ordering (simpler schemas should be faster)
      const simpleResult = results.results.find(r => r.name === 'Simple Email')
      const complexResult = results.results.find(r => r.name === 'Very Complex Business Rule')
      
      expect(simpleResult!.performance.averageTime).toBeLessThan(
        complexResult!.performance.averageTime
      )
    })
  })

  describe('Memory Usage Analysis', () => {
    it('should monitor memory usage during validation', async () => {
      const schema = createUserSchema
      const testData = Array.from({ length: 100 }, (_, i) => ({
        clerkUserId: `clerk_user_${i}`,
        email: `user${i}@example.com`,
        firstName: `User${i}`,
        lastName: 'Test',
        preferences: { theme: i % 2 === 0 ? 'dark' : 'light' }
      }))
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        schema,
        testData,
        1000
      )
      
      if (results.memoryUsage) {
        console.log(`Memory usage - Before: ${(results.memoryUsage.before / 1024 / 1024).toFixed(2)}MB, After: ${(results.memoryUsage.after / 1024 / 1024).toFixed(2)}MB, Delta: ${(results.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB`)
        
        // Memory usage should be reasonable (less than 10MB for this test)
        expect(Math.abs(results.memoryUsage.delta)).toBeLessThan(10 * 1024 * 1024)
      }
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA)
    })
  })

  describe('Concurrent Validation Performance', () => {
    it('should handle concurrent validations efficiently', async () => {
      const schema = createUserSchema
      const testData = {
        clerkUserId: 'clerk_concurrent_test',
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'Test'
      }
      
      const concurrentValidations = 50
      const startTime = performance.now()
      
      // Run concurrent validations
      const promises = Array.from({ length: concurrentValidations }, () =>
        schema.safeParseAsync(testData)
      )
      
      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime
      const averageTime = totalTime / concurrentValidations
      
      // All validations should succeed
      expect(results.every(result => result.success)).toBe(true)
      
      // Concurrent performance should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA * 2)
      
      console.log(`Concurrent validation (${concurrentValidations} operations): ${averageTime.toFixed(4)}ms avg, ${totalTime.toFixed(2)}ms total`)
    })

    it('should handle mixed concurrent validations', async () => {
      const schemas = [
        { name: 'User', schema: createUserSchema },
        { name: 'Organization', schema: createOrganizationSchema },
        { name: 'Role', schema: createRoleSchema }
      ]
      
      const testDataSets = [
        {
          clerkUserId: 'clerk_mixed_1',
          email: 'mixed1@example.com',
          firstName: 'Mixed',
          lastName: 'Test1'
        },
        {
          name: 'Mixed Organization',
          slug: 'mixed-org'
        },
        {
          name: 'Mixed Role',
          permissions: ['user.read', 'user.write']
        }
      ]
      
      const concurrentOperations = 30
      const startTime = performance.now()
      
      // Create mixed concurrent validations
      const promises = Array.from({ length: concurrentOperations }, (_, i) => {
        const schemaIndex = i % schemas.length
        const schema = schemas[schemaIndex].schema
        const testData = testDataSets[schemaIndex]
        return schema.safeParseAsync(testData)
      })
      
      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime
      const averageTime = totalTime / concurrentOperations
      
      // All validations should succeed
      expect(results.every(result => result.success)).toBe(true)
      
      // Mixed concurrent performance should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA * 3)
      
      console.log(`Mixed concurrent validation (${concurrentOperations} operations): ${averageTime.toFixed(4)}ms avg, ${totalTime.toFixed(2)}ms total`)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const schema = createUserSchema
      const testData = testDataSets.complex[0]
      
      // Baseline performance measurement
      const baselineResults = await ValidationPerformanceTester.benchmarkSchema(
        schema,
        [testData],
        100
      )
      
      // Simulate performance regression by adding artificial delay
      const slowSchema = schema.transform(async (data) => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 1))
        return data
      })
      
      const regressionResults = await ValidationPerformanceTester.benchmarkSchema(
        slowSchema,
        [testData],
        10 // Fewer iterations due to artificial delay
      )
      
      // Regression should be detectable
      expect(regressionResults.averageTime).toBeGreaterThan(baselineResults.averageTime)
      
      console.log(`Baseline: ${baselineResults.averageTime.toFixed(4)}ms, Regression: ${regressionResults.averageTime.toFixed(4)}ms`)
      
      // Performance regression threshold (10x slower is definitely a regression)
      const regressionThreshold = baselineResults.averageTime * 10
      expect(regressionResults.averageTime).toBeGreaterThan(regressionThreshold)
    })
  })

  describe('Edge Case Performance', () => {
    it('should handle large data sets efficiently', async () => {
      const schema = z.array(createUserSchema)
      
      // Create large dataset
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        clerkUserId: `clerk_large_${i}`,
        email: `large${i}@example.com`,
        firstName: `User${i}`,
        lastName: 'Large',
        preferences: { 
          theme: i % 2 === 0 ? 'dark' : 'light',
          notifications: i % 3 === 0,
          language: ['en', 'es', 'fr'][i % 3]
        }
      }))
      
      const startTime = performance.now()
      const result = schema.safeParse(largeDataSet)
      const duration = performance.now() - startTime
      
      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(100) // Should complete within 100ms
      
      console.log(`Large dataset validation (1000 items): ${duration.toFixed(2)}ms`)
    })

    it('should handle deeply nested objects efficiently', async () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.object({
                level5: z.object({
                  data: z.string(),
                  metadata: z.record(z.unknown())
                })
              })
            })
          })
        })
      })
      
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'deep nested data',
                  metadata: { 
                    created: new Date().toISOString(),
                    tags: ['deep', 'nested', 'test']
                  }
                }
              }
            }
          }
        }
      }
      
      const results = await ValidationPerformanceTester.benchmarkSchema(
        deepSchema,
        [deepData],
        500
      )
      
      expect(results.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SCHEMA)
      
      console.log(`Deep nested validation: ${results.averageTime.toFixed(4)}ms avg`)
    })
  })
})