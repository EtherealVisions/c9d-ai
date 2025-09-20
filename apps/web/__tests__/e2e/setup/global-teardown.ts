import { FullConfig } from '@playwright/test'

/**
 * Global teardown for Playwright E2E tests
 * 
 * Cleans up any global resources and test artifacts.
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...')
  
  try {
    // Clean up any global test data or resources
    console.log('✅ Global teardown completed successfully')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown