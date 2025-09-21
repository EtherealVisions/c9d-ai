/**
 * API Validation Integration Tests
 * 
 * Comprehensive integration tests for API routes with validation including:
 * - API endpoint validation with Zod schemas
 * - Error handling and response formatting
 * - Request/response validation cycles
 * - Performance testing for API operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  testSetup,
  testTeardown
} from '../setup/drizzle-testing-setup'
import {
  createValidationTester,
  ValidationErrorFormatter
} from '../setup/zod-testing-framework'

// Import validation schemas
import {
  createUserSchema,
  updateUserSchema,
  userResponseSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationResponseSchema,
  apiResponseSchema,
  errorResponseSchema,
  paginationSchema,
  searchSchema
} from '@/lib/validation/schemas'

// Import API route handlers (these would be the actual route handlers)
// For testing purposes, we'll simulate the API behavior
import { UserService } from '@/lib/services/user-service'
import { OrganizationService } from '@/lib/services/organization-service'
import { UserRepository } from '@/lib/repositories/user-repository'
import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { RoleRepository } from '@/lib/repositories/role-repository'

// Mock API response helpers
function createMockRequest(method: string, body?: any, params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/test')
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  })
}

function createMockResponse(data: any, status: number = 200) {
  return {
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ok: status >= 200 && status < 300,
    headers: new Headers()
  }
}

describe('API Validation Integration Tests', () => {
  let testDb: any
  let userService: UserService
  let organizationService: OrganizationService

  beforeAll(async () => {
    testDb = await testSetup()
    
    const userRepository = new UserRepository(testDb)
    const organizationRepository = new OrganizationRepository(testDb)
    const roleRepository = new RoleRepository(testDb)
    
    userService = new UserService(userRepository)
    organizationService = new OrganizationService(organizationRepository, userRepository, roleRepository)
  })

  afterAll(async () => {
    await testTeardown()
  })

  beforeEach(async () => {
    await cleanTestDatabase()
  })

  describe('User API Validation Integration', () => {
    describe('POST /api/users - Create User', () => {
      it('should validate and create user with valid data', async () => {
        const validUserData = {
          clerkUserId: 'clerk_api_user_1',
          email: 'apiuser1@example.com',
          firstName: 'API',
          lastName: 'User1'
        }

        // Validate request data
        const requestValidation = createValidationTester(createUserSchema)
        const validationResult = await requestValidation.testValidationCase({
          name: 'Valid user creation request',
          input: validUserData,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Simulate API endpoint behavior
        const createdUser = await userService.createUser(validUserData)
        
        // Validate response data
        const responseValidation = createValidationTester(userResponseSchema)
        const responseResult = await responseValidation.testValidationCase({
          name: 'User creation response',
          input: createdUser,
          expected: { success: true }
        })
        expect(responseResult.success).toBe(true)

        // Validate API response wrapper
        const apiResponse = {
          success: true,
          data: createdUser,
          message: 'User created successfully'
        }

        const apiValidation = createValidationTester(apiResponseSchema(userResponseSchema))
        const apiResult = await apiValidation.testValidationCase({
          name: 'API response wrapper',
          input: apiResponse,
          expected: { success: true }
        })
        expect(apiResult.success).toBe(true)
      })

      it('should handle validation errors properly', async () => {
        const invalidUserData = {
          clerkUserId: '', // Invalid: empty string
          email: 'invalid-email', // Invalid: not an email
          firstName: 'Valid',
          lastName: '' // Invalid: empty string
        }

        // Test request validation
        const requestValidation = createValidationTester(createUserSchema)
        const validationResult = await requestValidation.testValidationCase({
          name: 'Invalid user creation request',
          input: invalidUserData,
          expected: { 
            success: false,
            errorCodes: ['too_small', 'invalid_string']
          }
        })
        expect(validationResult.success).toBe(false)

        // Test service layer error handling
        await expect(userService.createUser(invalidUserData as any))
          .rejects.toThrow()

        // Test error response format
        const errorResponse = {
          success: false,
          error: 'Validation failed',
          details: [
            { field: 'clerkUserId', message: 'String must contain at least 1 character(s)', code: 'too_small' },
            { field: 'email', message: 'Invalid email', code: 'invalid_string' },
            { field: 'lastName', message: 'String must contain at least 1 character(s)', code: 'too_small' }
          ],
          code: 'VALIDATION_ERROR'
        }

        const errorValidation = createValidationTester(errorResponseSchema)
        const errorResult = await errorValidation.testValidationCase({
          name: 'Error response format',
          input: errorResponse,
          expected: { success: true }
        })
        expect(errorResult.success).toBe(true)
      })

      it('should handle duplicate email errors', async () => {
        const userData = {
          clerkUserId: 'clerk_duplicate_test',
          email: 'duplicate@example.com',
          firstName: 'Duplicate',
          lastName: 'Test'
        }

        // Create first user
        await userService.createUser(userData)

        // Attempt to create duplicate
        const duplicateData = {
          clerkUserId: 'clerk_duplicate_test_2',
          email: 'duplicate@example.com', // Same email
          firstName: 'Another',
          lastName: 'User'
        }

        await expect(userService.createUser(duplicateData))
          .rejects.toThrow()
      })
    })

    describe('PUT /api/users/[id] - Update User', () => {
      it('should validate and update user with valid data', async () => {
        // Create user first
        const user = await userService.createUser({
          clerkUserId: 'clerk_update_test',
          email: 'update@example.com',
          firstName: 'Update',
          lastName: 'Test'
        })

        const updateData = {
          firstName: 'Updated',
          preferences: { theme: 'dark', notifications: true }
        }

        // Validate update request
        const updateValidation = createValidationTester(updateUserSchema)
        const validationResult = await updateValidation.testValidationCase({
          name: 'Valid user update request',
          input: updateData,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Update user
        const updatedUser = await userService.updateUser(user.id, updateData)
        expect(updatedUser.firstName).toBe('Updated')
        expect(updatedUser.preferences).toEqual(updateData.preferences)

        // Validate response
        const responseValidation = createValidationTester(userResponseSchema)
        const responseResult = await responseValidation.testValidationCase({
          name: 'User update response',
          input: updatedUser,
          expected: { success: true }
        })
        expect(responseResult.success).toBe(true)
      })

      it('should handle partial updates correctly', async () => {
        const user = await userService.createUser({
          clerkUserId: 'clerk_partial_update',
          email: 'partial@example.com',
          firstName: 'Partial',
          lastName: 'Update'
        })

        // Test updating only firstName
        const partialUpdate1 = { firstName: 'NewFirst' }
        const result1 = await userService.updateUser(user.id, partialUpdate1)
        expect(result1.firstName).toBe('NewFirst')
        expect(result1.lastName).toBe('Update') // Should remain unchanged

        // Test updating only preferences
        const partialUpdate2 = { preferences: { theme: 'light' } }
        const result2 = await userService.updateUser(user.id, partialUpdate2)
        expect(result2.preferences).toEqual({ theme: 'light' })
        expect(result2.firstName).toBe('NewFirst') // Should remain from previous update
      })
    })

    describe('GET /api/users - List Users', () => {
      it('should validate pagination parameters', async () => {
        // Create test users
        await Promise.all([
          userService.createUser({
            clerkUserId: 'clerk_list_1',
            email: 'list1@example.com',
            firstName: 'List1',
            lastName: 'User'
          }),
          userService.createUser({
            clerkUserId: 'clerk_list_2',
            email: 'list2@example.com',
            firstName: 'List2',
            lastName: 'User'
          })
        ])

        const paginationParams = {
          page: 1,
          limit: 10,
          offset: 0
        }

        // Validate pagination parameters
        const paginationValidation = createValidationTester(paginationSchema)
        const validationResult = await paginationValidation.testValidationCase({
          name: 'Valid pagination parameters',
          input: paginationParams,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Test invalid pagination
        const invalidPagination = {
          page: 0, // Invalid: must be >= 1
          limit: 1000 // Invalid: exceeds maximum
        }

        const invalidResult = await paginationValidation.testValidationCase({
          name: 'Invalid pagination parameters',
          input: invalidPagination,
          expected: { 
            success: false,
            errorCodes: ['too_small', 'too_big']
          }
        })
        expect(invalidResult.success).toBe(false)
      })

      it('should validate search parameters', async () => {
        const searchParams = {
          query: 'test user',
          sortBy: 'createdAt',
          sortOrder: 'desc' as const,
          page: 1,
          limit: 20
        }

        const searchValidation = createValidationTester(searchSchema)
        const validationResult = await searchValidation.testValidationCase({
          name: 'Valid search parameters',
          input: searchParams,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Test invalid search parameters
        const invalidSearch = {
          query: 'a'.repeat(300), // Too long
          sortBy: 'name',
          sortOrder: 'invalid' // Invalid enum value
        }

        const invalidResult = await searchValidation.testValidationCase({
          name: 'Invalid search parameters',
          input: invalidSearch,
          expected: { 
            success: false,
            errorCodes: ['too_big', 'invalid_enum_value']
          }
        })
        expect(invalidResult.success).toBe(false)
      })
    })
  })

  describe('Organization API Validation Integration', () => {
    describe('POST /api/organizations - Create Organization', () => {
      it('should validate and create organization with valid data', async () => {
        const validOrgData = {
          name: 'API Test Organization',
          slug: 'api-test-org',
          description: 'An organization created through API'
        }

        // Validate request
        const requestValidation = createValidationTester(createOrganizationSchema)
        const validationResult = await requestValidation.testValidationCase({
          name: 'Valid organization creation request',
          input: validOrgData,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Create organization
        const createdOrg = await organizationService.createOrganization(validOrgData)
        expect(createdOrg.name).toBe(validOrgData.name)
        expect(createdOrg.slug).toBe(validOrgData.slug)

        // Validate response
        const responseValidation = createValidationTester(organizationResponseSchema)
        const responseResult = await responseValidation.testValidationCase({
          name: 'Organization creation response',
          input: createdOrg,
          expected: { success: true }
        })
        expect(responseResult.success).toBe(true)
      })

      it('should handle slug validation errors', async () => {
        const invalidOrgData = {
          name: 'Invalid Slug Org',
          slug: 'Invalid Slug!', // Invalid: contains spaces and special characters
          description: 'Organization with invalid slug'
        }

        const requestValidation = createValidationTester(createOrganizationSchema)
        const validationResult = await requestValidation.testValidationCase({
          name: 'Invalid organization slug',
          input: invalidOrgData,
          expected: { 
            success: false,
            errorCodes: ['invalid_string']
          }
        })
        expect(validationResult.success).toBe(false)

        // Service should also reject invalid data
        await expect(organizationService.createOrganization(invalidOrgData as any))
          .rejects.toThrow()
      })
    })

    describe('PUT /api/organizations/[id] - Update Organization', () => {
      it('should validate organization updates', async () => {
        // Create organization first
        const org = await organizationService.createOrganization({
          name: 'Update Test Org',
          slug: 'update-test-org'
        })

        const updateData = {
          description: 'Updated description',
          settings: { public: true, allowInvitations: false }
        }

        // Validate update request
        const updateValidation = createValidationTester(updateOrganizationSchema)
        const validationResult = await updateValidation.testValidationCase({
          name: 'Valid organization update',
          input: updateData,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Update organization
        const updatedOrg = await organizationService.updateOrganization(org.id, updateData)
        expect(updatedOrg.description).toBe(updateData.description)
        expect(updatedOrg.settings).toEqual(updateData.settings)
      })
    })
  })

  describe('Error Response Validation', () => {
    it('should format validation errors consistently', async () => {
      const invalidData = {
        clerkUserId: '',
        email: 'not-an-email',
        firstName: 'Valid',
        lastName: ''
      }

      try {
        await userService.createUser(invalidData as any)
      } catch (error: any) {
        // Test that error is properly formatted
        expect(error).toBeDefined()
        
        // If it's a validation error, it should have structured details
        if (error.name === 'ValidationError') {
          expect(error.details).toBeDefined()
          expect(Array.isArray(error.details)).toBe(true)
          
          error.details.forEach((detail: any) => {
            expect(detail).toHaveProperty('field')
            expect(detail).toHaveProperty('message')
            expect(detail).toHaveProperty('code')
          })
        }
      }
    })

    it('should handle different error types appropriately', async () => {
      // Test not found error
      await expect(userService.getUserById('non-existent-id'))
        .rejects.toThrow()

      // Test duplicate error
      const userData = {
        clerkUserId: 'clerk_error_test',
        email: 'error@example.com',
        firstName: 'Error',
        lastName: 'Test'
      }

      await userService.createUser(userData)
      
      await expect(userService.createUser(userData))
        .rejects.toThrow()
    })
  })

  describe('Performance Testing for API Operations', () => {
    it('should handle API validation performance efficiently', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        clerkUserId: `clerk_perf_${i}`,
        email: `perf${i}@example.com`,
        firstName: `Perf${i}`,
        lastName: 'User'
      }))

      const startTime = performance.now()

      // Validate all requests
      const validationTester = createValidationTester(createUserSchema)
      const validationPromises = testData.map(data =>
        validationTester.testValidationCase({
          name: `Performance test ${data.clerkUserId}`,
          input: data,
          expected: { success: true }
        })
      )

      const validationResults = await Promise.all(validationPromises)
      const validationTime = performance.now() - startTime

      expect(validationResults.every(result => result.success)).toBe(true)
      expect(validationTime).toBeLessThan(1000) // Should validate 100 requests within 1 second

      console.log(`API validation performance (100 requests): ${validationTime.toFixed(2)}ms`)
    })

    it('should handle concurrent API operations efficiently', async () => {
      const concurrentRequests = 50
      const startTime = performance.now()

      // Create concurrent user creation requests
      const userPromises = Array.from({ length: concurrentRequests }, (_, i) =>
        userService.createUser({
          clerkUserId: `clerk_concurrent_api_${i}`,
          email: `concurrent_api_${i}@example.com`,
          firstName: `Concurrent${i}`,
          lastName: 'API'
        })
      )

      const users = await Promise.all(userPromises)
      const totalTime = performance.now() - startTime

      expect(users).toHaveLength(concurrentRequests)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

      console.log(`Concurrent API operations (${concurrentRequests} users): ${totalTime.toFixed(2)}ms`)
    })

    it('should handle complex validation scenarios efficiently', async () => {
      const complexData = {
        clerkUserId: 'clerk_complex_validation',
        email: 'complex@example.com',
        firstName: 'Complex',
        lastName: 'Validation',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
          timezone: 'UTC',
          features: {
            beta: true,
            analytics: false,
            marketing: true
          },
          customSettings: {
            dashboard: { layout: 'grid', itemsPerPage: 20 },
            profile: { visibility: 'public', showEmail: false }
          }
        }
      }

      const iterations = 1000
      const startTime = performance.now()

      // Run validation many times to test performance
      const validationTester = createValidationTester(createUserSchema)
      for (let i = 0; i < iterations; i++) {
        const result = await validationTester.testValidationCase({
          name: `Complex validation ${i}`,
          input: complexData,
          expected: { success: true }
        })
        expect(result.success).toBe(true)
      }

      const totalTime = performance.now() - startTime
      const averageTime = totalTime / iterations

      expect(averageTime).toBeLessThan(1) // Should average less than 1ms per validation

      console.log(`Complex validation performance (${iterations} iterations): ${averageTime.toFixed(4)}ms avg`)
    })
  })

  describe('Request/Response Cycle Integration', () => {
    it('should handle complete request/response cycle with validation', async () => {
      // Simulate complete API request cycle
      const requestData = {
        clerkUserId: 'clerk_full_cycle',
        email: 'fullcycle@example.com',
        firstName: 'Full',
        lastName: 'Cycle'
      }

      // 1. Validate incoming request
      const requestValidation = createValidationTester(createUserSchema)
      const requestResult = await requestValidation.testValidationCase({
        name: 'Full cycle request validation',
        input: requestData,
        expected: { success: true }
      })
      expect(requestResult.success).toBe(true)

      // 2. Process request through service layer
      const createdUser = await userService.createUser(requestData)
      expect(createdUser).toBeDefined()

      // 3. Validate service response
      const serviceValidation = createValidationTester(userResponseSchema)
      const serviceResult = await serviceValidation.testValidationCase({
        name: 'Service response validation',
        input: createdUser,
        expected: { success: true }
      })
      expect(serviceResult.success).toBe(true)

      // 4. Validate API response wrapper
      const apiResponse = {
        success: true,
        data: createdUser,
        message: 'User created successfully'
      }

      const apiValidation = createValidationTester(apiResponseSchema(userResponseSchema))
      const apiResult = await apiValidation.testValidationCase({
        name: 'API response wrapper validation',
        input: apiResponse,
        expected: { success: true }
      })
      expect(apiResult.success).toBe(true)

      // 5. Test subsequent operations (update, retrieve, delete)
      const updateData = { firstName: 'Updated' }
      const updatedUser = await userService.updateUser(createdUser.id, updateData)
      
      const updateValidation = createValidationTester(userResponseSchema)
      const updateResult = await updateValidation.testValidationCase({
        name: 'Update response validation',
        input: updatedUser,
        expected: { success: true }
      })
      expect(updateResult.success).toBe(true)
    })
  })
})