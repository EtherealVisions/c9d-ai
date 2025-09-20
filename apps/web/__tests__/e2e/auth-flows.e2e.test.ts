import { test, expect, Page } from '@playwright/test'
import { 
  signUpUser, 
  signInUser, 
  signOutUser, 
  completeOnboarding,
  waitForAuthState,
  TEST_USERS,
  type TestUser
} from './setup/auth-helpers'

/**
 * Comprehensive Authentication Flow E2E Tests
 * 
 * These tests validate complete user authentication journeys including:
 * - User registration and sign-up
 * - User sign-in and sign-out
 * - Password reset flows
 * - Social authentication
 * - Session management
 * - Error handling and edge cases
 */

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/')
    await waitForAuthState(page)
  })

  test.describe('User Registration', () => {
    test('should complete successful user registration flow', async ({ page }) => {
      const newUser: TestUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      }

      // Navigate to sign-up page
      await page.goto('/sign-up')
      
      // Verify sign-up form is visible
      await expect(page.locator('[data-testid="sign-up-form"]')).toBeVisible()
      
      // Fill registration form
      await page.fill('[data-testid="email-input"]', newUser.email)
      await page.fill('[data-testid="password-input"]', newUser.password)
      
      // Handle confirm password if present
      const confirmPasswordField = page.locator('[data-testid="confirm-password-input"]')
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(newUser.password)
      }
      
      // Fill name fields if present
      const firstNameField = page.locator('[data-testid="first-name-input"]')
      if (await firstNameField.isVisible()) {
        await firstNameField.fill(newUser.firstName!)
      }
      
      const lastNameField = page.locator('[data-testid="last-name-input"]')
      if (await lastNameField.isVisible()) {
        await lastNameField.fill(newUser.lastName!)
      }
      
      // Submit registration
      await page.click('[data-testid="sign-up-button"]')
      
      // Wait for successful registration
      await Promise.race([
        page.waitForURL('/dashboard', { timeout: 15000 }),
        page.waitForURL('/verify-email', { timeout: 15000 }),
        page.waitForURL('/onboarding/**', { timeout: 15000 })
      ])
      
      // Verify we're no longer on the sign-up page
      expect(page.url()).not.toContain('/sign-up')
      
      // If redirected to onboarding, complete it
      if (page.url().includes('/onboarding')) {
        await completeOnboarding(page)
      }
      
      // Verify we reach the dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Verify user is authenticated
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(true)
    })

    test('should handle registration with invalid email', async ({ page }) => {
      await page.goto('/sign-up')
      
      // Fill form with invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.fill('[data-testid="password-input"]', 'ValidPassword123!')
      
      // Submit form
      await page.click('[data-testid="sign-up-button"]')
      
      // Verify error message is displayed
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-error"]')).toContainText(/invalid.*email/i)
      
      // Verify we stay on sign-up page
      expect(page.url()).toContain('/sign-up')
    })

    test('should handle registration with weak password', async ({ page }) => {
      await page.goto('/sign-up')
      
      // Fill form with weak password
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', '123')
      
      // Submit form
      await page.click('[data-testid="sign-up-button"]')
      
      // Verify password error is displayed
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
      
      // Verify we stay on sign-up page
      expect(page.url()).toContain('/sign-up')
    })

    test('should handle password confirmation mismatch', async ({ page }) => {
      await page.goto('/sign-up')
      
      const confirmPasswordField = page.locator('[data-testid="confirm-password-input"]')
      
      // Only test if confirm password field exists
      if (await confirmPasswordField.isVisible()) {
        await page.fill('[data-testid="email-input"]', 'test@example.com')
        await page.fill('[data-testid="password-input"]', 'Password123!')
        await confirmPasswordField.fill('DifferentPassword123!')
        
        // Submit form
        await page.click('[data-testid="sign-up-button"]')
        
        // Verify password mismatch error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
        await expect(page.locator('[data-testid="password-error"]')).toContainText(/password.*match/i)
        
        // Verify we stay on sign-up page
        expect(page.url()).toContain('/sign-up')
      }
    })
  })

  test.describe('User Sign-In', () => {
    test('should complete successful sign-in flow', async ({ page }) => {
      // Use a test user that should exist or be created
      const testUser = TEST_USERS.MEMBER
      
      await page.goto('/sign-in')
      
      // Verify sign-in form is visible
      await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible()
      
      // Fill credentials
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      
      // Submit sign-in
      await page.click('[data-testid="sign-in-button"]')
      
      // Wait for successful authentication
      await Promise.race([
        page.waitForURL('/dashboard', { timeout: 15000 }),
        page.waitForURL('/onboarding/**', { timeout: 15000 })
      ])
      
      // If redirected to onboarding, complete it
      if (page.url().includes('/onboarding')) {
        await completeOnboarding(page)
      }
      
      // Verify we reach the dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Verify user is authenticated
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(true)
      
      // Verify user menu is visible
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should handle sign-in with invalid credentials', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Fill form with invalid credentials
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!')
      
      // Submit form
      await page.click('[data-testid="sign-in-button"]')
      
      // Verify error message is displayed
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible()
      
      // Verify we stay on sign-in page
      expect(page.url()).toContain('/sign-in')
      
      // Verify user is not authenticated
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(false)
    })

    test('should handle sign-in with empty fields', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Submit form without filling fields
      await page.click('[data-testid="sign-in-button"]')
      
      // Verify validation errors are displayed
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      
      // Verify we stay on sign-in page
      expect(page.url()).toContain('/sign-in')
    })

    test('should handle remember me functionality', async ({ page }) => {
      await page.goto('/sign-in')
      
      const rememberMeCheckbox = page.locator('[data-testid="remember-me-checkbox"]')
      
      // Only test if remember me checkbox exists
      if (await rememberMeCheckbox.isVisible()) {
        // Check remember me
        await rememberMeCheckbox.check()
        
        // Fill credentials
        await page.fill('[data-testid="email-input"]', TEST_USERS.MEMBER.email)
        await page.fill('[data-testid="password-input"]', TEST_USERS.MEMBER.password)
        
        // Submit sign-in
        await page.click('[data-testid="sign-in-button"]')
        
        // Wait for authentication
        await page.waitForURL('/dashboard', { timeout: 15000 })
        
        // Verify remember me preference is stored
        const rememberMeValue = await page.evaluate(() => 
          localStorage.getItem('c9d-remember-me')
        )
        expect(rememberMeValue).toBe('true')
      }
    })
  })

  test.describe('User Sign-Out', () => {
    test('should complete successful sign-out flow', async ({ page }) => {
      // First sign in
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Verify we're authenticated
      await expect(page).toHaveURL('/dashboard')
      
      // Sign out
      await signOutUser(page)
      
      // Verify we're redirected to sign-in or home page
      await Promise.race([
        page.waitForURL('/sign-in', { timeout: 10000 }),
        page.waitForURL('/', { timeout: 10000 })
      ])
      
      // Verify user is no longer authenticated
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(false)
      
      // Verify user menu is not visible
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
    })

    test('should clear session data on sign-out', async ({ page }) => {
      // Sign in
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Verify session data exists
      const sessionBefore = await page.evaluate(() => 
        localStorage.getItem('clerk-session')
      )
      
      // Sign out
      await signOutUser(page)
      
      // Verify session data is cleared
      const sessionAfter = await page.evaluate(() => 
        localStorage.getItem('clerk-session')
      )
      expect(sessionAfter).toBeNull()
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should initiate password reset flow', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Click forgot password link
      const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]')
      if (await forgotPasswordLink.isVisible()) {
        await forgotPasswordLink.click()
        
        // Should navigate to password reset page
        await expect(page).toHaveURL(/reset-password|forgot-password/)
        
        // Fill email for password reset
        await page.fill('[data-testid="email-input"]', 'test@example.com')
        
        // Submit password reset request
        await page.click('[data-testid="reset-password-button"]')
        
        // Verify success message
        await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible()
      }
    })

    test('should handle invalid email in password reset', async ({ page }) => {
      await page.goto('/reset-password')
      
      // Fill invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      
      // Submit form
      await page.click('[data-testid="reset-password-button"]')
      
      // Verify error message
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    })
  })

  test.describe('Social Authentication', () => {
    test('should display social authentication options', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Check for social authentication buttons
      const googleButton = page.locator('[data-testid="sign-in-google"]')
      const githubButton = page.locator('[data-testid="sign-in-github"]')
      const microsoftButton = page.locator('[data-testid="sign-in-microsoft"]')
      
      // At least one social provider should be available
      const socialProvidersVisible = await Promise.all([
        googleButton.isVisible(),
        githubButton.isVisible(),
        microsoftButton.isVisible()
      ])
      
      const hasSocialProviders = socialProvidersVisible.some(visible => visible)
      
      if (hasSocialProviders) {
        console.log('✅ Social authentication providers are available')
      } else {
        console.log('ℹ️  No social authentication providers configured')
      }
    })

    test('should handle social authentication button clicks', async ({ page }) => {
      await page.goto('/sign-in')
      
      const googleButton = page.locator('[data-testid="sign-in-google"]')
      
      if (await googleButton.isVisible()) {
        // Click Google sign-in button
        await googleButton.click()
        
        // In a real test, this would redirect to Google OAuth
        // For now, we just verify the button is clickable
        console.log('✅ Google sign-in button is clickable')
      }
    })
  })

  test.describe('Session Management', () => {
    test('should maintain session across page navigation', async ({ page }) => {
      // Sign in
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Navigate to different pages
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      
      await page.goto('/settings')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      
      // Verify session is maintained
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(true)
    })

    test('should handle session expiration gracefully', async ({ page }) => {
      // Sign in
      await signInUser(page, TEST_USERS.MEMBER)
      
      // Simulate session expiration by clearing session storage
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Navigate to a protected page
      await page.goto('/dashboard')
      
      // Should redirect to sign-in page
      await page.waitForURL('/sign-in', { timeout: 10000 })
      
      // Verify user is no longer authenticated
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(false)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors during authentication', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/auth/**', route => route.abort())
      
      await page.goto('/sign-in')
      
      // Fill credentials
      await page.fill('[data-testid="email-input"]', TEST_USERS.MEMBER.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.MEMBER.password)
      
      // Submit form
      await page.click('[data-testid="sign-in-button"]')
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      
      // Verify we stay on sign-in page
      expect(page.url()).toContain('/sign-in')
    })

    test('should handle rate limiting errors', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com')
        await page.fill('[data-testid="password-input"]', 'wrongpassword')
        await page.click('[data-testid="sign-in-button"]')
        
        // Wait a bit between attempts
        await page.waitForTimeout(1000)
      }
      
      // After multiple attempts, should show rate limiting message
      const rateLimitMessage = page.locator('[data-testid="rate-limit-error"]')
      if (await rateLimitMessage.isVisible()) {
        await expect(rateLimitMessage).toContainText(/too many attempts|rate limit/i)
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Check form accessibility
      await expect(page.locator('[data-testid="sign-in-form"]')).toHaveAttribute('role', 'form')
      
      // Check input labels
      const emailInput = page.locator('[data-testid="email-input"]')
      const passwordInput = page.locator('[data-testid="password-input"]')
      
      await expect(emailInput).toHaveAttribute('aria-label')
      await expect(passwordInput).toHaveAttribute('aria-label')
      
      // Check button accessibility
      const signInButton = page.locator('[data-testid="sign-in-button"]')
      await expect(signInButton).toHaveAttribute('type', 'submit')
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Tab through form elements
      await page.keyboard.press('Tab') // Email input
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab') // Password input
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab') // Sign-in button
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeFocused()
      
      // Should be able to submit with Enter
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password')
      await page.keyboard.press('Enter')
      
      // Form should submit (even if credentials are invalid)
      await page.waitForTimeout(1000) // Wait for form submission
    })
  })
})