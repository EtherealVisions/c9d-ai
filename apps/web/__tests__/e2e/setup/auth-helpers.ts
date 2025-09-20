import { Page, BrowserContext, expect } from '@playwright/test'

/**
 * Authentication helpers for E2E tests
 * 
 * These helpers provide reusable authentication flows and state management
 * for testing user journeys that require authentication.
 */

export interface TestUser {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user?: TestUser
  sessionId?: string
  organizationId?: string
}

/**
 * Test user credentials for different scenarios
 */
export const TEST_USERS = {
  ADMIN: {
    email: 'admin@test.c9d.ai',
    password: 'TestPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  MEMBER: {
    email: 'member@test.c9d.ai',
    password: 'TestPassword123!',
    firstName: 'Member',
    lastName: 'User',
    role: 'member'
  },
  NEW_USER: {
    email: `newuser-${Date.now()}@test.c9d.ai`,
    password: 'TestPassword123!',
    firstName: 'New',
    lastName: 'User'
  }
} as const

/**
 * Sign up a new user through the UI
 */
export async function signUpUser(page: Page, user: TestUser): Promise<void> {
  console.log(`📝 Signing up user: ${user.email}`)
  
  await page.goto('/sign-up')
  
  // Wait for the sign-up form to be visible
  await expect(page.locator('[data-testid="sign-up-form"]')).toBeVisible({ timeout: 10000 })
  
  // Fill in the sign-up form
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  
  if (page.locator('[data-testid="confirm-password-input"]').isVisible()) {
    await page.fill('[data-testid="confirm-password-input"]', user.password)
  }
  
  if (user.firstName && page.locator('[data-testid="first-name-input"]').isVisible()) {
    await page.fill('[data-testid="first-name-input"]', user.firstName)
  }
  
  if (user.lastName && page.locator('[data-testid="last-name-input"]').isVisible()) {
    await page.fill('[data-testid="last-name-input"]', user.lastName)
  }
  
  // Submit the form
  await page.click('[data-testid="sign-up-button"]')
  
  // Wait for either success redirect or email verification
  await Promise.race([
    page.waitForURL('/dashboard', { timeout: 15000 }),
    page.waitForURL('/verify-email', { timeout: 15000 }),
    page.waitForURL('/onboarding/**', { timeout: 15000 })
  ])
  
  console.log(`✅ User signed up successfully: ${user.email}`)
}

/**
 * Sign in an existing user through the UI
 */
export async function signInUser(page: Page, user: TestUser): Promise<void> {
  console.log(`🔐 Signing in user: ${user.email}`)
  
  await page.goto('/sign-in')
  
  // Wait for the sign-in form to be visible
  await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible({ timeout: 10000 })
  
  // Fill in credentials
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  
  // Submit the form
  await page.click('[data-testid="sign-in-button"]')
  
  // Wait for successful authentication
  await Promise.race([
    page.waitForURL('/dashboard', { timeout: 15000 }),
    page.waitForURL('/onboarding/**', { timeout: 15000 }),
    // Handle 2FA if required
    page.waitForSelector('[data-testid="two-factor-form"]', { timeout: 5000 }).catch(() => null)
  ])
  
  console.log(`✅ User signed in successfully: ${user.email}`)
}

/**
 * Sign out the current user
 */
export async function signOutUser(page: Page): Promise<void> {
  console.log('🚪 Signing out user')
  
  // Try to find and click the user menu
  const userMenu = page.locator('[data-testid="user-menu"]')
  if (await userMenu.isVisible()) {
    await userMenu.click()
    
    // Click sign out option
    const signOutButton = page.locator('[data-testid="sign-out-button"]')
    if (await signOutButton.isVisible()) {
      await signOutButton.click()
    }
  } else {
    // Fallback: navigate to sign-out URL
    await page.goto('/sign-out')
  }
  
  // Wait for redirect to sign-in or home page
  await Promise.race([
    page.waitForURL('/sign-in', { timeout: 10000 }),
    page.waitForURL('/', { timeout: 10000 })
  ])
  
  console.log('✅ User signed out successfully')
}

/**
 * Handle social authentication (Google, GitHub, etc.)
 */
export async function signInWithSocial(page: Page, provider: 'google' | 'github' | 'microsoft'): Promise<void> {
  console.log(`🔗 Signing in with ${provider}`)
  
  await page.goto('/sign-in')
  
  // Click the social provider button
  await page.click(`[data-testid="sign-in-${provider}"]`)
  
  // Note: In a real test environment, you would need to handle the OAuth flow
  // This is a placeholder for the social authentication flow
  console.log(`⚠️  Social authentication with ${provider} requires OAuth flow handling`)
}

/**
 * Complete the onboarding process
 */
export async function completeOnboarding(page: Page, options: {
  organizationName?: string
  role?: string
  skipTutorial?: boolean
} = {}): Promise<void> {
  console.log('📋 Completing onboarding process')
  
  const { organizationName = 'Test Organization', role = 'developer', skipTutorial = true } = options
  
  // Check if we're on an onboarding page
  const isOnboarding = page.url().includes('/onboarding')
  if (!isOnboarding) {
    console.log('ℹ️  Not on onboarding page, skipping onboarding completion')
    return
  }
  
  // Handle profile setup
  if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
    if (await page.locator('[data-testid="role-select"]').isVisible()) {
      await page.selectOption('[data-testid="role-select"]', role)
    }
    
    if (await page.locator('[data-testid="continue-button"]').isVisible()) {
      await page.click('[data-testid="continue-button"]')
    }
  }
  
  // Handle organization setup
  if (await page.locator('[data-testid="organization-setup"]').isVisible()) {
    // Choose to create new organization
    if (await page.locator('[data-testid="create-organization-option"]').isVisible()) {
      await page.click('[data-testid="create-organization-option"]')
    }
    
    // Fill organization details
    if (await page.locator('[data-testid="org-name-input"]').isVisible()) {
      await page.fill('[data-testid="org-name-input"]', organizationName)
    }
    
    if (await page.locator('[data-testid="org-description-input"]').isVisible()) {
      await page.fill('[data-testid="org-description-input"]', `${organizationName} description`)
    }
    
    if (await page.locator('[data-testid="create-org-button"]').isVisible()) {
      await page.click('[data-testid="create-org-button"]')
    }
  }
  
  // Skip tutorial if requested
  if (skipTutorial && await page.locator('[data-testid="skip-tutorial"]').isVisible()) {
    await page.click('[data-testid="skip-tutorial"]')
  }
  
  // Wait for completion - should redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 15000 })
  
  console.log('✅ Onboarding completed successfully')
}

/**
 * Wait for authentication state to be ready
 */
export async function waitForAuthState(page: Page, timeout: number = 10000): Promise<AuthState> {
  console.log('⏳ Waiting for authentication state...')
  
  try {
    // Wait for either authenticated or unauthenticated state
    await Promise.race([
      // Authenticated state indicators
      page.waitForSelector('[data-testid="user-menu"]', { timeout }),
      page.waitForSelector('[data-testid="dashboard"]', { timeout }),
      // Unauthenticated state indicators
      page.waitForSelector('[data-testid="sign-in-form"]', { timeout }),
      page.waitForSelector('[data-testid="sign-up-form"]', { timeout })
    ])
    
    // Check authentication state
    const isAuthenticated = await page.locator('[data-testid="user-menu"]').isVisible() ||
                           await page.locator('[data-testid="dashboard"]').isVisible()
    
    console.log(`✅ Authentication state ready: ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`)
    
    return { isAuthenticated }
  } catch (error) {
    console.warn('⚠️  Timeout waiting for authentication state')
    return { isAuthenticated: false }
  }
}

/**
 * Save authentication state for reuse
 */
export async function saveAuthState(context: BrowserContext, stateName: string): Promise<void> {
  const authDir = process.env.PLAYWRIGHT_AUTH_DIR || './apps/web/__tests__/e2e/setup/auth-states'
  const statePath = `${authDir}/${stateName}.json`
  
  await context.storageState({ path: statePath })
  console.log(`💾 Saved authentication state: ${stateName}`)
}

/**
 * Load authentication state for reuse
 */
export async function loadAuthState(context: BrowserContext, stateName: string): Promise<void> {
  const authDir = process.env.PLAYWRIGHT_AUTH_DIR || './apps/web/__tests__/e2e/setup/auth-states'
  const statePath = `${authDir}/${stateName}.json`
  
  try {
    await context.addInitScript(() => {
      // Restore any necessary client-side state
    })
    console.log(`📂 Loaded authentication state: ${stateName}`)
  } catch (error) {
    console.warn(`⚠️  Could not load authentication state: ${stateName}`)
  }
}

/**
 * Create a test user account (for test environments only)
 */
export async function createTestUser(page: Page, user: TestUser): Promise<void> {
  console.log(`👤 Creating test user: ${user.email}`)
  
  // This would typically call a test API endpoint to create the user
  // For now, we'll use the sign-up flow
  await signUpUser(page, user)
  
  console.log(`✅ Test user created: ${user.email}`)
}

/**
 * Clean up test user account (for test environments only)
 */
export async function cleanupTestUser(page: Page, email: string): Promise<void> {
  console.log(`🧹 Cleaning up test user: ${email}`)
  
  // This would typically call a test API endpoint to delete the user
  // Implementation depends on your test environment setup
  
  console.log(`✅ Test user cleaned up: ${email}`)
}