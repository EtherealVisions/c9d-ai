/**
 * Zod Validation Testing Framework
 * 
 * This file provides comprehensive testing utilities for Zod validation schemas including:
 * - Comprehensive tests for all validation schemas
 * - Error handling and validation error formatting
 * - Test utilities for schema composition and transformation
 * - Performance tests for validation operations
 */

import { z } from 'zod'
import { vi } from 'vitest'
import { expect } from 'vitest'

/**
 * Validation test result interface
 */
export interface ValidationTestResult {
  success: boolean
  data?: any
  errors?: z.ZodError['errors']
  performance?: {
    duration: number
    iterations: number
    averageTime: number
  }
}

/**
 * Test case interface for validation testing
 */
export interface ValidationTestCase {
  name: string
  input: any
  expected: {
    success: boolean
    errorCodes?: string[]
    errorPaths?: string[][]
    transformedData?: any
  }
}

/**
 * Schema test suite interface
 */
export interface SchemaTestSuite {
  schema: z.ZodSchema
  validCases: ValidationTestCase[]
  invalidCases: ValidationTestCase[]
  edgeCases?: ValidationTestCase[]
  performanceThreshold?: number // milliseconds
}

/**
 * Validation error formatter for consistent error testing
 */
export class ValidationErrorFormatter {
  /**
   * Format Zod errors for testing
   */
  static formatZodError(error: z.ZodError): {
    codes: string[]
    paths: string[][]
    messages: string[]
    fieldErrors: Record<string, string[]>
  } {
    const codes = error.errors.map(err => err.code)
    const paths = error.errors.map(err => err.path.map(String))
    const messages = error.errors.map(err => err.message)
    
    const fieldErrors: Record<string, string[]> = {}
    error.errors.forEach(err => {
      const path = err.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(err.message)
    })
    
    return { codes, paths, messages, fieldErrors }
  }
  
  /**
   * Create expected error structure for testing
   */
  static createExpectedError(
    path: string | string[],
    code: string,
    message: string
  ): Partial<z.ZodIssue> {
    return {
      path: Array.isArray(path) ? path : [path],
      code: code as any,
      message
    }
  }
  
  /**
   * Assert error matches expected structure
   */
  static assertErrorMatches(
    actual: z.ZodError,
    expected: Partial<z.ZodIssue>[]
  ): void {
    expect(actual.errors).toHaveLength(expected.length)
    
    expected.forEach((expectedError, index) => {
      const actualError = actual.errors[index]
      
      if (expectedError.path) {
        expect(actualError.path).toEqual(expectedError.path)
      }
      
      if (expectedError.code) {
        expect(actualError.code).toBe(expectedError.code)
      }
      
      if (expectedError.message) {
        expect(actualError.message).toBe(expectedError.message)
      }
    })
  }
}

/**
 * Schema validation tester
 */
export class SchemaValidationTester {
  constructor(private schema: z.ZodSchema) {}
  
  /**
   * Test a single validation case
   */
  async testValidationCase(testCase: ValidationTestCase): Promise<ValidationTestResult> {
    const startTime = performance.now()
    
    try {
      const result = this.schema.safeParse(testCase.input)
      const duration = performance.now() - startTime
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          performance: {
            duration,
            iterations: 1,
            averageTime: duration
          }
        }
      } else {
        const formatted = ValidationErrorFormatter.formatZodError(result.error)
        return {
          success: false,
          errors: result.error.errors,
          performance: {
            duration,
            iterations: 1,
            averageTime: duration
          }
        }
      }
    } catch (error) {
      const duration = performance.now() - startTime
      throw new Error(`Validation test failed: ${error}`)
    }
  }
  
  /**
   * Run comprehensive validation tests
   */
  async runValidationTests(testSuite: SchemaTestSuite): Promise<{
    validTests: ValidationTestResult[]
    invalidTests: ValidationTestResult[]
    edgeTests: ValidationTestResult[]
    performanceResults: {
      averageTime: number
      maxTime: number
      minTime: number
      totalTests: number
    }
  }> {
    const validTests: ValidationTestResult[] = []
    const invalidTests: ValidationTestResult[] = []
    const edgeTests: ValidationTestResult[] = []
    const allTimes: number[] = []
    
    // Test valid cases
    for (const testCase of testSuite.validCases) {
      const result = await this.testValidationCase(testCase)
      validTests.push(result)
      allTimes.push(result.performance!.duration)
      
      // Assert expected success
      expect(result.success).toBe(testCase.expected.success)
      
      if (testCase.expected.transformedData) {
        expect(result.data).toEqual(testCase.expected.transformedData)
      }
    }
    
    // Test invalid cases
    for (const testCase of testSuite.invalidCases) {
      const result = await this.testValidationCase(testCase)
      invalidTests.push(result)
      allTimes.push(result.performance!.duration)
      
      // Assert expected failure
      expect(result.success).toBe(testCase.expected.success)
      
      if (testCase.expected.errorCodes) {
        const formatted = ValidationErrorFormatter.formatZodError(
          new z.ZodError(result.errors!)
        )
        expect(formatted.codes).toEqual(expect.arrayContaining(testCase.expected.errorCodes))
      }
      
      if (testCase.expected.errorPaths) {
        const formatted = ValidationErrorFormatter.formatZodError(
          new z.ZodError(result.errors!)
        )
        testCase.expected.errorPaths.forEach(expectedPath => {
          expect(formatted.paths).toContainEqual(expectedPath)
        })
      }
    }
    
    // Test edge cases
    if (testSuite.edgeCases) {
      for (const testCase of testSuite.edgeCases) {
        const result = await this.testValidationCase(testCase)
        edgeTests.push(result)
        allTimes.push(result.performance!.duration)
      }
    }
    
    // Calculate performance metrics
    const performanceResults = {
      averageTime: allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length,
      maxTime: Math.max(...allTimes),
      minTime: Math.min(...allTimes),
      totalTests: allTimes.length
    }
    
    // Check performance threshold
    if (testSuite.performanceThreshold && performanceResults.averageTime > testSuite.performanceThreshold) {
      console.warn(
        `Schema validation performance warning: Average time ${performanceResults.averageTime}ms exceeds threshold ${testSuite.performanceThreshold}ms`
      )
    }
    
    return {
      validTests,
      invalidTests,
      edgeTests,
      performanceResults
    }
  }
}

/**
 * Schema composition tester for complex schemas
 */
export class SchemaCompositionTester {
  /**
   * Test schema composition (extend, merge, etc.)
   */
  static testSchemaComposition<T extends z.ZodRawShape, U extends z.ZodRawShape>(
    baseSchema: z.ZodObject<T>,
    extensionSchema: z.ZodObject<U>,
    testData: any
  ): {
    baseResult: z.SafeParseReturnType<any, any>
    extendedResult: z.SafeParseReturnType<any, any>
    mergedResult: z.SafeParseReturnType<any, any>
  } {
    const extended = baseSchema.extend(extensionSchema.shape)
    const merged = baseSchema.merge(extensionSchema)
    
    return {
      baseResult: baseSchema.safeParse(testData),
      extendedResult: extended.safeParse(testData),
      mergedResult: merged.safeParse(testData)
    }
  }
  
  /**
   * Test schema transformation
   */
  static testSchemaTransformation<T, U>(
    schema: z.ZodSchema<T>,
    transformer: (data: T) => U,
    testData: any
  ): {
    validationResult: z.SafeParseReturnType<any, T>
    transformationResult?: U
    error?: Error
  } {
    const validationResult = schema.safeParse(testData)
    
    if (validationResult.success) {
      try {
        const transformationResult = transformer(validationResult.data)
        return { validationResult, transformationResult }
      } catch (error) {
        return { validationResult, error: error as Error }
      }
    }
    
    return { validationResult }
  }
  
  /**
   * Test schema refinement
   */
  static testSchemaRefinement<T>(
    baseSchema: z.ZodSchema<T>,
    refinement: (data: T) => boolean,
    errorMessage: string,
    testData: any
  ): z.SafeParseReturnType<any, T> {
    const refinedSchema = baseSchema.refine(refinement, { message: errorMessage })
    return refinedSchema.safeParse(testData)
  }
}

/**
 * Performance testing utilities for validation operations
 */
export class ValidationPerformanceTester {
  /**
   * Run performance benchmark for a schema
   */
  static async benchmarkSchema(
    schema: z.ZodSchema,
    testData: any[],
    iterations: number = 1000
  ): Promise<{
    totalTime: number
    averageTime: number
    operationsPerSecond: number
    minTime: number
    maxTime: number
    memoryUsage?: {
      before: number
      after: number
      delta: number
    }
  }> {
    const times: number[] = []
    let memoryBefore: number | undefined
    let memoryAfter: number | undefined
    
    // Measure memory if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      memoryBefore = process.memoryUsage().heapUsed
    }
    
    const startTime = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const data = testData[i % testData.length]
      const iterationStart = performance.now()
      
      schema.safeParse(data)
      
      const iterationTime = performance.now() - iterationStart
      times.push(iterationTime)
    }
    
    const totalTime = performance.now() - startTime
    
    // Measure memory after
    if (typeof process !== 'undefined' && process.memoryUsage) {
      memoryAfter = process.memoryUsage().heapUsed
    }
    
    const averageTime = totalTime / iterations
    const operationsPerSecond = 1000 / averageTime
    
    return {
      totalTime,
      averageTime,
      operationsPerSecond,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: memoryBefore && memoryAfter ? {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryAfter - memoryBefore
      } : undefined
    }
  }
  
  /**
   * Compare performance of multiple schemas
   */
  static async compareSchemaPerformance(
    schemas: { name: string; schema: z.ZodSchema }[],
    testData: any[],
    iterations: number = 1000
  ): Promise<{
    results: Array<{
      name: string
      performance: Awaited<ReturnType<typeof ValidationPerformanceTester.benchmarkSchema>>
    }>
    fastest: string
    slowest: string
  }> {
    const results = []
    
    for (const { name, schema } of schemas) {
      const performance = await this.benchmarkSchema(schema, testData, iterations)
      results.push({ name, performance })
    }
    
    // Find fastest and slowest
    const sortedBySpeed = results.sort((a, b) => a.performance.averageTime - b.performance.averageTime)
    
    return {
      results,
      fastest: sortedBySpeed[0].name,
      slowest: sortedBySpeed[sortedBySpeed.length - 1].name
    }
  }
}

/**
 * Mock validation utilities for testing
 */
export class MockValidationUtils {
  /**
   * Create a mock schema that always succeeds
   */
  static createMockSuccessSchema<T>(returnValue: T): z.ZodSchema<T> {
    return {
      safeParse: vi.fn().mockReturnValue({ success: true, data: returnValue }),
      parse: vi.fn().mockReturnValue(returnValue),
      parseAsync: vi.fn().mockResolvedValue(returnValue),
      safeParseAsync: vi.fn().mockResolvedValue({ success: true, data: returnValue }),
    } as any
  }
  
  /**
   * Create a mock schema that always fails
   */
  static createMockFailureSchema(errors: z.ZodIssue[]): z.ZodSchema {
    const zodError = new z.ZodError(errors)
    return {
      safeParse: vi.fn().mockReturnValue({ success: false, error: zodError }),
      parse: vi.fn().mockImplementation(() => { throw zodError }),
      parseAsync: vi.fn().mockRejectedValue(zodError),
      safeParseAsync: vi.fn().mockResolvedValue({ success: false, error: zodError }),
    } as any
  }
  
  /**
   * Create a mock schema with custom behavior
   */
  static createMockSchemaWithBehavior(
    behavior: (input: any) => z.SafeParseReturnType<any, any>
  ): z.ZodSchema {
    return {
      safeParse: vi.fn().mockImplementation(behavior),
      parse: vi.fn().mockImplementation((input: any) => {
        const result = behavior(input)
        if (result.success) {
          return result.data
        } else {
          throw result.error
        }
      }),
    } as any
  }
}

/**
 * Common validation test data generators
 */
export class ValidationTestDataGenerator {
  /**
   * Generate test data for string validation
   */
  static generateStringTestData(): {
    valid: string[]
    invalid: any[]
    edge: string[]
  } {
    return {
      valid: [
        'hello',
        'test@example.com',
        'Hello World',
        '123',
        'special-chars_123'
      ],
      invalid: [
        null,
        undefined,
        123,
        {},
        [],
        true
      ],
      edge: [
        '',
        ' ',
        '\n',
        '\t',
        'a'.repeat(1000),
        '🚀',
        'test\x00null'
      ]
    }
  }
  
  /**
   * Generate test data for number validation
   */
  static generateNumberTestData(): {
    valid: number[]
    invalid: any[]
    edge: number[]
  } {
    return {
      valid: [
        0,
        1,
        -1,
        123.456,
        1e10
      ],
      invalid: [
        null,
        undefined,
        'string',
        {},
        [],
        true,
        NaN
      ],
      edge: [
        Infinity,
        -Infinity,
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.EPSILON
      ]
    }
  }
  
  /**
   * Generate test data for email validation
   */
  static generateEmailTestData(): {
    valid: string[]
    invalid: string[]
    edge: string[]
  } {
    return {
      valid: [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ],
      invalid: [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        ''
      ],
      edge: [
        'a@b.co',
        'very.long.email.address@very.long.domain.name.example.com',
        'user@domain.museum',
        'test@localhost'
      ]
    }
  }
  
  /**
   * Generate test data for UUID validation
   */
  static generateUUIDTestData(): {
    valid: string[]
    invalid: string[]
    edge: string[]
  } {
    return {
      valid: [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ],
      invalid: [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        '123e4567e89b12d3a456426614174000'
      ],
      edge: [
        '00000000-0000-0000-0000-000000000000',
        'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'
      ]
    }
  }
}

/**
 * Validation test suite builder
 */
export class ValidationTestSuiteBuilder {
  private testSuite: Partial<SchemaTestSuite> = {
    validCases: [],
    invalidCases: [],
    edgeCases: []
  }
  
  constructor(private schema: z.ZodSchema) {
    this.testSuite.schema = schema
  }
  
  /**
   * Add valid test cases
   */
  addValidCases(cases: ValidationTestCase[]): this {
    this.testSuite.validCases!.push(...cases)
    return this
  }
  
  /**
   * Add invalid test cases
   */
  addInvalidCases(cases: ValidationTestCase[]): this {
    this.testSuite.invalidCases!.push(...cases)
    return this
  }
  
  /**
   * Add edge test cases
   */
  addEdgeCases(cases: ValidationTestCase[]): this {
    if (!this.testSuite.edgeCases) {
      this.testSuite.edgeCases = []
    }
    this.testSuite.edgeCases.push(...cases)
    return this
  }
  
  /**
   * Set performance threshold
   */
  setPerformanceThreshold(threshold: number): this {
    this.testSuite.performanceThreshold = threshold
    return this
  }
  
  /**
   * Build the test suite
   */
  build(): SchemaTestSuite {
    return this.testSuite as SchemaTestSuite
  }
}

// Note: Classes are already exported above, no need to re-export

/**
 * Helper function to create a validation tester
 */
export function createValidationTester(schema: z.ZodSchema): SchemaValidationTester {
  return new SchemaValidationTester(schema)
}

/**
 * Helper function to create a test suite builder
 */
export function createTestSuiteBuilder(schema: z.ZodSchema): ValidationTestSuiteBuilder {
  return new ValidationTestSuiteBuilder(schema)
}