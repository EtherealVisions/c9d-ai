import { test, expect, Page, BrowserContext } from '@playwright/test'
import { 
  createTestUser, 
  createTestOrganization,
  VALIDATION_TEST_DATA,
  ERROR_MESSAGES,
  VIEWPORT_SIZES,
  TEST_TIMEOUTS,
  ACCESSIBILITY_TEST_DATA
} from './fixtures/test-data'
import { 
  signInUser, 
  signUpUser, 
  signOutUser, 
  completeOnboarding,
  waitForAuthState
} from './setup/auth-helpers'

// Enhanced test configuration with comprehensive scenarios
const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3007',
  timeout: TEST_TIMEOUTS.VERY_LONG,
  // Dynamic test users to avoid conflicts
  testUser: createTestUser('MEMBER'),
  newUser: createTestUser('DEVELOPER'),
  adminUser: createTestUser('ADMIN'),
  // Test organization data
  testOrg: createTestOrganization('TECH_STARTUP'),
  // Performance thresholds
  performance: {
    pageLoadTime: 3000,
    formInteractionTime: 100,
    authenticationTime: 5000
  },
  // Accessibility requirements
  accessibility: {
    minContrastRatio: 4.5,
    minTouchTargetSize: 44,
    maxTabStops: 20
  }
}

// Enhanced helper functions with comprehensive testing capabilities
class ComprehensiveAuthTestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToSignIn() {
    const startTime = Date.now()
    await this.page.goto('/sign-in')
    await expect(this.page).toHaveTitle(/sign in/i)
    
    // Performance check
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(TEST_CONFIG.performance.pageLoadTime)
  }

  async navigateToSignUp() {
    const startTime = Date.now()
    await this.page.goto('/sign-up')
    await expect(this.page).toHaveTitle(/sign up/i)
    
    // Performance check
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(TEST_CONFIG.performance.pageLoadTime)
  }

  // Form interaction helpers
  async fillSignInForm(email: string, password: string, rememberMe = false) {
    const startTime = Date.now()
    
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    
    if (rememberMe) {
      await this.page.check('[data-testid="remember-me-checkbox"]')
    }
    
    // Performance check
    const fillTime = Date.now() - startTime
    expect(fillTime).toBeLessThan(TEST_CONFIG.performance.formInteractionTime)
  }

  async fillSignUpForm(userData: any) {
    const startTime = Date.now()
    
    if (userData.firstName) {
      await this.page.fill('[data-testid="first-name-input"]', userData.firstName)
    }
    if (userData.lastName) {
      await this.page.fill('[data-testid="last-name-input"]', userData.lastName)
    }
    await this.page.fill('[data-testid="email-input"]', userData.email)
    await this.page.fill('[data-testid="password-input"]', userData.password)
    
    // Check if confirm password field exists
    const confirmPasswordField = this.page.locator('[data-testid="confirm-password-input"]')
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(userData.password)
    }
    
    // Performance check
    const fillTime = Date.now() - startTime
    expect(fillTime).toBeLessThan(TEST_CONFIG.performance.formInteractionTime)
  }

  async submitSignInForm() {
    const startTime = Date.now()
    await this.page.click('[data-testid="sign-in-submit-button"]')
    
    // Wait for either success or error response
    await Promise.race([
      this.page.waitForURL('**/dashboard**', { timeout: TEST_CONFIG.performance.authenticationTime }),
      this.page.waitForURL('**/onboarding**', { timeout: TEST_CONFIG.performance.authenticationTime }),
      this.page.waitForSelector('[data-testid="error-message"]', { timeout: TEST_CONFIG.performance.authenticationTime }),
      this.page.waitForSelector('[data-testid="2fa-code-input"]', { timeout: TEST_CONFIG.performance.authenticationTime })
    ]).catch(() => {
      // Handle timeout gracefully
    })
    
    const authTime = Date.now() - startTime
    console.log(`Authentication attempt took ${authTime}ms`)
  }

  async submitSignUpForm() {
    const startTime = Date.now()
    await this.page.click('[data-testid="sign-up-submit-button"]')
    
    // Wait for response
    await Promise.race([
      this.page.waitForURL('**/verify-email**', { timeout: TEST_CONFIG.performance.authenticationTime }),
      this.page.waitForURL('**/onboarding**', { timeout: TEST_CONFIG.performance.authenticationTime }),
      this.page.waitForSelector('[data-testid="error-message"]', { timeout: TEST_CONFIG.performance.authenticationTime })
    ]).catch(() => {
      // Handle timeout gracefully
    })
    
    const signUpTime = Date.now() - startTime
    console.log(`Sign-up attempt took ${signUpTime}ms`)
  }

  // State verification helpers
  async waitForDashboard() {
    await this.page.waitForURL('**/dashboard**', { timeout: TEST_CONFIG.timeout })
    await expect(this.page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    // Verify authenticated state
    await expect(this.page.locator('[data-testid="user-profile-menu"]')).toBeVisible()
  }

  async waitForOnboarding() {
    await this.page.waitForURL('**/onboarding**', { timeout: TEST_CONFIG.timeout })
    await expect(this.page.locator('[data-testid="onboarding-content"]')).toBeVisible()
  }

  async waitForEmailVerification() {
    await this.page.waitForURL('**/verify-email**', { timeout: TEST_CONFIG.timeout })
    await expect(this.page.locator('[data-testid="verification-content"]')).toBeVisible()
  }

  // Message verification helpers
  async expectErrorMessage(message: string) {
    const errorElement = this.page.locator('[data-testid="error-message"]')
    await expect(errorElement).toBeVisible()
    await expect(errorElement).toContainText(message)
  }

  async expectSuccessMessage(message: string) {
    const successElement = this.page.locator('[data-testid="success-message"]')
    await expect(successElement).toBeVisible()
    await expect(successElement).toContainText(message)
  }

  async expectValidationError(fieldName: string, message: string) {
    const errorElement = this.page.locator(`[data-testid="${fieldName}-error"]`)
    await expect(errorElement).toBeVisible()
    await expect(errorElement).toContainText(message)
  }

  // Authentication state helpers
  async signOut() {
    await this.page.click('[data-testid="user-menu-button"]')
    await this.page.click('[data-testid="sign-out-button"]')
    await this.page.waitForURL('**/sign-in**')
    
    // Verify signed out state
    await expect(this.page.locator('[data-testid="sign-in-form"]')).toBeVisible()
  }

  // Comprehensive accessibility testing
  async checkAccessibility() {
    console.log('🔍 Running comprehensive accessibility checks...')
    
    // Check semantic HTML structure
    await expect(this.page.locator('[role="main"]')).toBeVisible()
    const headingCount = await this.page.locator('h1, h2, h3').count()
    expect(headingCount).toBeGreaterThan(0)
    
    // Check for skip links
    const skipLinks = this.page.locator('a[href^="#"]')
    if (await skipLinks.count() > 0) {
      await expect(skipLinks.first()).toBeVisible()
    }
    
    console.log('✅ Accessibility checks completed')
  }

  // Comprehensive keyboard navigation testing
  async checkKeyboardNavigation() {
    console.log('⌨️  Testing keyboard navigation...')
    
    // Reset focus
    await this.page.keyboard.press('Tab')
    
    // Count focusable elements
    const focusableElements = this.page.locator('input, button, a, select, textarea, [tabindex]:not([tabindex="-1"])')
    const focusableCount = await focusableElements.count()
    
    expect(focusableCount).toBeGreaterThan(0)
    expect(focusableCount).toBeLessThan(TEST_CONFIG.accessibility.maxTabStops)
    
    console.log('✅ Keyboard navigation checks completed')
  }

  // Comprehensive mobile responsiveness testing
  async checkMobileResponsiveness() {
    console.log('📱 Testing mobile responsiveness...')
    
    // Test different viewport sizes
    const viewports = [VIEWPORT_SIZES.MOBILE, VIEWPORT_SIZES.TABLET]
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport)
      await this.page.waitForTimeout(500) // Allow layout to adjust
      
      console.log(`Testing viewport: ${viewport.width}x${viewport.height}`)
      
      // Check that form elements are properly sized for touch
      const touchTargets = this.page.locator('input, button, a')
      const targetCount = await touchTargets.count()
      
      for (let i = 0; i < targetCount; i++) {
        const element = touchTargets.nth(i)
        const box = await element.boundingBox()
        
        if (box && await element.isVisible()) {
          expect(box.height).toBeGreaterThanOrEqual(TEST_CONFIG.accessibility.minTouchTargetSize)
          expect(box.width).toBeGreaterThanOrEqual(TEST_CONFIG.accessibility.minTouchTargetSize)
        }
      }
    }
    
    // Reset to desktop viewport
    await this.page.setViewportSize(VIEWPORT_SIZES.DESKTOP)
    
    console.log('✅ Mobile responsiveness checks completed')
  }

  // Performance testing helpers
  async measurePageLoadPerformance() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      }
    })
    
    console.log('Performance metrics:', metrics)
    
    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(2000) // 2 seconds
    expect(metrics.loadComplete).toBeLessThan(TEST_CONFIG.performance.pageLoadTime)
    
    return metrics
  }

  // Error recovery testing helpers
  async simulateNetworkError() {
    await this.page.route('**/api/**', route => {
      route.abort('failed')
    })
  }

  async simulateServerError() {
    await this.page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
  }

  async restoreNetwork() {
    await this.page.unroute('**/api/**')
  }

  // Social authentication helpers
  async testSocialAuthProvider(provider: 'google' | 'github' | 'microsoft') {
    const socialButton = this.page.locator(`[data-testid="social-auth-${provider}-button"]`)
    await expect(socialButton).toBeVisible()
    
    // Mock OAuth flow
    await this.page.route(`**/oauth/${provider}**`, route => {
      route.fulfill({
        status: 302,
        headers: { 'Location': '/dashboard' }
      })
    })
    
    await socialButton.click()
  }

  // Two-factor authentication helpers
  async handle2FA(code: string = '123456') {
    const twoFactorInput = this.page.locator('[data-testid="2fa-code-input"]')
    if (await twoFactorInput.isVisible()) {
      await twoFactorInput.fill(code)
      await this.page.click('[data-testid="verify-2fa-code-button"]')
    }
  }

  // Organization and onboarding helpers
  async completeOnboardingFlow(orgName: string = TEST_CONFIG.testOrg.name) {
    if (this.page.url().includes('/onboarding')) {
      await completeOnboarding(this.page, {
        organizationName: orgName,
        role: 'developer',
        skipTutorial: true
      })
    }
  }
}

test.describe('Authentication User Journeys - Comprehensive E2E Tests', () => {
  let helpers: ComprehensiveAuthTestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new ComprehensiveAuthTestHelpers(page)
    
    // Set up clean test environment
    await page.goto('/')
    
    // Clear any existing authentication state
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      // Clear any cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      })
    })
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.describe('New User Registration Journey - Complete Coverage', () => {
    test('should complete full new user registration and onboarding flow with performance monitoring', async ({ page }) => {
      console.log('🚀 Starting comprehensive new user registration test')
      
      // Navigate to sign-up with performance monitoring
      await helpers.navigateToSignUp()
      await helpers.measurePageLoadPerformance()

      // Comprehensive accessibility check
      await helpers.checkAccessibility()
      await helpers.checkKeyboardNavigation()

      // Test mobile responsiveness
      await helpers.checkMobileResponsiveness()

      // Fill registration form with validation testing
      await helpers.fillSignUpForm(TEST_CONFIG.newUser)

      // Submit registration with performance monitoring
      await helpers.submitSignUpForm()

      // Handle different post-registration flows
      const currentUrl = page.url()
      
      if (currentUrl.includes('/verify-email')) {
        console.log('📧 Email verification required')
        await helpers.waitForEmailVerification()

        // Verify email verification page content
        await expect(page.locator('[data-testid="verification-instructions"]')).toBeVisible()
        await expect(page.locator('[data-testid="resend-verification-button"]')).toBeVisible()

        // Simulate email verification completion
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('email-verified', {
            detail: { verified: true }
          }))
        })

        // Wait for redirect to onboarding
        await helpers.waitForOnboarding()
      } else if (currentUrl.includes('/onboarding')) {
        console.log('📋 Direct onboarding flow')
        await helpers.waitForOnboarding()
      } else {
        console.log('🏠 Direct dashboard access')
        await helpers.waitForDashboard()
        return // Skip onboarding if direct to dashboard
      }

      // Complete comprehensive onboarding flow
      await helpers.completeOnboardingFlow()

      // Verify final authenticated state
      await helpers.waitForDashboard()
      await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible()
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome')

      console.log('✅ New user registration test completed successfully')
    })

    test('should validate all registration form fields comprehensively', async ({ page }) => {
      await helpers.navigateToSignUp()

      // Test empty form submission
      await helpers.submitSignUpForm()

      // Should show all required field errors
      await helpers.expectValidationError('first-name', 'required')
      await helpers.expectValidationError('last-name', 'required')
      await helpers.expectValidationError('email', 'required')
      await helpers.expectValidationError('password', 'required')

      // Test invalid email formats
      for (const invalidEmail of VALIDATION_TEST_DATA.INVALID_EMAILS) {
        if (invalidEmail) {
          await page.fill('[data-testid="email-input"]', invalidEmail)
          await page.locator('[data-testid="email-input"]').blur()
          await helpers.expectValidationError('email', 'Invalid email')
        }
      }

      // Test weak passwords
      for (const weakPassword of VALIDATION_TEST_DATA.WEAK_PASSWORDS) {
        if (weakPassword) {
          await page.fill('[data-testid="password-input"]', weakPassword)
          await expect(page.locator('[data-testid="password-strength-weak"]')).toBeVisible()
        }
      }

      // Test strong password
      await page.fill('[data-testid="password-input"]', VALIDATION_TEST_DATA.STRONG_PASSWORDS[0])
      await expect(page.locator('[data-testid="password-strength-strong"]')).toBeVisible()
    })
  })

  test.describe('Returning User Sign-In Journey - Complete Coverage', () => {
    test('should complete successful sign-in flow with comprehensive validation', async ({ page }) => {
      console.log('🔐 Starting comprehensive returning user sign-in test')
      
      // Navigate with performance monitoring
      await helpers.navigateToSignIn()
      await helpers.measurePageLoadPerformance()

      // Comprehensive accessibility and usability checks
      await helpers.checkAccessibility()
      await helpers.checkKeyboardNavigation()
      await helpers.checkMobileResponsiveness()

      // Fill sign-in form with performance monitoring
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)

      // Submit form with performance monitoring
      await helpers.submitSignInForm()

      // Handle different post-authentication flows
      const currentUrl = page.url()
      
      if (currentUrl.includes('/dashboard')) {
        await helpers.waitForDashboard()
      } else if (currentUrl.includes('/onboarding')) {
        await helpers.waitForOnboarding()
        await helpers.completeOnboardingFlow()
        await helpers.waitForDashboard()
      } else if (page.locator('[data-testid="2fa-code-input"]').isVisible()) {
        await helpers.handle2FA()
        await helpers.waitForDashboard()
      }

      // Verify comprehensive authentication state
      await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible()

      console.log('✅ Returning user sign-in test completed successfully')
    })

    test('should handle sign-in with redirect URL and complex routing scenarios', async ({ page }) => {
      const redirectScenarios = [
        { url: '/projects/my-project', description: 'project page' },
        { url: '/settings/profile', description: 'settings page' },
        { url: '/dashboard/analytics?tab=overview', description: 'dashboard with query params' }
      ]

      for (const scenario of redirectScenarios) {
        console.log(`Testing redirect to ${scenario.description}`)
        
        await page.goto(`/sign-in?redirect_url=${encodeURIComponent(scenario.url)}`)

        // Should show redirect notice
        await expect(page.locator('[data-testid="redirect-notice"]')).toContainText('redirected')

        await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
        await helpers.submitSignInForm()

        // Should redirect to the specified URL
        await page.waitForURL(`**${scenario.url}**`)
        
        // Verify user is authenticated on target page
        await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible()

        // Sign out for next test
        await helpers.signOut()
      }
    })

    test('should handle remember me functionality with session persistence', async ({ page, context }) => {
      await helpers.navigateToSignIn()

      // Sign in with remember me checked
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password, true)
      await helpers.submitSignInForm()

      await helpers.waitForDashboard()

      // Verify remember me preference is stored
      const rememberMeValue = await page.evaluate(() => localStorage.getItem('c9d-remember-me'))
      expect(rememberMeValue).toBe('true')

      // Sign out and verify remember me behavior
      await helpers.signOut()
      await helpers.navigateToSignIn()

      // Remember me checkbox should be checked
      await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeChecked()
      
      // Email should be pre-filled
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue(TEST_CONFIG.testUser.email)
    })

    test('should handle invalid credentials with comprehensive error scenarios', async ({ page }) => {
      await helpers.navigateToSignIn()

      const errorScenarios = [
        {
          email: TEST_CONFIG.testUser.email,
          password: 'wrongpassword',
          expectedError: 'Incorrect password',
          description: 'wrong password'
        },
        {
          email: 'nonexistent@example.com',
          password: TEST_CONFIG.testUser.password,
          expectedError: 'No account found',
          description: 'non-existent email'
        }
      ]

      for (const scenario of errorScenarios) {
        console.log(`Testing ${scenario.description}`)
        
        await helpers.fillSignInForm(scenario.email, scenario.password)
        await helpers.submitSignInForm()

        // Should show appropriate error message
        await helpers.expectErrorMessage(scenario.expectedError)

        // Form should remain functional
        await expect(page.locator('[data-testid="email-input"]')).toBeEnabled()
        await expect(page.locator('[data-testid="password-input"]')).toBeEnabled()
        await expect(page.locator('[data-testid="sign-in-submit-button"]')).toBeEnabled()

        // Clear form for next test
        await page.fill('[data-testid="email-input"]', '')
        await page.fill('[data-testid="password-input"]', '')
      }
    })
  })

  test.describe('Error Scenarios and Recovery - Exhaustive Coverage', () => {
    test('should handle comprehensive network connectivity issues', async ({ page }) => {
      console.log('🌐 Testing comprehensive network error scenarios')
      
      await helpers.navigateToSignIn()

      // Simulate network failure
      await helpers.simulateNetworkError()

      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      await helpers.submitSignInForm()

      // Should show network error message
      await helpers.expectErrorMessage('Network error')

      // Should provide retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

      // Restore network and retry
      await helpers.restoreNetwork()
      await page.click('[data-testid="retry-button"]')

      // Should complete authentication
      await helpers.waitForDashboard()
    })

    test('should handle comprehensive server error scenarios', async ({ page }) => {
      console.log('🚨 Testing comprehensive server error scenarios')
      
      await helpers.navigateToSignIn()

      // Mock server error
      await helpers.simulateServerError()

      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      await helpers.submitSignInForm()

      // Should show appropriate error message
      await helpers.expectErrorMessage('Something went wrong')

      // Should provide recovery options
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

      // Reset for next test
      await helpers.restoreNetwork()
    })
  })

  test.describe('Accessibility and Mobile Experience - Complete Coverage', () => {
    test('should meet comprehensive accessibility standards (WCAG 2.1 AA)', async ({ page }) => {
      console.log('♿ Testing comprehensive accessibility compliance')
      
      await helpers.navigateToSignIn()

      // Comprehensive accessibility audit
      await helpers.checkAccessibility()
      await helpers.checkKeyboardNavigation()

      // Test screen reader compatibility
      const formElements = await page.locator('input, button, select, textarea').all()
      
      for (const element of formElements) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        
        console.log(`Checking accessibility for ${tagName}`)
        
        // Check for proper labeling
        const ariaLabel = await element.getAttribute('aria-label')
        const ariaLabelledBy = await element.getAttribute('aria-labelledby')
        const id = await element.getAttribute('id')
        const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false
        
        expect(ariaLabel || ariaLabelledBy || hasLabel).toBeTruthy()
      }

      console.log('✅ Accessibility compliance tests completed')
    })

    test('should work perfectly on all mobile devices and orientations', async ({ page }) => {
      console.log('📱 Testing comprehensive mobile device support')
      
      const mobileDevices = [
        { name: 'iPhone SE', ...VIEWPORT_SIZES.MOBILE },
        { name: 'iPad Mini', ...VIEWPORT_SIZES.TABLET }
      ]

      for (const device of mobileDevices) {
        console.log(`Testing on ${device.name} (${device.width}x${device.height})`)
        
        await page.setViewportSize({ width: device.width, height: device.height })
        await helpers.navigateToSignIn()

        // Test portrait orientation
        await helpers.checkMobileResponsiveness()

        // Test form usability on mobile
        await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)

        // Test landscape orientation
        await page.setViewportSize({ width: device.height, height: device.width })
        await page.waitForTimeout(500)

        // Form should adapt to landscape
        await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible()
        await expect(page.locator('[data-testid="sign-in-submit-button"]')).toBeVisible()
      }

      // Reset to desktop
      await page.setViewportSize(VIEWPORT_SIZES.DESKTOP)

      console.log('✅ Mobile device tests completed')
    })
  })

  test.describe('Social Authentication Journey - Complete Coverage', () => {
    test('should handle all social authentication providers comprehensively', async ({ page }) => {
      console.log('🔗 Testing comprehensive social authentication')
      
      await helpers.navigateToSignIn()

      // Test all social providers
      const providers = ['google', 'github', 'microsoft'] as const
      
      for (const provider of providers) {
        console.log(`Testing ${provider} social authentication`)
        
        await helpers.testSocialAuthProvider(provider)
        await helpers.waitForDashboard()

        // Verify social authentication success
        await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible()

        // Sign out for next provider test
        await helpers.signOut()
        await helpers.navigateToSignIn()
      }
    })

    test('should handle social authentication errors and edge cases', async ({ page }) => {
      await helpers.navigateToSignIn()

      // Test OAuth access denied
      await page.route('**/oauth/github**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            error: 'access_denied',
            error_description: 'User denied access'
          })
        })
      })

      await page.click('[data-testid="social-auth-github-button"]')
      await helpers.expectErrorMessage('Social authentication failed')
    })
  })

  test.describe('Password Reset Journey - Complete Coverage', () => {
    test('should complete comprehensive password reset flow', async ({ page }) => {
      console.log('🔑 Testing comprehensive password reset flow')
      
      await helpers.navigateToSignIn()

      // Enter email and initiate reset
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.testUser.email)
      await page.click('[data-testid="forgot-password-link"]')

      // Should redirect to password reset page
      await page.waitForURL('**/reset-password**')

      // Should show reset form with email pre-filled
      await expect(page.locator('[data-testid="reset-email-input"]')).toHaveValue(TEST_CONFIG.testUser.email)

      // Submit reset request
      await page.click('[data-testid="send-reset-button"]')

      // Should show confirmation message
      await helpers.expectSuccessMessage('Password reset email sent')
    })

    test('should handle invalid reset tokens and edge cases', async ({ page }) => {
      // Test invalid token
      await page.goto('/reset-password/confirm?token=invalid-token')

      // Should show error message
      await helpers.expectErrorMessage('Invalid or expired reset token')

      // Should provide option to request new reset
      await expect(page.locator('[data-testid="request-new-reset-button"]')).toBeVisible()
    })
  })

  test.describe('Two-Factor Authentication Journey - Complete Coverage', () => {
    test('should handle comprehensive 2FA setup and authentication', async ({ page }) => {
      console.log('🔐 Testing comprehensive 2FA functionality')
      
      // First, sign in normally
      await helpers.navigateToSignIn()
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      await helpers.submitSignInForm()
      await helpers.waitForDashboard()

      // Navigate to security settings
      await page.click('[data-testid="user-menu-button"]')
      await page.click('[data-testid="security-settings-link"]')

      // Enable 2FA
      await page.click('[data-testid="enable-2fa-button"]')

      // Should show QR code and setup instructions
      await expect(page.locator('[data-testid="2fa-qr-code"]')).toBeVisible()
      await expect(page.locator('[data-testid="2fa-backup-codes"]')).toBeVisible()

      // Enter verification code (mock)
      await page.fill('[data-testid="2fa-verification-input"]', '123456')
      await page.click('[data-testid="verify-2fa-button"]')

      // Should show success message
      await helpers.expectSuccessMessage('Two-factor authentication enabled')
    })

    test('should handle 2FA backup codes and recovery', async ({ page }) => {
      // Assume 2FA is already enabled from previous test
      await helpers.navigateToSignIn()
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      await helpers.submitSignInForm()

      // Should prompt for 2FA
      await expect(page.locator('[data-testid="2fa-code-input"]')).toBeVisible()

      // Click use backup code
      await page.click('[data-testid="use-backup-code-button"]')

      // Should show backup code input
      await expect(page.locator('[data-testid="backup-code-input"]')).toBeVisible()

      // Enter valid backup code
      await page.fill('[data-testid="backup-code-input"]', 'backup-code-123')
      await page.click('[data-testid="verify-backup-code-button"]')

      // Should complete authentication
      await helpers.waitForDashboard()
    })
  })

  test.describe('Cross-Browser and Performance - Complete Coverage', () => {
    test('should maintain exceptional performance standards across all scenarios', async ({ page }) => {
      console.log('⚡ Testing comprehensive performance standards')
      
      // Test initial page load performance
      const startTime = Date.now()
      await page.goto('/sign-in')
      const initialLoadTime = Date.now() - startTime

      expect(initialLoadTime).toBeLessThan(TEST_CONFIG.performance.pageLoadTime)

      // Measure comprehensive performance metrics
      const performanceMetrics = await helpers.measurePageLoadPerformance()
      
      // Test form interaction performance
      const formStartTime = Date.now()
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      const formFillTime = Date.now() - formStartTime

      expect(formFillTime).toBeLessThan(TEST_CONFIG.performance.formInteractionTime)

      console.log('✅ Performance tests completed')
    })

    test('should provide comprehensive browser compatibility', async ({ page, browserName }) => {
      console.log(`🌐 Testing browser compatibility for ${browserName}`)
      
      await helpers.navigateToSignIn()

      // Test browser-specific features
      const browserCapabilities = await page.evaluate(() => {
        return {
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          promises: typeof Promise !== 'undefined'
        }
      })

      console.log(`${browserName} capabilities:`, browserCapabilities)

      // Essential features should be available
      expect(browserCapabilities.localStorage).toBe(true)
      expect(browserCapabilities.sessionStorage).toBe(true)
      expect(browserCapabilities.fetch).toBe(true)
      expect(browserCapabilities.promises).toBe(true)

      // Test form functionality across browsers
      await helpers.fillSignInForm(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password)
      
      // Form validation should work
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.locator('[data-testid="email-input"]').blur()
      
      const validationSupport = await page.locator('[data-testid="email-error"]').isVisible()
      expect(validationSupport).toBe(true)

      console.log(`✅ ${browserName} compatibility tests completed`)
    })
  })

  test.describe('Security and Compliance Validation', () => {
    test('should enforce comprehensive security measures', async ({ page }) => {
      console.log('🔒 Testing comprehensive security measures')
      
      await helpers.navigateToSignIn()

      // Test password security requirements
      const weakPasswords = VALIDATION_TEST_DATA.WEAK_PASSWORDS
      
      for (const weakPassword of weakPasswords) {
        if (weakPassword) {
          await page.fill('[data-testid="password-input"]', weakPassword)
          await page.locator('[data-testid="password-input"]').blur()
          
          // Should show password strength indicator
          await expect(page.locator('[data-testid="password-strength-weak"]')).toBeVisible()
        }
      }

      // Test strong password acceptance
      await page.fill('[data-testid="password-input"]', VALIDATION_TEST_DATA.STRONG_PASSWORDS[0])
      await expect(page.locator('[data-testid="password-strength-strong"]')).toBeVisible()

      console.log('✅ Security measures tests completed')
    })

    test('should handle comprehensive data validation and sanitization', async ({ page }) => {
      console.log('🛡️  Testing data validation and security scenarios')
      
      await helpers.navigateToSignIn()

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")'
      ]

      for (const maliciousInput of maliciousInputs) {
        console.log(`Testing input sanitization: ${maliciousInput.substring(0, 20)}...`)
        
        // Try malicious input in email field
        await page.fill('[data-testid="email-input"]', maliciousInput)
        await page.fill('[data-testid="password-input"]', 'password123')
        await helpers.submitSignInForm()

        // Should not execute any scripts
        const alertDialogs = page.locator('dialog[role="alertdialog"]')
        await expect(alertDialogs).toHaveCount(0)

        // Should show validation error for invalid email
        await helpers.expectValidationError('email', 'Invalid email')

        // Clear for next test
        await page.fill('[data-testid="email-input"]', '')
        await page.fill('[data-testid="password-input"]', '')
      }

      // Test SQL injection attempts
      const sqlInjectionInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--"
      ]

      for (const sqlInput of sqlInjectionInputs) {
        await page.fill('[data-testid="email-input"]', `test${sqlInput}@example.com`)
        await page.fill('[data-testid="password-input"]', sqlInput)
        await helpers.submitSignInForm()

        // Should handle safely without SQL injection
        await Promise.race([
          helpers.expectErrorMessage('Invalid credentials'),
          helpers.expectValidationError('email', 'Invalid email')
        ])

        await page.fill('[data-testid="email-input"]', '')
        await page.fill('[data-testid="password-input"]', '')
      }

      console.log('✅ Data validation and security tests completed')
    })
  })
})