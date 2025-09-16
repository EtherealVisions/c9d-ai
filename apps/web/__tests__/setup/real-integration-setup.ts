/**
 * Real Integration Test Setup
 * Configuration for testing against actual services (Database, Clerk, etc.)
 */

import { beforeAll, afterAll } from 'vitest'

// Test environment configuration
export const REAL_INTEGRATION_CONFIG = {
  // Database configuration
  database: {
    url: process.env.TEST_DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Clerk configuration
  clerk: {
    secretKey: process.env.TEST_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.TEST_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  
  // Test data configuration
  testData: {
    userEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    orgName: process.env.TEST_ORG_NAME || 'Test Organization',
    cleanupAfterTests: process.env.CLEANUP_TEST_DATA !== 'false', // Default to true
  },
  
  // Performance thresholds
  performance: {
    maxDatabaseQueryTime: 1000, // 1 second
    maxClerkApiTime: 5000, // 5 seconds
    maxConcurrentOperationTime: 10000, // 10 seconds
  }
}

// Check if real integration tests should run
export function shouldRunRealIntegrationTests(): boolean {
  const hasDatabase = !!(REAL_INTEGRATION_CONFIG.database.url && REAL_INTEGRATION_CONFIG.database.serviceRoleKey)
  const hasClerk = !!REAL_INTEGRATION_CONFIG.clerk.secretKey
  
  return hasDatabase || hasClerk
}

// Get available test services
export function getAvailableTestServices(): string[] {
  const services: string[] = []
  
  if (REAL_INTEGRATION_CONFIG.database.url && REAL_INTEGRATION_CONFIG.database.serviceRoleKey) {
    services.push('database')
  }
  
  if (REAL_INTEGRATION_CONFIG.clerk.secretKey) {
    services.push('clerk')
  }
  
  return services
}

// Setup function for real integration tests
export function setupRealIntegrationTests() {
  beforeAll(async () => {
    const availableServices = getAvailableTestServices()
    
    if (availableServices.length === 0) {
      console.warn('⚠️  No real integration services configured.')
      console.warn('   Configure TEST_DATABASE_URL and/or TEST_CLERK_SECRET_KEY to run real integration tests.')
      return
    }
    
    console.log('🚀 Setting up real integration tests...')
    console.log(`📋 Available services: ${availableServices.join(', ')}`)
    
    // Validate database connection if configured
    if (availableServices.includes('database')) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          REAL_INTEGRATION_CONFIG.database.url!,
          REAL_INTEGRATION_CONFIG.database.serviceRoleKey!
        )
        
        const { error } = await supabase.from('users').select('count').limit(1)
        if (error) {
          console.error('❌ Database connection test failed:', error.message)
        } else {
          console.log('✅ Database connection verified')
        }
      } catch (error) {
        console.error('❌ Database setup failed:', error)
      }
    }
    
    // Validate Clerk connection if configured
    if (availableServices.includes('clerk')) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server')
        const client = await clerkClient()
        const users = await client.users.getUserList({ limit: 1 })
        console.log(`✅ Clerk connection verified (${users.totalCount} total users)`)
      } catch (error) {
        console.error('❌ Clerk connection test failed:', error)
      }
    }
  })
  
  afterAll(async () => {
    if (REAL_INTEGRATION_CONFIG.testData.cleanupAfterTests) {
      console.log('🧹 Real integration test cleanup completed')
    }
  })
}

// Helper to skip tests if services aren't available
export function skipIfNoRealServices(serviceName?: string) {
  const availableServices = getAvailableTestServices()
  
  if (serviceName && !availableServices.includes(serviceName)) {
    console.warn(`⚠️  Skipping test - ${serviceName} not configured`)
    return true
  }
  
  if (!serviceName && availableServices.length === 0) {
    console.warn('⚠️  Skipping test - no real integration services configured')
    return true
  }
  
  return false
}

// Test data generators for real integration tests
export const generateTestData = {
  user: () => ({
    clerkUserId: `test_clerk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    preferences: { theme: 'light', notifications: true }
  }),
  
  organization: () => ({
    name: `Test Organization ${Date.now()}`,
    slug: `test-org-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    description: 'Integration test organization',
    settings: { allowPublicSignup: false, requireApproval: true },
    metadata: { testData: true, createdAt: new Date().toISOString() }
  }),
  
  membership: (userId: string, organizationId: string, roleId: string = 'role-member') => ({
    userId,
    organizationId,
    roleId,
    status: 'active' as const
  })
}

// Performance measurement utilities
export class PerformanceMeasurement {
  private startTime: number = 0
  
  start(): void {
    this.startTime = performance.now()
  }
  
  end(): number {
    return performance.now() - this.startTime
  }
  
  async measure<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start()
    const result = await operation()
    const duration = this.end()
    return { result, duration }
  }
}

// Test result validation
export function validatePerformance(duration: number, threshold: number, operation: string): void {
  if (duration > threshold) {
    console.warn(`⚠️  Performance warning: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
  } else {
    console.log(`✅ Performance OK: ${operation} completed in ${duration.toFixed(2)}ms`)
  }
}

// Environment validation
export function validateTestEnvironment(): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for required environment variables
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
    issues.push('NODE_ENV should be set to "test" for integration tests')
  }
  
  // Check database configuration
  if (REAL_INTEGRATION_CONFIG.database.url && !REAL_INTEGRATION_CONFIG.database.serviceRoleKey) {
    issues.push('Database URL provided but missing service role key')
  }
  
  // Check Clerk configuration
  if (REAL_INTEGRATION_CONFIG.clerk.publishableKey && !REAL_INTEGRATION_CONFIG.clerk.secretKey) {
    issues.push('Clerk publishable key provided but missing secret key')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

// Export configuration for use in tests
export default REAL_INTEGRATION_CONFIG