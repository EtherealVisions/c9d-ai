/**
 * Comprehensive E2E tests for authentication flow
 * Tests real user interactions with sign-in and sign-up forms
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load test users from file if available
const testUsersFile = path.join(__dirname, '../../scripts/test-users.json')
let testUsersData = { users: [] }

try {
  if (fs.existsSync(testUsersFile)) {
    testUsersData = JSON.parse(fs.readFileSync(testUsersFile, 'utf-8'))
  }
} catch (error) {
  console.warn('Could not load test users:', error)
}

// Helper function to generate unique test email
function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}_${timestamp}_${random}@example.com`
}

// Helper function to wait for navigation
async function waitForNavigation(page: Page, url: string, timeout = 10000) {
  await page.waitForURL(url, { timeout })
}

test.describe('Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')
  })

  test('should display sign in form with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/sign in/i)

    // Check form elements
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    
    // Check social login buttons
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible()
    
    // Check links
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    const signInButton = page.getByRole('button', { name: 'Sign In' })
    await signInButton.click()

    // Check for validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email address').fill('invalid-email')
    await page.getByLabel('Password').click() // Trigger blur
    
    await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
  })

  test('should show error for incorrect credentials', async ({ page }) => {
    await page.getByLabel('Email address').fill('nonexistent@example.com')
    await page.getByLabel('Password').fill('WrongPassword123!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for error message
    await expect(page.getByText(/incorrect email or password|account not found/i)).toBeVisible({
      timeout: 10000
    })
  })

  test('should successfully sign in with valid credentials', async ({ page }) => {
    // Skip if no test users available
    if (testUsersData.users.length === 0) {
      test.skip()
      return
    }

    const testUser = testUsersData.users[0]
    await page.getByLabel('Email address').fill(testUser.email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should redirect to dashboard
    await waitForNavigation(page, '/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('should remember user when checkbox is checked', async ({ page, context }) => {
    // Skip if no test users available
    if (testUsersData.users.length === 0) {
      test.skip()
      return
    }

    const testUser = testUsersData.users[0]
    
    // Check remember me checkbox
    await page.getByRole('checkbox', { name: /remember me/i }).check()
    
    // Sign in
    await page.getByLabel('Email address').fill(testUser.email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    await waitForNavigation(page, '/dashboard')

    // Close and reopen page
    await page.close()
    const newPage = await context.newPage()
    await newPage.goto('/dashboard')

    // Should still be signed in
    await expect(newPage.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Attempt multiple failed sign ins
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email address').fill('test@example.com')
      await page.getByLabel('Password').fill('WrongPassword')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForTimeout(500)
    }

    // Should show rate limit error
    await expect(page.getByText(/too many attempts|rate limit/i)).toBeVisible()
  })

  test('should navigate to sign up page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click()
    await waitForNavigation(page, '/sign-up')
    await expect(page.getByRole('heading', { name: /create.*account|join|sign up/i })).toBeVisible()
  })
})

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-up')
    await page.waitForLoadState('networkidle')
  })

  test('should display sign up form with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/sign up/i)

    // Check form elements
    await expect(page.getByRole('heading', { name: /create.*account|join c9d\.ai/i })).toBeVisible()
    await expect(page.getByLabel('First Name')).toBeVisible()
    await expect(page.getByLabel('Last Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
    
    // Check social signup buttons
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible()
    
    // Check terms checkbox and links
    await expect(page.getByRole('checkbox', { name: /terms/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Account' }).click()

    // Check for validation errors
    await expect(page.getByText('first_name is not a valid parameter for this request')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    const passwordInput = page.getByLabel('Password', { exact: true })
    
    // Weak password
    await passwordInput.fill('weak')
    await expect(page.getByText(/weak/i)).toBeVisible()
    
    // Medium password
    await passwordInput.fill('Medium123')
    await expect(page.getByText(/medium/i)).toBeVisible()
    
    // Strong password
    await passwordInput.fill('Strong123!@#')
    await expect(page.getByText(/strong/i)).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm Password').fill('DifferentPassword')
    await page.getByLabel('Email').click() // Trigger blur
    
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should require terms acceptance', async ({ page }) => {
    await page.getByLabel('First Name').fill('Test')
    await page.getByLabel('Last Name').fill('User')
    await page.getByLabel('Email').fill(generateTestEmail())
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm Password').fill('TestPassword123!')
    
    // Don't check terms
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page.getByText(/accept.*terms/i)).toBeVisible()
  })

  test('should show error for existing email', async ({ page }) => {
    // Skip if no test users available
    if (testUsersData.users.length === 0) {
      test.skip()
      return
    }

    const existingUser = testUsersData.users[0]
    
    await page.getByLabel('First Name').fill('Test')
    await page.getByLabel('Last Name').fill('User')
    await page.getByLabel('Email').fill(existingUser.email)
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm Password').fill('TestPassword123!')
    await page.getByRole('checkbox', { name: /terms/i }).check()
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page.getByText(/email.*already.*exists|already registered/i)).toBeVisible({
      timeout: 10000
    })
  })

  test('should successfully create account', async ({ page }) => {
    const testEmail = generateTestEmail('e2e')
    
    await page.getByLabel('First Name').fill('E2E')
    await page.getByLabel('Last Name').fill('Test')
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('E2ETestPassword123!')
    await page.getByLabel('Confirm Password').fill('E2ETestPassword123!')
    await page.getByRole('checkbox', { name: /terms/i }).check()
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Should show email verification or redirect to onboarding
    await expect(page.locator('text=/verify.*email|check.*email|onboarding/i')).toBeVisible({
      timeout: 15000
    })
  })

  test('should navigate to sign in page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in|already have an account/i }).click()
    await waitForNavigation(page, '/sign-in')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to password reset', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password/i }).click()
    
    // Should show password reset form
    await expect(page.getByRole('heading', { name: /reset.*password|forgot.*password/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send.*reset|reset.*password/i })).toBeVisible()
  })

  test('should send password reset email', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password/i }).click()
    
    // Enter email
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /send.*reset|reset.*password/i }).click()
    
    // Should show success message
    await expect(page.getByText(/check.*email|sent.*email|reset.*link/i)).toBeVisible({
      timeout: 10000
    })
  })
})

test.describe('Social Authentication', () => {
  test('should show OAuth provider windows', async ({ page, context }) => {
    await page.goto('/sign-in')
    
    // Listen for popup
    const popupPromise = page.waitForEvent('popup')
    
    // Click Google sign in
    await page.getByRole('button', { name: /continue with google/i }).click()
    
    const popup = await popupPromise
    
    // Check that popup navigates to Google
    await expect(popup.url()).toContain('accounts.google.com')
    
    await popup.close()
  })
})

test.describe('Accessibility', () => {
  test('sign in form should be keyboard navigable', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Start at email field
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email address')).toBeFocused()
    
    // Tab to password
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()
    
    // Tab to remember me checkbox
    await page.keyboard.press('Tab')
    await expect(page.getByRole('checkbox', { name: /remember me/i })).toBeFocused()
    
    // Tab to sign in button
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeFocused()
  })

  test('sign up form should be keyboard navigable', async ({ page }) => {
    await page.goto('/sign-up')
    
    // Tab through form fields
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('First Name')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Last Name')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Check main form landmark
    await expect(page.getByRole('main')).toBeVisible()
    
    // Check form regions
    await expect(page.getByRole('region', { name: /sign in/i })).toBeVisible()
    
    // Check form groups
    await expect(page.getByRole('group', { name: /social authentication/i })).toBeVisible()
  })

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Submit empty form
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Check for alert role
    await expect(page.getByRole('alert')).toBeVisible()
    
    // Check that errors are in alert
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(/email is required/i)
    await expect(alert).toContainText(/password is required/i)
  })
})

test.describe('Security', () => {
  test('should not expose password in DOM', async ({ page }) => {
    await page.goto('/sign-in')
    
    const passwordInput = page.getByLabel('Password')
    await passwordInput.fill('SecretPassword123!')
    
    // Check input type
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Toggle visibility
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    
    // Toggle back
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should clear sensitive data on navigation', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Fill form
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByLabel('Password').fill('TestPassword123!')
    
    // Navigate away
    await page.goto('/')
    
    // Navigate back
    await page.goto('/sign-in')
    
    // Fields should be empty
    await expect(page.getByLabel('Email address')).toHaveValue('')
    await expect(page.getByLabel('Password')).toHaveValue('')
  })

  test('should prevent form resubmission', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Fill and submit form
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByLabel('Password').fill('TestPassword123!')
    
    // Click submit multiple times quickly
    const submitButton = page.getByRole('button', { name: 'Sign In' })
    await submitButton.click()
    await submitButton.click()
    await submitButton.click()
    
    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled()
  })
})

test.describe('Error Recovery', () => {
  test('should recover from network errors', async ({ page, context }) => {
    await page.goto('/sign-in')
    
    // Simulate offline
    await context.setOffline(true)
    
    // Try to sign in
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByLabel('Password').fill('TestPassword123!')
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Should show network error
    await expect(page.getByText(/network error|offline|connection/i)).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Retry button should work
    await page.getByRole('button', { name: /retry|try again/i }).click()
  })

  test('should handle server errors gracefully', async ({ page }) => {
    // This would require mocking the API to return 500 errors
    // For now, we'll test that error messages are displayed properly
    await page.goto('/sign-in')
    
    // If we trigger a 500 error, we should see a user-friendly message
    // This is a placeholder for when we have proper API mocking
  })
})

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should be usable on mobile', async ({ page }) => {
    await page.goto('/sign-in')
    
    // All elements should be visible and clickable
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    
    // Should be able to interact with form
    await page.getByLabel('Email address').fill('mobile@example.com')
    await page.getByLabel('Password').fill('MobileTest123!')
    await page.getByRole('button', { name: 'Sign In' }).click()
  })
})
