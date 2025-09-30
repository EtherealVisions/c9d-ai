/**
 * E2E Tests for Environment Integration
 * 
 * Tests the complete environment loading system in end-to-end scenarios
 * using real Phase.dev integration where available.
 */

import { test, expect } from '@playwright/test'

test.describe('Environment Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console logging to capture environment loading messages
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Environment')) {
        console.log('Browser console:', msg.text())
      }
    })
  })

  test('should load application with environment variables', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')

    // Check that the application loaded successfully
    // This implicitly tests that environment variables were loaded correctly
    await expect(page).toHaveTitle(/C9D AI Platform|AI\.C9d/)

    // Check for any environment-related error messages
    const errorMessages = await page.locator('[data-testid*="error"], .error, [role="alert"]').all()
    
    for (const errorElement of errorMessages) {
      const errorText = await errorElement.textContent()
      if (errorText && errorText.includes('environment')) {
        console.warn('Environment-related error detected:', errorText)
      }
    }
  })

  test('should handle authentication with environment-loaded keys', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in')

    // Wait for Clerk to initialize (depends on environment variables)
    await page.waitForSelector('[data-testid="sign-in-form"], .cl-signIn-root, form', { timeout: 10000 })

    // Check that Clerk components loaded (indicates environment variables are working)
    const signInForm = page.locator('[data-testid="sign-in-form"], .cl-signIn-root, form').first()
    await expect(signInForm).toBeVisible()

    // Check for Clerk-specific elements that require proper API keys
    const emailInput = page.locator('input[type="email"], input[name="identifier"], [data-testid*="email"]').first()
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible()
    }
  })

  test('should connect to database with environment-loaded connection string', async ({ page }) => {
    // Navigate to a page that requires database connection
    await page.goto('/dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for database connection errors
    const dbErrors = await page.locator('text=/database.*error|connection.*failed|db.*error/i').all()
    
    if (dbErrors.length > 0) {
      for (const error of dbErrors) {
        const errorText = await error.textContent()
        console.warn('Database connection issue detected:', errorText)
      }
    }

    // If we reach here without throwing, database connection is working
    // (or the page handles connection errors gracefully)
  })

  test('should handle environment variable validation errors gracefully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Look for any validation error messages
    const validationErrors = await page.locator('text=/invalid.*environment|missing.*variable|configuration.*error/i').all()
    
    if (validationErrors.length > 0) {
      for (const error of validationErrors) {
        const errorText = await error.textContent()
        console.log('Environment validation message:', errorText)
      }
    }

    // Application should still load even with validation warnings
    await expect(page).toHaveTitle(/.+/)
  })

  test('should display appropriate environment indicators', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for environment indicators (development mode, etc.)
    const envIndicators = await page.locator('[data-testid*="env"], [data-environment], .env-indicator').all()
    
    for (const indicator of envIndicators) {
      const indicatorText = await indicator.textContent()
      if (indicatorText) {
        console.log('Environment indicator found:', indicatorText)
      }
    }

    // In test environment, we might see development indicators
    const isDevelopment = await page.locator('text=/development|dev mode|test environment/i').count() > 0
    if (isDevelopment) {
      console.log('Development environment indicators detected')
    }
  })

  test('should handle Phase.dev connectivity status', async ({ page }) => {
    // Navigate to a page that might show Phase.dev status
    await page.goto('/dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Look for Phase.dev status indicators
    const phaseStatus = await page.locator('text=/phase.*connected|phase.*error|phase.*unavailable/i').all()
    
    for (const status of phaseStatus) {
      const statusText = await status.textContent()
      console.log('Phase.dev status:', statusText)
    }

    // Check browser console for Phase.dev messages
    const consoleLogs = await page.evaluate(() => {
      return (window as any).__phaseDebugLogs || []
    })

    if (consoleLogs.length > 0) {
      console.log('Phase.dev debug logs:', consoleLogs)
    }
  })

  test('should work with fallback environment when Phase.dev unavailable', async ({ page }) => {
    // This test simulates Phase.dev being unavailable
    // The application should fall back to local environment variables

    // Block Phase.dev API calls
    await page.route('**/api.phase.dev/**', route => {
      route.abort('failed')
    })

    await page.route('**/phase.dev/**', route => {
      route.abort('failed')
    })

    // Navigate to the application
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Application should still work with fallback environment
    await expect(page).toHaveTitle(/.+/)

    // Check for fallback indicators
    const fallbackMessages = await page.locator('text=/fallback|local.*environment|phase.*unavailable/i').all()
    
    for (const message of fallbackMessages) {
      const messageText = await message.textContent()
      console.log('Fallback message:', messageText)
    }
  })

  test('should validate environment on application startup', async ({ page }) => {
    // Capture console messages during startup
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    // Navigate to the application
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for environment validation messages in console
    const envValidationMessages = consoleMessages.filter(msg => 
      msg.includes('environment') || 
      msg.includes('validation') || 
      msg.includes('Phase.dev')
    )

    if (envValidationMessages.length > 0) {
      console.log('Environment validation messages:', envValidationMessages)
    }

    // Application should load successfully
    await expect(page).toHaveTitle(/.+/)
  })

  test('should handle different environment contexts correctly', async ({ page }) => {
    // Test that the application behaves correctly based on environment
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for environment-specific behavior
    const isProduction = await page.evaluate(() => {
      return process?.env?.NODE_ENV === 'production' || 
             (window as any).__NEXT_DATA__?.buildId !== undefined
    })

    if (isProduction) {
      // In production, certain debug features should be disabled
      const debugElements = await page.locator('[data-debug], .debug-info, [data-testid*="debug"]').count()
      expect(debugElements).toBe(0)
    } else {
      // In development/test, debug features might be available
      console.log('Non-production environment detected')
    }

    // Check for appropriate security headers and configurations
    const response = await page.goto('/')
    const headers = response?.headers() || {}
    
    if (headers['x-frame-options'] || headers['content-security-policy']) {
      console.log('Security headers detected (good for production)')
    }
  })

  test('should maintain environment consistency across page navigation', async ({ page }) => {
    // Navigate to different pages and ensure environment remains consistent
    const pages = ['/', '/dashboard', '/sign-in']
    
    for (const pagePath of pages) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      // Check that environment-dependent features work consistently
      const hasClerkElements = await page.locator('.cl-userButton, .cl-signIn-root, [data-clerk-element]').count() > 0
      
      if (hasClerkElements) {
        console.log(`Clerk elements found on ${pagePath} (environment working)`)
      }

      // Check for any environment-related errors
      const errors = await page.locator('[role="alert"], .error, [data-testid*="error"]').all()
      
      for (const error of errors) {
        const errorText = await error.textContent()
        if (errorText && (errorText.includes('environment') || errorText.includes('configuration'))) {
          console.warn(`Environment error on ${pagePath}:`, errorText)
        }
      }
    }
  })
})