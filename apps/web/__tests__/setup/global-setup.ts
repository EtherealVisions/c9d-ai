import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...')
  
  // Start coverage collection if enabled
  if (process.env.COVERAGE_E2E === 'true') {
    console.log('📊 Coverage collection enabled for E2E tests')
  }
  
  // Setup test database if needed
  if (process.env.E2E_DATABASE_SETUP === 'true') {
    console.log('🗄️ Setting up test database...')
    // Add database setup logic here
  }
  
  // Warm up the application
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000')
    await page.waitForLoadState('networkidle')
    console.log('✅ Application warmed up successfully')
  } catch (error) {
    console.error('❌ Failed to warm up application:', error)
  } finally {
    await browser.close()
  }
  
  console.log('✅ Global E2E test setup completed')
}

export default globalSetup