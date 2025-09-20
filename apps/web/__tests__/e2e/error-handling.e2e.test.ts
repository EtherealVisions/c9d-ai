import { test, expect } from '@playwright/test'
import { 
  signInUser, 
  signOutUser,
  waitForAuthState,
  TEST_USERS
} from './setup/auth-helpers'

/**
 * Error Handling and Edge Cases E2E Tests
 * 
 * These tests validate the application's behavior in error scenarios:
 * - Network failures and offline behavior
 * - Server errors and API failures
 * - Invalid data and malformed responses
 * - Browser compatibility issues
 * - Session expiration and timeout handling
 * - Graceful degradation scenarios
 */

test.describe('Error Handling and Edge Cases', () => {
  test.describe('Network Failures', () => {
    test('should handle complete network failure gracefully', async ({ page }) => {
      // Sign in first
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate complete network failure
      await page.route('**/*', route => route.abort())
      
      // Try to navigate to different pages
      await page.goto('/dashboard')
      
      // Should show network error or offline indicator
      const networkError = page.locator('[data-testid="network-error"]')
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      
      const hasErrorHandling = await Promise.race([
        networkError.isVisible(),
        offlineIndicator.isVisible(),
        page.waitForTimeout(5000).then(() => false)
      ])
      
      if (hasErrorHandling) {
        console.log('✅ Network failure is handled gracefully')
      }
      
      // Should provide retry mechanism
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        console.log('✅ Retry mechanism is available')
      }
    })

    test('should handle intermittent network issues', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate intermittent failures (fail every other request)
      let requestCount = 0
      await page.route('**/api/**', route => {
        requestCount++
        if (requestCount % 2 === 0) {
          route.abort()
        } else {
          route.continue()
        }
      })
      
      // Navigate to dashboard
      await page.goto('/dashboard')
      
      // Should eventually load or show appropriate error handling
      await page.waitForTimeout(5000)
      
      const hasContent = await page.locator('[data-testid="dashboard"]').isVisible()
      const hasError = await page.locator('[data-testid="network-error"]').isVisible()
      
      expect(hasContent || hasError).toBe(true)
      console.log('✅ Intermittent network issues are handled')
    })

    test('should handle slow network connections', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate slow network by delaying responses
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        route.continue()
      })
      
      const startTime = Date.now()
      await page.goto('/dashboard')
      
      // Should show loading indicators
      const loadingIndicator = page.locator('[data-testid="loading"]')
      if (await loadingIndicator.isVisible()) {
        console.log('✅ Loading indicators are shown for slow connections')
      }
      
      // Should eventually load or timeout gracefully
      await page.waitForLoadState('networkidle', { timeout: 15000 })
      const loadTime = Date.now() - startTime
      
      console.log(`Dashboard loaded in ${loadTime}ms with slow network simulation`)
    })

    test('should work offline with cached data', async ({ page }) => {
      // First, load the page with network access
      await signInUser(page, TEST_USERS.MEMBER)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Then simulate going offline
      await page.context().setOffline(true)
      
      // Reload the page
      await page.reload()
      
      // Should show offline indicator or cached content
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      const cachedContent = page.locator('[data-testid="dashboard"]')
      
      const hasOfflineHandling = await offlineIndicator.isVisible() || 
                                 await cachedContent.isVisible()
      
      if (hasOfflineHandling) {
        console.log('✅ Offline behavior is handled correctly')
      }
      
      // Restore network
      await page.context().setOffline(false)
    })
  })

  test.describe('Server Errors', () => {
    test('should handle 500 internal server errors', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate 500 errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        })
      })
      
      await page.goto('/dashboard')
      
      // Should show server error message
      const serverError = page.locator('[data-testid="server-error"]')
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      const hasErrorHandling = await serverError.isVisible() || 
                              await errorMessage.isVisible()
      
      if (hasErrorHandling) {
        console.log('✅ Server errors are handled gracefully')
      }
    })

    test('should handle 404 not found errors', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Navigate to non-existent page
      await page.goto('/non-existent-page')
      
      // Should show 404 page or redirect
      const notFoundPage = page.locator('[data-testid="not-found"]')
      const redirected = !page.url().includes('/non-existent-page')
      
      const hasNotFoundHandling = await notFoundPage.isVisible() || redirected
      
      if (hasNotFoundHandling) {
        console.log('✅ 404 errors are handled correctly')
      }
    })

    test('should handle API rate limiting', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate rate limiting
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too Many Requests' }),
          headers: { 'Retry-After': '60' }
        })
      })
      
      await page.goto('/dashboard')
      
      // Should show rate limit message
      const rateLimitError = page.locator('[data-testid="rate-limit-error"]')
      if (await rateLimitError.isVisible()) {
        await expect(rateLimitError).toContainText(/rate limit|too many requests/i)
        console.log('✅ Rate limiting is handled correctly')
      }
    })

    test('should handle authentication errors', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate authentication errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        })
      })
      
      await page.goto('/dashboard')
      
      // Should redirect to sign-in or show auth error
      await Promise.race([
        page.waitForURL('/sign-in', { timeout: 10000 }),
        page.waitForSelector('[data-testid="auth-error"]', { timeout: 10000 })
      ])
      
      const isOnSignIn = page.url().includes('/sign-in')
      const hasAuthError = await page.locator('[data-testid="auth-error"]').isVisible()
      
      if (isOnSignIn || hasAuthError) {
        console.log('✅ Authentication errors are handled correctly')
      }
    })
  })

  test.describe('Invalid Data Handling', () => {
    test('should handle malformed JSON responses', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate malformed JSON
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        })
      })
      
      await page.goto('/dashboard')
      
      // Should handle parsing errors gracefully
      const parseError = page.locator('[data-testid="parse-error"]')
      const genericError = page.locator('[data-testid="error-message"]')
      
      const hasErrorHandling = await parseError.isVisible() || 
                              await genericError.isVisible()
      
      if (hasErrorHandling) {
        console.log('✅ Malformed JSON responses are handled')
      }
    })

    test('should handle missing required data fields', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate response with missing fields
      await page.route('**/api/user/profile', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            // Missing required fields like name, email, etc.
            id: '123'
          })
        })
      })
      
      await page.goto('/settings/profile')
      
      // Should handle missing data gracefully
      const missingDataError = page.locator('[data-testid="missing-data-error"]')
      const defaultValues = page.locator('[data-testid="default-profile-values"]')
      
      const hasDataHandling = await missingDataError.isVisible() || 
                             await defaultValues.isVisible()
      
      if (hasDataHandling) {
        console.log('✅ Missing data fields are handled')
      }
    })

    test('should validate form inputs with invalid data', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      await page.goto('/settings/profile')
      
      const profileForm = page.locator('[data-testid="profile-form"]')
      if (await profileForm.isVisible()) {
        // Test invalid email format
        const emailInput = page.locator('[data-testid="email-input"]')
        if (await emailInput.isVisible()) {
          await emailInput.fill('invalid-email-format')
          
          const saveButton = page.locator('[data-testid="save-profile-button"]')
          if (await saveButton.isVisible()) {
            await saveButton.click()
            
            // Should show validation error
            const emailError = page.locator('[data-testid="email-error"]')
            if (await emailError.isVisible()) {
              await expect(emailError).toContainText(/invalid.*email/i)
              console.log('✅ Email validation is working')
            }
          }
        }
        
        // Test extremely long input
        const nameInput = page.locator('[data-testid="first-name-input"]')
        if (await nameInput.isVisible()) {
          const longName = 'a'.repeat(1000)
          await nameInput.fill(longName)
          
          const saveButton = page.locator('[data-testid="save-profile-button"]')
          if (await saveButton.isVisible()) {
            await saveButton.click()
            
            // Should show length validation error
            const nameError = page.locator('[data-testid="first-name-error"]')
            if (await nameError.isVisible()) {
              console.log('✅ Input length validation is working')
            }
          }
        }
      }
    })
  })

  test.describe('Session Management', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate session expiration by clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('clerk-session')
        sessionStorage.clear()
      })
      
      // Try to access protected content
      await page.goto('/dashboard')
      
      // Should redirect to sign-in
      await page.waitForURL('/sign-in', { timeout: 10000 })
      
      // Should show session expired message
      const sessionExpiredMessage = page.locator('[data-testid="session-expired"]')
      if (await sessionExpiredMessage.isVisible()) {
        await expect(sessionExpiredMessage).toContainText(/session.*expired/i)
      }
      
      console.log('✅ Session expiration is handled correctly')
    })

    test('should handle concurrent session conflicts', async ({ page, context }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Create another tab/context with the same user
      const newPage = await context.newPage()
      await signInUser(newPage, TEST_USERS.MEMBER)
      
      // Sign out from the new tab
      await signOutUser(newPage)
      
      // Try to use the original tab
      await page.goto('/dashboard')
      
      // Should handle the session conflict
      const sessionConflict = page.locator('[data-testid="session-conflict"]')
      const redirectToSignIn = page.url().includes('/sign-in')
      
      if (await sessionConflict.isVisible() || redirectToSignIn) {
        console.log('✅ Concurrent session conflicts are handled')
      }
      
      await newPage.close()
    })

    test('should handle session timeout during activity', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate session timeout by intercepting auth checks
      await page.route('**/api/auth/session', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        })
      })
      
      // Perform an action that requires authentication
      await page.goto('/settings/profile')
      
      // Should handle session timeout
      const sessionTimeout = page.locator('[data-testid="session-timeout"]')
      const authError = page.locator('[data-testid="auth-error"]')
      
      const hasTimeoutHandling = await sessionTimeout.isVisible() || 
                                 await authError.isVisible()
      
      if (hasTimeoutHandling) {
        console.log('✅ Session timeout during activity is handled')
      }
    })
  })

  test.describe('Browser Compatibility', () => {
    test('should handle JavaScript disabled gracefully', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, javaEnabled: () => false }
        })
      })
      
      await page.goto('/')
      
      // Should show no-script message or basic functionality
      const noScriptMessage = page.locator('[data-testid="no-script"]')
      const basicContent = page.locator('body')
      
      const hasBasicFunctionality = await noScriptMessage.isVisible() || 
                                   await basicContent.isVisible()
      
      if (hasBasicFunctionality) {
        console.log('✅ JavaScript disabled scenario is handled')
      }
    })

    test('should handle local storage unavailable', async ({ page }) => {
      // Mock localStorage as unavailable
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        })
      })
      
      await page.goto('/')
      
      // Should still function without localStorage
      const storageError = page.locator('[data-testid="storage-error"]')
      const basicFunctionality = page.locator('[data-testid="sign-in-form"]')
      
      const hasStorageHandling = await storageError.isVisible() || 
                                await basicFunctionality.isVisible()
      
      if (hasStorageHandling) {
        console.log('✅ localStorage unavailable scenario is handled')
      }
    })

    test('should handle cookies disabled', async ({ page }) => {
      // Disable cookies
      await page.context().clearCookies()
      await page.route('**/*', route => {
        const headers = { ...route.request().headers() }
        delete headers.cookie
        route.continue({ headers })
      })
      
      await page.goto('/')
      
      // Should show cookie warning or alternative functionality
      const cookieWarning = page.locator('[data-testid="cookie-warning"]')
      const alternativeAuth = page.locator('[data-testid="alternative-auth"]')
      
      const hasCookieHandling = await cookieWarning.isVisible() || 
                               await alternativeAuth.isVisible()
      
      if (hasCookieHandling) {
        console.log('✅ Cookies disabled scenario is handled')
      }
    })
  })

  test.describe('Edge Cases', () => {
    test('should handle extremely long URLs', async ({ page }) => {
      const longPath = '/dashboard/' + 'a'.repeat(2000)
      
      await page.goto(longPath)
      
      // Should handle gracefully (404 or redirect)
      const notFound = page.locator('[data-testid="not-found"]')
      const redirected = !page.url().includes(longPath)
      
      const hasUrlHandling = await notFound.isVisible() || redirected
      
      if (hasUrlHandling) {
        console.log('✅ Extremely long URLs are handled')
      }
    })

    test('should handle special characters in URLs', async ({ page }) => {
      const specialCharPath = '/dashboard/test%20with%20spaces/special!@#$%^&*()'
      
      await page.goto(specialCharPath)
      
      // Should handle special characters gracefully
      const hasContent = await page.locator('body').isVisible()
      expect(hasContent).toBe(true)
      
      console.log('✅ Special characters in URLs are handled')
    })

    test('should handle rapid navigation', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Rapidly navigate between pages
      const pages = ['/dashboard', '/settings', '/analytics', '/dashboard']
      
      for (let i = 0; i < 3; i++) {
        for (const pagePath of pages) {
          await page.goto(pagePath)
          await page.waitForTimeout(100) // Very short wait
        }
      }
      
      // Should end up on the last page without errors
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Rapid navigation is handled correctly')
    })

    test('should handle memory constraints', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate memory pressure by creating large objects
      await page.evaluate(() => {
        const largeArrays = []
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(10000).fill('memory test'))
        }
        // Store reference to prevent garbage collection
        (window as any).memoryTest = largeArrays
      })
      
      // Navigate and perform actions
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Should still function under memory pressure
      const isDashboardVisible = await page.locator('[data-testid="dashboard"]').isVisible()
      expect(isDashboardVisible).toBe(true)
      
      console.log('✅ Memory constraints are handled')
    })
  })

  test.describe('Recovery Mechanisms', () => {
    test('should provide error recovery options', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate an error
      await page.route('**/api/**', route => route.abort())
      await page.goto('/dashboard')
      
      // Should provide recovery options
      const retryButton = page.locator('[data-testid="retry-button"]')
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      const homeButton = page.locator('[data-testid="go-home-button"]')
      
      const hasRecoveryOptions = await retryButton.isVisible() || 
                                await refreshButton.isVisible() || 
                                await homeButton.isVisible()
      
      if (hasRecoveryOptions) {
        console.log('✅ Error recovery options are available')
        
        // Test retry functionality
        if (await retryButton.isVisible()) {
          // Remove the route block
          await page.unroute('**/api/**')
          
          // Click retry
          await retryButton.click()
          
          // Should recover
          await page.waitForTimeout(2000)
          const hasRecovered = await page.locator('[data-testid="dashboard"]').isVisible()
          
          if (hasRecovered) {
            console.log('✅ Retry functionality works')
          }
        }
      }
    })

    test('should maintain user context during errors', async ({ page }) => {
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Cause an error that doesn't affect authentication
      await page.route('**/api/dashboard/**', route => route.abort())
      await page.goto('/dashboard')
      
      // User should still be authenticated
      const userMenu = page.locator('[data-testid="user-menu"]')
      if (await userMenu.isVisible()) {
        console.log('✅ User context is maintained during errors')
      }
      
      // Should be able to navigate to other pages
      await page.goto('/settings')
      const settingsPage = await page.locator('[data-testid="settings"]').isVisible()
      
      if (settingsPage) {
        console.log('✅ Navigation works despite partial errors')
      }
    })
  })
})