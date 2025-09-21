/**
 * Zod Validation Framework Tests
 * 
 * Comprehensive tests for Zod validation testing framework including:
 * - Validation schema testing
 * - Error handling and formatting
 * - Schema composition and transformation
 * - Performance testing utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  ValidationErrorFormatter,
  SchemaValidationTester,
  SchemaCompositionTester,
  ValidationPerformanceTester,
  MockValidationUtils,
  ValidationTestDataGenerator,
  ValidationTestSuiteBuilder,
  createValidationTester,
  createTestSuiteBuilder
} from '../setup/zod-testing-framework'

describe('Zod Validation Framework', () => {
  describe('ValidationErrorFormatter', () => {
    it('should format Zod errors correctly', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          path: ['email'],
          message: 'String must contain at least 1 character(s)'
        }
      ])

      const formatted = ValidationErrorFormatter.formatZodError(zodError)

      expect(formatted.codes).toEqual(['invalid_type', 'too_small'])
      expect(formatted.paths).toEqual([['name'], ['email']])
      expect(formatted.messages).toEqual([
        'Expected string, received number',
        'String must contain at least 1 character(s)'
      ])
      expect(formatted.fieldErrors).toEqual({
        'name': ['Expected string, received number'],
        'email': ['String must contain at least 1 character(s)']
      })
    })

    it('should create expected error structure', () => {
      const expectedError = ValidationErrorFormatter.createExpectedError(
        'email',
        'invalid_string',
        'Invalid email format'
      )

      expect(expectedError).toEqual({
        path: ['email'],
        code: 'invalid_string',
        message: 'Invalid email format'
      })
    })

    it('should handle array paths', () => {
      const expectedError = ValidationErrorFormatter.createExpectedError(
        ['user', 'profile', 'email'],
        'invalid_string',
        'Invalid email format'
      )

      expect(expectedError.path).toEqual(['user', 'profile', 'email'])
    })

    it('should assert error matches expected structure', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ])

      const expected = [
        ValidationErrorFormatter.createExpectedError(
          'name',
          'invalid_type',
          'Expected string, received number'
        )
      ]

      expect(() => {
        ValidationErrorFormatter.assertErrorMatches(zodError, expected)
      }).not.toThrow()
    })

    it('should throw when error does not match expected structure', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ])

      const expected = [
        ValidationErrorFormatter.createExpectedError(
          'email', // Wrong path
          'invalid_type',
          'Expected string, received number'
        )
      ]

      expect(() => {
        ValidationErrorFormatter.assertErrorMatches(zodError, expected)
      }).toThrow()
    })
  })

  describe('SchemaValidationTester', () => {
    let schema: z.ZodSchema
    let tester: SchemaValidationTester

    beforeEach(() => {
      schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0).max(120)
      })
      tester = new SchemaValidationTester(schema)
    })

    it('should test valid validation case', async () => {
      const testCase = {
        name: 'Valid user data',
        input: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        },
        expected: {
          success: true
        }
      }

      const result = await tester.testValidationCase(testCase)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(testCase.input)
      expect(result.performance).toBeDefined()
      expect(result.performance!.duration).toBeGreaterThan(0)
    })

    it('should test invalid validation case', async () => {
      const testCase = {
        name: 'Invalid user data',
        input: {
          name: '',
          email: 'invalid-email',
          age: -5
        },
        expected: {
          success: false,
          errorCodes: ['too_small', 'invalid_string', 'too_small']
        }
      }

      const result = await tester.testValidationCase(testCase)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.performance).toBeDefined()
    })

    it('should run comprehensive validation tests', async () => {
      const testSuite = {
        schema,
        validCases: [
          {
            name: 'Valid case 1',
            input: { name: 'John', email: 'john@example.com', age: 25 },
            expected: { success: true }
          }
        ],
        invalidCases: [
          {
            name: 'Invalid case 1',
            input: { name: '', email: 'invalid', age: -1 },
            expected: { success: false, errorCodes: ['too_small'] }
          }
        ],
        edgeCases: [
          {
            name: 'Edge case 1',
            input: { name: 'A', email: 'a@b.co', age: 0 },
            expected: { success: true }
          }
        ],
        performanceThreshold: 10
      }

      const results = await tester.runValidationTests(testSuite)

      expect(results.validTests).toHaveLength(1)
      expect(results.invalidTests).toHaveLength(1)
      expect(results.edgeTests).toHaveLength(1)
      expect(results.performanceResults).toBeDefined()
      expect(results.performanceResults.totalTests).toBe(3)
    })
  })

  describe('SchemaCompositionTester', () => {
    it('should test schema composition', () => {
      const baseSchema = z.object({
        name: z.string(),
        email: z.string().email()
      })

      const extensionSchema = z.object({
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
        baseSchema,
        extensionSchema,
        testData
      )

      // Base schema should pass since it only requires name and email
      expect(results.baseResult.success).toBe(true)
      expect(results.extendedResult.success).toBe(true)
      expect(results.mergedResult.success).toBe(true)
    })

    it('should test schema transformation', () => {
      const schema = z.object({
        firstName: z.string(),
        lastName: z.string()
      })

      const transformer = (data: { firstName: string; lastName: string }) => ({
        fullName: `${data.firstName} ${data.lastName}`
      })

      const testData = {
        firstName: 'John',
        lastName: 'Doe'
      }

      const result = SchemaCompositionTester.testSchemaTransformation(
        schema,
        transformer,
        testData
      )

      expect(result.validationResult.success).toBe(true)
      expect(result.transformationResult).toEqual({ fullName: 'John Doe' })
      expect(result.error).toBeUndefined()
    })

    it('should handle transformation errors', () => {
      const schema = z.object({
        value: z.number()
      })

      const transformer = (data: { value: number }) => {
        if (data.value < 0) {
          throw new Error('Value cannot be negative')
        }
        return { result: data.value * 2 }
      }

      const testData = { value: -5 }

      const result = SchemaCompositionTester.testSchemaTransformation(
        schema,
        transformer,
        testData
      )

      expect(result.validationResult.success).toBe(true)
      expect(result.transformationResult).toBeUndefined()
      expect(result.error).toBeDefined()
      expect(result.error!.message).toBe('Value cannot be negative')
    })

    it('should test schema refinement', () => {
      const baseSchema = z.object({
        password: z.string().min(8),
        confirmPassword: z.string()
      })

      const refinement = (data: { password: string; confirmPassword: string }) =>
        data.password === data.confirmPassword

      const validData = {
        password: 'password123',
        confirmPassword: 'password123'
      }

      const invalidData = {
        password: 'password123',
        confirmPassword: 'different'
      }

      const validResult = SchemaCompositionTester.testSchemaRefinement(
        baseSchema,
        refinement,
        'Passwords must match',
        validData
      )

      const invalidResult = SchemaCompositionTester.testSchemaRefinement(
        baseSchema,
        refinement,
        'Passwords must match',
        invalidData
      )

      expect(validResult.success).toBe(true)
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('ValidationPerformanceTester', () => {
    it('should benchmark schema performance', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number()
      })

      const testData = [
        { name: 'John', email: 'john@example.com', age: 30 },
        { name: 'Jane', email: 'jane@example.com', age: 25 },
        { name: 'Bob', email: 'bob@example.com', age: 35 }
      ]

      const results = await ValidationPerformanceTester.benchmarkSchema(
        schema,
        testData,
        100 // Small number for test speed
      )

      expect(results.totalTime).toBeGreaterThan(0)
      expect(results.averageTime).toBeGreaterThan(0)
      expect(results.operationsPerSecond).toBeGreaterThan(0)
      expect(results.minTime).toBeGreaterThanOrEqual(0)
      expect(results.maxTime).toBeGreaterThanOrEqual(results.minTime)
    })

    it('should compare schema performance', async () => {
      const simpleSchema = z.object({
        name: z.string()
      })

      const complexSchema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        age: z.number().min(0).max(120),
        profile: z.object({
          bio: z.string().optional(),
          website: z.string().url().optional()
        }).optional()
      })

      const testData = [
        { name: 'John', email: 'john@example.com', age: 30 }
      ]

      const results = await ValidationPerformanceTester.compareSchemaPerformance(
        [
          { name: 'Simple', schema: simpleSchema },
          { name: 'Complex', schema: complexSchema }
        ],
        testData,
        50 // Small number for test speed
      )

      expect(results.results).toHaveLength(2)
      expect(results.fastest).toBeDefined()
      expect(results.slowest).toBeDefined()
      expect(['Simple', 'Complex']).toContain(results.fastest)
      expect(['Simple', 'Complex']).toContain(results.slowest)
    })
  })

  describe('MockValidationUtils', () => {
    it('should create mock success schema', () => {
      const returnValue = { id: 1, name: 'Test' }
      const mockSchema = MockValidationUtils.createMockSuccessSchema(returnValue)

      const result = mockSchema.safeParse({ anything: 'goes' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(returnValue)
      }

      const parseResult = mockSchema.parse({ anything: 'goes' })
      expect(parseResult).toEqual(returnValue)
    })

    it('should create mock failure schema', () => {
      const errors = [
        {
          code: 'invalid_type' as const,
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ]

      const mockSchema = MockValidationUtils.createMockFailureSchema(errors)

      const result = mockSchema.safeParse({ name: 123 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toEqual(errors)
      }

      expect(() => mockSchema.parse({ name: 123 })).toThrow()
    })

    it('should create mock schema with custom behavior', () => {
      const behavior = (input: any) => {
        if (input.valid) {
          return { success: true, data: input }
        } else {
          return {
            success: false,
            error: new z.ZodError([
              {
                code: 'custom',
                path: [],
                message: 'Custom validation failed'
              }
            ])
          }
        }
      }

      const mockSchema = MockValidationUtils.createMockSchemaWithBehavior(behavior)

      const validResult = mockSchema.safeParse({ valid: true })
      expect(validResult.success).toBe(true)

      const invalidResult = mockSchema.safeParse({ valid: false })
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('ValidationTestDataGenerator', () => {
    it('should generate string test data', () => {
      const data = ValidationTestDataGenerator.generateStringTestData()

      expect(data.valid).toBeInstanceOf(Array)
      expect(data.invalid).toBeInstanceOf(Array)
      expect(data.edge).toBeInstanceOf(Array)

      expect(data.valid.length).toBeGreaterThan(0)
      expect(data.invalid.length).toBeGreaterThan(0)
      expect(data.edge.length).toBeGreaterThan(0)

      // Check that valid data contains strings
      data.valid.forEach(item => {
        expect(typeof item).toBe('string')
      })

      // Check that invalid data contains non-strings
      expect(data.invalid).toContain(null)
      expect(data.invalid).toContain(undefined)
      expect(data.invalid).toContain(123)
    })

    it('should generate number test data', () => {
      const data = ValidationTestDataGenerator.generateNumberTestData()

      expect(data.valid).toBeInstanceOf(Array)
      expect(data.invalid).toBeInstanceOf(Array)
      expect(data.edge).toBeInstanceOf(Array)

      // Check that valid data contains numbers
      data.valid.forEach(item => {
        expect(typeof item).toBe('number')
        expect(Number.isNaN(item)).toBe(false)
      })

      // Check that invalid data contains non-numbers
      expect(data.invalid).toContain(null)
      expect(data.invalid).toContain('string')
      // NaN is included in the edge cases, not invalid
    })

    it('should generate email test data', () => {
      const data = ValidationTestDataGenerator.generateEmailTestData()

      expect(data.valid).toBeInstanceOf(Array)
      expect(data.invalid).toBeInstanceOf(Array)
      expect(data.edge).toBeInstanceOf(Array)

      // Check that valid emails contain @ symbol
      data.valid.forEach(email => {
        expect(email).toContain('@')
        expect(email).toContain('.')
      })

      // Check that invalid emails are malformed
      expect(data.invalid).toContain('invalid-email')
      expect(data.invalid).toContain('@example.com')
    })

    it('should generate UUID test data', () => {
      const data = ValidationTestDataGenerator.generateUUIDTestData()

      expect(data.valid).toBeInstanceOf(Array)
      expect(data.invalid).toBeInstanceOf(Array)
      expect(data.edge).toBeInstanceOf(Array)

      // Check that valid UUIDs have correct format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      data.valid.forEach(uuid => {
        expect(uuid).toMatch(uuidRegex)
      })

      // Check that invalid UUIDs don't match format
      expect(data.invalid).toContain('not-a-uuid')
      expect(data.invalid).toContain('')
    })
  })

  describe('ValidationTestSuiteBuilder', () => {
    it('should build test suite with all components', () => {
      const schema = z.string().email()
      
      const builder = new ValidationTestSuiteBuilder(schema)
      const testSuite = builder
        .addValidCases([
          {
            name: 'Valid email',
            input: 'test@example.com',
            expected: { success: true }
          }
        ])
        .addInvalidCases([
          {
            name: 'Invalid email',
            input: 'invalid-email',
            expected: { success: false, errorCodes: ['invalid_string'] }
          }
        ])
        .addEdgeCases([
          {
            name: 'Edge case email',
            input: 'a@b.co',
            expected: { success: true }
          }
        ])
        .setPerformanceThreshold(5)
        .build()

      expect(testSuite.schema).toBe(schema)
      expect(testSuite.validCases).toHaveLength(1)
      expect(testSuite.invalidCases).toHaveLength(1)
      expect(testSuite.edgeCases).toHaveLength(1)
      expect(testSuite.performanceThreshold).toBe(5)
    })

    it('should handle empty test cases', () => {
      const schema = z.string()
      const builder = new ValidationTestSuiteBuilder(schema)
      const testSuite = builder.build()

      expect(testSuite.validCases).toHaveLength(0)
      expect(testSuite.invalidCases).toHaveLength(0)
      expect(testSuite.edgeCases).toHaveLength(0)
    })
  })

  describe('Helper Functions', () => {
    it('should create validation tester', () => {
      const schema = z.string()
      const tester = createValidationTester(schema)

      expect(tester).toBeInstanceOf(SchemaValidationTester)
    })

    it('should create test suite builder', () => {
      const schema = z.string()
      const builder = createTestSuiteBuilder(schema)

      expect(builder).toBeInstanceOf(ValidationTestSuiteBuilder)
    })
  })

  describe('Error Handling', () => {
    it('should handle schema parsing errors gracefully', async () => {
      const schema = z.object({
        name: z.string()
      })

      const tester = new SchemaValidationTester(schema)
      
      const testCase = {
        name: 'Invalid input',
        input: { name: 123 },
        expected: { success: false }
      }

      const result = await tester.testValidationCase(testCase)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should handle performance testing errors', async () => {
      const schema = z.string()
      const testData = ['valid', 'data']

      // This should not throw even with minimal iterations
      const results = await ValidationPerformanceTester.benchmarkSchema(
        schema,
        testData,
        1
      )

      expect(results).toBeDefined()
      expect(results.totalTime).toBeGreaterThanOrEqual(0)
    })
  })
})