import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright E2E tests
 * 
 * This setup ensures the application is ready for testing and handles
 * authentication state preparation for test scenarios.
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...')
  
  const { baseURL } = config.projects[0].use
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Wait for the application to be ready
    console.log(`📡 Checking application availability at ${baseURL}`)
    
    await page.goto(baseURL || 'http://localhost:3007', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    })
    
    // Check if the application loads without critical errors
    const hasError = await page.locator('[data-testid="configuration-error"]').isVisible().catch(() => false)
    
    if (hasError) {
      console.warn('⚠️  Application has configuration errors - some tests may fail')
      const errorText = await page.locator('[data-testid="configuration-error"]').textContent()
      console.warn('Configuration error:', errorText)
    } else {
      console.log('✅ Application is ready for testing')
    }
    
    // Check if authentication is properly configured
    const hasAuthProvider = await page.evaluate(() => {
      // Check if Clerk is loaded
      return typeof window !== 'undefined' && 'Clerk' in window
    }).catch(() => false)
    
    if (hasAuthProvider) {
      console.log('✅ Authentication provider is available')
    } else {
      console.warn('⚠️  Authentication provider not detected - auth tests may fail')
    }
    
    // Store authentication state directory
    process.env.PLAYWRIGHT_AUTH_DIR = './apps/web/__tests__/e2e/setup/auth-states'
    
    console.log('✅ Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup