import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load test user credentials from generated file
const testUsersFile = path.join(__dirname, 'test-users.json')
let testUsersData = { users: [] }

try {
  testUsersData = JSON.parse(fs.readFileSync(testUsersFile, 'utf-8'))
} catch (error) {
  console.error('Failed to load test users. Run: node scripts/create-test-users.js')
  process.exit(1)
}

// Test user credentials
const TEST_USERS = {
  admin: testUsersData.users.find(u => u.email === 'admin@example.com') || {
    email: 'admin@example.com',
    password: 'not-found',
    firstName: 'Admin',
    lastName: 'User'
  },
  developer: testUsersData.users.find(u => u.email === 'developer@example.com') || {
    email: 'developer@example.com',
    password: 'not-found',
    firstName: 'Dev',
    lastName: 'User'
  },
  testUser: testUsersData.users.find(u => u.email === 'testuser@example.com') || {
    email: 'testuser@example.com',
    password: 'not-found',
    firstName: 'Test',
    lastName: 'User'
  }
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3008')
  })

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    // Try to access protected route
    await page.goto('http://localhost:3008/dashboard')
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/\/sign-in/)
    // Use the specific h1 with id to avoid multiple matches
    await expect(page.locator('h1#page-title')).toContainText('Welcome back')
  })

  test('should allow users to sign in with email/password', async ({ page }) => {
    // Navigate to sign-in
    await page.goto('http://localhost:3008/sign-in')
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USERS.developer.email)
    await page.fill('input[type="password"]', TEST_USERS.developer.password)
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Sign In")')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard')
    
    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText('C9d Dashboard')
    
    // Verify user is authenticated
    await expect(page.locator('[data-testid="user-button"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to sign-in
    await page.goto('http://localhost:3008/sign-in')
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Sign In")')
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toContainText(/Invalid|incorrect|wrong/i)
  })

  test('should allow users to sign out', async ({ page }) => {
    // First, sign in
    await page.goto('http://localhost:3008/sign-in')
    await page.fill('input[type="email"]', TEST_USERS.testUser.email)
    await page.fill('input[type="password"]', TEST_USERS.testUser.password)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL('**/dashboard')
    
    // Click user button to open menu
    await page.click('[data-testid="user-button"]')
    
    // Click sign out
    await page.click('button:has-text("Sign out")')
    
    // Should be redirected to home or sign-in
    await expect(page).toHaveURL(/\/(sign-in|$)/)
  })

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Sign in
    await page.goto('http://localhost:3008/sign-in')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL('**/dashboard')
    
    // Refresh the page
    await page.reload()
    
    // Should still be on dashboard and authenticated
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('[data-testid="user-button"]')).toBeVisible()
  })

  test('should handle sign-up flow', async ({ page }) => {
    const timestamp = Date.now()
    const newUserEmail = `newuser${timestamp}@example.com`
    
    // Navigate to sign-up
    await page.goto('http://localhost:3008/sign-up')
    
    // Fill in registration form
    await page.fill('input[name="firstName"]', 'New')
    await page.fill('input[name="lastName"]', 'User')
    await page.fill('input[type="email"]', newUserEmail)
    await page.fill('input[name="password"]', 'NewUserPassword123!')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Sign Up")')
    
    // Should redirect to dashboard or verification page
    await expect(page).toHaveURL(/\/(dashboard|verify)/)
  })

  test('should show user profile information', async ({ page }) => {
    // Sign in as admin
    await page.goto('http://localhost:3008/sign-in')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL('**/dashboard')
    
    // Check for user information on dashboard
    await expect(page.locator('text=Admin User')).toBeVisible()
  })

  test('should handle API authentication', async ({ page, request }) => {
    // Sign in first to get cookies
    await page.goto('http://localhost:3008/sign-in')
    await page.fill('input[type="email"]', TEST_USERS.developer.email)
    await page.fill('input[type="password"]', TEST_USERS.developer.password)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL('**/dashboard')
    
    // Get cookies
    const cookies = await page.context().cookies()
    
    // Make authenticated API request
    const response = await request.get('http://localhost:3008/api/auth/me', {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    })
    
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.user.email).toBe(TEST_USERS.developer.email)
  })
})

test.describe('Protected Routes', () => {
  test('should protect dashboard routes', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/account',
      '/dashboard/organizations',
      '/dashboard/settings'
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:3008${route}`)
      await expect(page).toHaveURL(/\/sign-in/)
    }
  })
})

test.describe('Social Authentication', () => {
  test('should show social login options', async ({ page }) => {
    await page.goto('http://localhost:3008/sign-in')
    
    // Check for social auth buttons
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible()
    await expect(page.locator('button:has-text("Continue with Microsoft")')).toBeVisible()
  })
})
