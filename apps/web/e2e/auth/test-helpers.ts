/**
 * Helper utilities for authentication E2E tests
 */

import { Page, expect } from '@playwright/test'
import * as crypto from 'crypto'

export interface TestUser {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

/**
 * Generate a unique test email address
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  return `${prefix}_${timestamp}_${random}@example.com`
}

/**
 * Generate a secure test password
 */
export function generateTestPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each required character type
  password += 'A' // Uppercase
  password += 'a' // Lowercase
  password += '1' // Number
  password += '!' // Special
  
  // Add random characters
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Fill sign in form
 */
export async function fillSignInForm(page: Page, email: string, password: string) {
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
}

/**
 * Fill sign up form
 */
export async function fillSignUpForm(page: Page, user: TestUser) {
  await page.getByLabel('First Name').fill(user.firstName || 'Test')
  await page.getByLabel('Last Name').fill(user.lastName || 'User')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByLabel('Confirm Password').fill(user.password)
}

/**
 * Sign in a user
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await fillSignInForm(page, email, password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

/**
 * Sign out current user
 */
export async function signOut(page: Page) {
  // Click user menu
  await page.getByRole('button', { name: /user menu|account|profile/i }).click()
  
  // Click sign out
  await page.getByRole('menuitem', { name: /sign out|log out/i }).click()
  
  // Wait for redirect
  await page.waitForURL('/sign-in')
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  try {
    // Check for dashboard or user menu
    await page.getByRole('button', { name: /user menu|account|profile/i }).waitFor({
      timeout: 5000,
      state: 'visible'
    })
    return true
  } catch {
    return false
  }
}

/**
 * Wait for and dismiss any alerts/toasts
 */
export async function dismissAlerts(page: Page) {
  const alerts = page.getByRole('alert')
  const count = await alerts.count()
  
  for (let i = 0; i < count; i++) {
    const alert = alerts.nth(i)
    const closeButton = alert.getByRole('button', { name: /close|dismiss/i })
    
    if (await closeButton.isVisible()) {
      await closeButton.click()
    }
  }
}

/**
 * Wait for form validation errors to appear
 */
export async function waitForValidationErrors(page: Page) {
  await page.waitForSelector('[role="alert"]', { timeout: 5000 })
}

/**
 * Get all validation error messages
 */
export async function getValidationErrors(page: Page): Promise<string[]> {
  const alerts = await page.getByRole('alert').allTextContents()
  return alerts.filter(text => text.trim().length > 0)
}

/**
 * Test social OAuth flow
 */
export async function testSocialAuth(page: Page, provider: 'google' | 'github' | 'microsoft') {
  const providerNames = {
    google: 'Google',
    github: 'GitHub',
    microsoft: 'Microsoft'
  }
  
  // Listen for popup
  const popupPromise = page.waitForEvent('popup')
  
  // Click provider button
  await page.getByRole('button', { 
    name: new RegExp(`continue with ${providerNames[provider]}`, 'i') 
  }).click()
  
  const popup = await popupPromise
  
  // Return popup for further testing
  return popup
}

/**
 * Mock failed network request
 */
export async function mockNetworkError(page: Page) {
  await page.route('**/api/auth/**', route => {
    route.abort('failed')
  })
}

/**
 * Mock slow network
 */
export async function mockSlowNetwork(page: Page, delay: number = 3000) {
  await page.route('**/api/auth/**', async route => {
    await new Promise(resolve => setTimeout(resolve, delay))
    await route.continue()
  })
}

/**
 * Check password strength indicator
 */
export async function checkPasswordStrength(page: Page, expectedStrength: 'weak' | 'medium' | 'strong') {
  const strengthIndicator = page.getByText(new RegExp(expectedStrength, 'i'))
  await expect(strengthIndicator).toBeVisible()
}

/**
 * Intercept and validate API calls
 */
export async function interceptAuthAPI(page: Page, callback: (request: any) => void) {
  page.on('request', request => {
    if (request.url().includes('/api/auth/')) {
      callback(request)
    }
  })
}

/**
 * Wait for successful redirect after auth
 */
export async function waitForAuthRedirect(page: Page, expectedUrl: string = '/dashboard') {
  await page.waitForURL(expectedUrl, { timeout: 10000 })
}

/**
 * Create a test user via API
 */
export async function createTestUser(page: Page): Promise<TestUser> {
  const user: TestUser = {
    email: generateTestEmail('api'),
    password: generateTestPassword(),
    firstName: 'API',
    lastName: 'Test'
  }
  
  // This would make an API call to create user
  // For now, return the generated user
  return user
}

/**
 * Clean up test user
 */
export async function deleteTestUser(page: Page, email: string) {
  // This would make an API call to delete user
  // Implementation depends on your API
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page, formType: 'signin' | 'signup') {
  const expectedFocusOrder = formType === 'signin' 
    ? ['email', 'password', 'remember', 'submit']
    : ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'terms', 'submit']
  
  for (const field of expectedFocusOrder) {
    await page.keyboard.press('Tab')
    
    // Verify focus
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || document.activeElement?.getAttribute('type'))
    expect(focused).toContain(field)
  }
}

/**
 * Check accessibility attributes
 */
export async function checkAccessibility(page: Page) {
  // Check for main landmark
  await expect(page.getByRole('main')).toBeVisible()
  
  // Check form labels
  const inputs = page.locator('input:not([type="hidden"])')
  const count = await inputs.count()
  
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i)
    const label = await input.getAttribute('aria-label') || await input.getAttribute('id')
    expect(label).toBeTruthy()
  }
  
  // Check for skip links
  const skipLink = page.getByRole('link', { name: /skip to/i })
  if (await skipLink.isVisible()) {
    await expect(skipLink).toHaveAttribute('href')
  }
}
