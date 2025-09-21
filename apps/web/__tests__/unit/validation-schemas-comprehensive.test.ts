/**
 * Comprehensive Validation Schemas Tests
 * 
 * This file provides comprehensive tests for all validation schemas including:
 * - User validation schemas
 * - Organization validation schemas
 * - Role and permission validation schemas
 * - Content validation schemas
 * - Invitation validation schemas
 * - Business rule validation schemas
 * - Common validation utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  createValidationTester,
  createTestSuiteBuilder,
  ValidationTestDataGenerator,
  ValidationPerformanceTester,
  SchemaCompositionTester
} from '../setup/zod-testing-framework'

// Import all validation schemas
import {
  // User schemas
  createUserSchema,
  updateUserSchema,
  userResponseSchema,
  userPreferencesSchema,
  
  // Organization schemas
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationResponseSchema,
  organizationMembershipSchema,
  
  // Role schemas
  createRoleSchema,
  updateRoleSchema,
  roleResponseSchema,
  permissionSchema,
  
  // Content schemas
  createContentSchema,
  updateContentSchema,
  contentResponseSchema,
  onboardingStepSchema,
  
  // Invitation schemas
  createInvitationSchema,
  invitationResponseSchema,
  teamInvitationSchema,
  
  // Business rule schemas
  businessRuleSchema,
  validationRuleSchema,
  
  // Common schemas
  uuidSchema,
  emailSchema,
  urlSchema,
  paginationSchema,
  searchSchema,
  successResponseSchema,
  errorResponseSchema,
  apiResponseSchema,
  safeValidate,
  createSuccessResponse,
  createErrorResponse
} from '@/lib/validation/schemas'

describe('Validation Schemas Comprehensive Tests', () => {
  describe('User Validation Schemas', () => {
    describe('createUserSchema', () => {
      it('should validate correct user creation data', async () => {
        const tester = createValidationTester(createUserSchema)
        
        const testSuite = createTestSuiteBuilder(createUserSchema)
          .addValidCases([
            {
              name: 'Complete user data',
              input: {
                clerkUserId: 'clerk_user_123',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                preferences: { theme: 'dark' }
              },
              expected: { success: true }
            },
            {
              name: 'Minimal user data',
              input: {
                clerkUserId: 'clerk_user_456',
                email: 'minimal@example.com',
                firstName: 'Jane',
                lastName: 'Smith'
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Missing required fields',
              input: {
                email: 'incomplete@example.com'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_type']
              }
            },
            {
              name: 'Invalid email format',
              input: {
                clerkUserId: 'clerk_user_789',
                email: 'invalid-email',
                firstName: 'Bob',
                lastName: 'Wilson'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            },
            {
              name: 'Empty required strings',
              input: {
                clerkUserId: '',
                email: 'empty@example.com',
                firstName: '',
                lastName: 'Test'
              },
              expected: { 
                success: false,
                errorCodes: ['too_small']
              }
            }
          ])
          .setPerformanceThreshold(5)
          .build()
        
        const results = await tester.runValidationTests(testSuite)
        
        expect(results.validTests.every(test => test.success)).toBe(true)
        expect(results.invalidTests.every(test => !test.success)).toBe(true)
        expect(results.performanceResults.averageTime).toBeLessThan(5)
      })
    })

    describe('updateUserSchema', () => {
      it('should validate partial user updates', async () => {
        const tester = createValidationTester(updateUserSchema)
        
        const testSuite = createTestSuiteBuilder(updateUserSchema)
          .addValidCases([
            {
              name: 'Update first name only',
              input: { firstName: 'UpdatedName' },
              expected: { success: true }
            },
            {
              name: 'Update preferences only',
              input: { preferences: { theme: 'light', notifications: true } },
              expected: { success: true }
            },
            {
              name: 'Empty update (all optional)',
              input: {},
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid email in update',
              input: { email: 'invalid-email' },
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            },
            {
              name: 'Empty string for name',
              input: { firstName: '' },
              expected: { 
                success: false,
                errorCodes: ['too_small']
              }
            }
          ])
          .build()
        
        const results = await tester.runValidationTests(testSuite)
        
        expect(results.validTests.every(test => test.success)).toBe(true)
        expect(results.invalidTests.every(test => !test.success)).toBe(true)
      })
    })

    describe('userPreferencesSchema', () => {
      it('should validate user preferences structure', async () => {
        const tester = createValidationTester(userPreferencesSchema)
        
        const testSuite = createTestSuiteBuilder(userPreferencesSchema)
          .addValidCases([
            {
              name: 'Valid preferences',
              input: {
                theme: 'dark',
                notifications: true,
                language: 'en',
                timezone: 'UTC'
              },
              expected: { success: true }
            },
            {
              name: 'Empty preferences',
              input: {},
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid theme value',
              input: { theme: 'invalid-theme' },
              expected: { 
                success: false,
                errorCodes: ['invalid_enum_value']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Organization Validation Schemas', () => {
    describe('createOrganizationSchema', () => {
      it('should validate organization creation data', async () => {
        const tester = createValidationTester(createOrganizationSchema)
        
        const testSuite = createTestSuiteBuilder(createOrganizationSchema)
          .addValidCases([
            {
              name: 'Complete organization data',
              input: {
                name: 'Test Organization',
                slug: 'test-org',
                description: 'A test organization',
                settings: { public: true }
              },
              expected: { success: true }
            },
            {
              name: 'Minimal organization data',
              input: {
                name: 'Minimal Org',
                slug: 'minimal-org'
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Missing required name',
              input: { slug: 'no-name' },
              expected: { 
                success: false,
                errorCodes: ['invalid_type']
              }
            },
            {
              name: 'Invalid slug format',
              input: {
                name: 'Test Org',
                slug: 'Invalid Slug!'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            }
          ])
          .build()
        
        const results = await tester.runValidationTests(testSuite)
        
        expect(results.validTests.every(test => test.success)).toBe(true)
        expect(results.invalidTests.every(test => !test.success)).toBe(true)
      })
    })

    describe('organizationMembershipSchema', () => {
      it('should validate membership data', async () => {
        const tester = createValidationTester(organizationMembershipSchema)
        
        const testSuite = createTestSuiteBuilder(organizationMembershipSchema)
          .addValidCases([
            {
              name: 'Valid membership',
              input: {
                userId: 'user_123',
                organizationId: 'org_456',
                roleId: 'role_789',
                status: 'active'
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid status',
              input: {
                userId: 'user_123',
                organizationId: 'org_456',
                roleId: 'role_789',
                status: 'invalid-status'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_enum_value']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Role and Permission Schemas', () => {
    describe('createRoleSchema', () => {
      it('should validate role creation data', async () => {
        const tester = createValidationTester(createRoleSchema)
        
        const testSuite = createTestSuiteBuilder(createRoleSchema)
          .addValidCases([
            {
              name: 'Valid role with permissions',
              input: {
                name: 'Admin',
                description: 'Administrator role',
                permissions: ['user.read', 'user.write', 'org.manage']
              },
              expected: { success: true }
            },
            {
              name: 'Role without permissions',
              input: {
                name: 'Viewer',
                permissions: []
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Missing name',
              input: {
                permissions: ['user.read']
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_type']
              }
            },
            {
              name: 'Invalid permission format',
              input: {
                name: 'Test Role',
                permissions: ['invalid permission']
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })

    describe('permissionSchema', () => {
      it('should validate permission strings', async () => {
        const tester = createValidationTester(permissionSchema)
        
        const testSuite = createTestSuiteBuilder(permissionSchema)
          .addValidCases([
            {
              name: 'Valid permission format',
              input: 'user.read',
              expected: { success: true }
            },
            {
              name: 'Complex permission',
              input: 'organization.members.write',
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid permission with spaces',
              input: 'user read',
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            },
            {
              name: 'Empty permission',
              input: '',
              expected: { 
                success: false,
                errorCodes: ['too_small']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Content Validation Schemas', () => {
    describe('createContentSchema', () => {
      it('should validate content creation data', async () => {
        const tester = createValidationTester(createContentSchema)
        
        const testSuite = createTestSuiteBuilder(createContentSchema)
          .addValidCases([
            {
              name: 'Complete content data',
              input: {
                title: 'Test Content',
                type: 'onboarding_step',
                content: { text: 'Welcome to our platform!' },
                metadata: { order: 1 }
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Missing title',
              input: {
                type: 'onboarding_step',
                content: { text: 'Content without title' }
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_type']
              }
            },
            {
              name: 'Invalid content type',
              input: {
                title: 'Test',
                type: 'invalid_type',
                content: {}
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_enum_value']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })

    describe('onboardingStepSchema', () => {
      it('should validate onboarding step structure', async () => {
        const tester = createValidationTester(onboardingStepSchema)
        
        const testSuite = createTestSuiteBuilder(onboardingStepSchema)
          .addValidCases([
            {
              name: 'Valid onboarding step',
              input: {
                id: 'step_1',
                title: 'Welcome Step',
                description: 'Introduction to the platform',
                order: 1,
                required: true,
                estimatedDuration: 300
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Negative order',
              input: {
                id: 'step_2',
                title: 'Invalid Step',
                order: -1
              },
              expected: { 
                success: false,
                errorCodes: ['too_small']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Invitation Validation Schemas', () => {
    describe('createInvitationSchema', () => {
      it('should validate invitation creation data', async () => {
        const tester = createValidationTester(createInvitationSchema)
        
        const testSuite = createTestSuiteBuilder(createInvitationSchema)
          .addValidCases([
            {
              name: 'Valid invitation',
              input: {
                email: 'invite@example.com',
                organizationId: 'org_123',
                roleId: 'role_456',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid email',
              input: {
                email: 'invalid-email',
                organizationId: 'org_123',
                roleId: 'role_456'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_string']
              }
            },
            {
              name: 'Past expiration date',
              input: {
                email: 'test@example.com',
                organizationId: 'org_123',
                roleId: 'role_456',
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              },
              expected: { 
                success: false,
                errorCodes: ['custom']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Business Rule Schemas', () => {
    describe('businessRuleSchema', () => {
      it('should validate business rule structure', async () => {
        const tester = createValidationTester(businessRuleSchema)
        
        const testSuite = createTestSuiteBuilder(businessRuleSchema)
          .addValidCases([
            {
              name: 'Valid business rule',
              input: {
                name: 'User Registration Rule',
                description: 'Rules for user registration',
                conditions: [
                  { field: 'email', operator: 'required' },
                  { field: 'age', operator: 'gte', value: 18 }
                ],
                actions: [
                  { type: 'validate', target: 'email' },
                  { type: 'notify', target: 'admin' }
                ]
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid operator',
              input: {
                name: 'Invalid Rule',
                conditions: [
                  { field: 'email', operator: 'invalid_operator' }
                ],
                actions: []
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_enum_value']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })
  })

  describe('Common Validation Schemas', () => {
    describe('Basic Type Schemas', () => {
      it('should validate UUID format', async () => {
        const testData = ValidationTestDataGenerator.generateUUIDTestData()
        
        for (const validUuid of testData.valid) {
          const result = uuidSchema.safeParse(validUuid)
          expect(result.success).toBe(true)
        }
        
        for (const invalidUuid of testData.invalid) {
          const result = uuidSchema.safeParse(invalidUuid)
          expect(result.success).toBe(false)
        }
      })

      it('should validate email format', async () => {
        const testData = ValidationTestDataGenerator.generateEmailTestData()
        
        for (const validEmail of testData.valid) {
          const result = emailSchema.safeParse(validEmail)
          expect(result.success).toBe(true)
        }
        
        for (const invalidEmail of testData.invalid) {
          const result = emailSchema.safeParse(invalidEmail)
          expect(result.success).toBe(false)
        }
      })

      it('should validate URL format', async () => {
        const validUrls = [
          'https://example.com',
          'http://localhost:3000',
          'https://subdomain.example.co.uk/path?query=value'
        ]
        
        const invalidUrls = [
          'not-a-url',
          'ftp://example.com', // Only http/https allowed
          'example.com', // Missing protocol
          ''
        ]
        
        for (const validUrl of validUrls) {
          const result = urlSchema.safeParse(validUrl)
          expect(result.success).toBe(true)
        }
        
        for (const invalidUrl of invalidUrls) {
          const result = urlSchema.safeParse(invalidUrl)
          expect(result.success).toBe(false)
        }
      })
    })

    describe('Pagination Schema', () => {
      it('should validate pagination parameters', async () => {
        const tester = createValidationTester(paginationSchema)
        
        const testSuite = createTestSuiteBuilder(paginationSchema)
          .addValidCases([
            {
              name: 'Default pagination',
              input: {},
              expected: { 
                success: true,
                transformedData: { page: 1, limit: 20, offset: 0 }
              }
            },
            {
              name: 'Custom pagination',
              input: { page: 2, limit: 50 },
              expected: { 
                success: true,
                transformedData: { page: 2, limit: 50, offset: 50 }
              }
            }
          ])
          .addInvalidCases([
            {
              name: 'Invalid page number',
              input: { page: 0 },
              expected: { 
                success: false,
                errorCodes: ['too_small']
              }
            },
            {
              name: 'Limit too large',
              input: { limit: 1000 },
              expected: { 
                success: false,
                errorCodes: ['too_big']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })

    describe('Search Schema', () => {
      it('should validate search parameters', async () => {
        const tester = createValidationTester(searchSchema)
        
        const testSuite = createTestSuiteBuilder(searchSchema)
          .addValidCases([
            {
              name: 'Search with query',
              input: {
                query: 'test search',
                sortBy: 'createdAt',
                sortOrder: 'desc'
              },
              expected: { success: true }
            },
            {
              name: 'Search with filters',
              input: {
                filters: { status: 'active', type: 'user' },
                sortBy: 'name'
              },
              expected: { success: true }
            }
          ])
          .addInvalidCases([
            {
              name: 'Query too long',
              input: {
                query: 'a'.repeat(300),
                sortBy: 'name'
              },
              expected: { 
                success: false,
                errorCodes: ['too_big']
              }
            },
            {
              name: 'Invalid sort order',
              input: {
                sortBy: 'name',
                sortOrder: 'invalid'
              },
              expected: { 
                success: false,
                errorCodes: ['invalid_enum_value']
              }
            }
          ])
          .build()
        
        await tester.runValidationTests(testSuite)
      })
    })

    describe('API Response Schemas', () => {
      it('should validate success response format', () => {
        const userDataSchema = z.object({
          id: z.string(),
          name: z.string()
        })
        
        const successSchema = successResponseSchema(userDataSchema)
        
        const validResponse = {
          success: true,
          data: { id: '1', name: 'John' },
          message: 'User retrieved successfully'
        }
        
        const result = successSchema.safeParse(validResponse)
        expect(result.success).toBe(true)
      })

      it('should validate error response format', () => {
        const validError = {
          success: false,
          error: 'Validation failed',
          details: [
            { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
          ],
          code: 'VALIDATION_ERROR'
        }
        
        const result = errorResponseSchema.safeParse(validError)
        expect(result.success).toBe(true)
      })

      it('should validate API response union', () => {
        const userDataSchema = z.object({ id: z.string() })
        const apiSchema = apiResponseSchema(userDataSchema)
        
        const successResponse = {
          success: true,
          data: { id: '1' }
        }
        
        const errorResponse = {
          success: false,
          error: 'Not found'
        }
        
        expect(apiSchema.safeParse(successResponse).success).toBe(true)
        expect(apiSchema.safeParse(errorResponse).success).toBe(true)
      })
    })
  })

  describe('Schema Composition and Transformation', () => {
    it('should test schema extension', () => {
      const baseUserSchema = z.object({
        name: z.string(),
        email: z.string().email()
      })
      
      const extendedUserSchema = z.object({
        age: z.number(),
        active: z.boolean()
      })
      
      const testData = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
        active: true
      }
      
      const results = SchemaCompositionTester.testSchemaComposition(
        baseUserSchema,
        extendedUserSchema,
        testData
      )
      
      expect(results.baseResult.success).toBe(false) // Missing age and active
      expect(results.extendedResult.success).toBe(true)
      expect(results.mergedResult.success).toBe(true)
    })

    it('should test schema transformation', () => {
      const inputSchema = z.object({
        firstName: z.string(),
        lastName: z.string()
      })
      
      const transformer = (data: { firstName: string; lastName: string }) => ({
        fullName: `${data.firstName} ${data.lastName}`,
        initials: `${data.firstName[0]}${data.lastName[0]}`
      })
      
      const testData = { firstName: 'John', lastName: 'Doe' }
      
      const result = SchemaCompositionTester.testSchemaTransformation(
        inputSchema,
        transformer,
        testData
      )
      
      expect(result.validationResult.success).toBe(true)
      expect(result.transformationResult).toEqual({
        fullName: 'John Doe',
        initials: 'JD'
      })
    })
  })

  describe('Validation Utilities', () => {
    describe('safeValidate', () => {
      it('should safely validate data', () => {
        const schema = z.object({
          name: z.string().min(1),
          age: z.number().min(0)
        })
        
        const validData = { name: 'John', age: 30 }
        const invalidData = { name: '', age: -5 }
        
        const validResult = safeValidate(schema, validData)
        expect(validResult.success).toBe(true)
        expect(validResult.data).toEqual(validData)
        
        const invalidResult = safeValidate(schema, invalidData)
        expect(invalidResult.success).toBe(false)
        expect(invalidResult.error).toBe('Validation failed')
        expect(invalidResult.details).toBeDefined()
        expect(invalidResult.details!.length).toBeGreaterThan(0)
      })
    })

    describe('Response Helpers', () => {
      it('should create success response', () => {
        const data = { id: '1', name: 'Test' }
        const response = createSuccessResponse(data, 'Success message')
        
        expect(response).toEqual({
          success: true,
          data,
          message: 'Success message'
        })
      })

      it('should create error response', () => {
        const details = [
          { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
        ]
        
        const response = createErrorResponse(
          'Validation failed',
          details,
          'VALIDATION_ERROR'
        )
        
        expect(response).toEqual({
          success: false,
          error: 'Validation failed',
          details,
          code: 'VALIDATION_ERROR'
        })
      })
    })
  })

  describe('Performance Testing', () => {
    it('should benchmark validation performance', async () => {
      const schemas = [
        { name: 'Simple String', schema: z.string() },
        { name: 'Email', schema: emailSchema },
        { name: 'UUID', schema: uuidSchema },
        { name: 'Complex User', schema: createUserSchema }
      ]
      
      const testData = [
        'test string',
        'test@example.com',
        '123e4567-e89b-12d3-a456-426614174000',
        {
          clerkUserId: 'clerk_123',
          email: 'perf@example.com',
          firstName: 'Performance',
          lastName: 'Test'
        }
      ]
      
      const results = await ValidationPerformanceTester.compareSchemaPerformance(
        schemas,
        testData,
        100 // Small number for test speed
      )
      
      expect(results.results).toHaveLength(4)
      expect(results.fastest).toBeDefined()
      expect(results.slowest).toBeDefined()
      
      // Simple schemas should generally be faster
      const simpleResult = results.results.find(r => r.name === 'Simple String')
      const complexResult = results.results.find(r => r.name === 'Complex User')
      
      expect(simpleResult).toBeDefined()
      expect(complexResult).toBeDefined()
      
      // Performance should be reasonable (less than 1ms average for simple operations)
      expect(simpleResult!.performance.averageTime).toBeLessThan(1)
    })
  })
})