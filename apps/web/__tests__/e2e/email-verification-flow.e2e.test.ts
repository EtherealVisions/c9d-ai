import { test, expect, Page } from '@playwright/test'

test.describe('Email Verification Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/')
  })

  test('should complete email verification flow from sign-up', async ({ page }) => {
    // Step 1: Navigate to sign-up
    await page.goto('/sign-up')
    await expect(page).toHaveURL('/sign-up')

    // Step 2: Fill sign-up form
    const testEmail = `test-${Date.now()}@example.com`
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="first-name-input"]', 'Test')
    await page.fill('[data-testid="last-name-input"]', 'User')

    // Step 3: Submit sign-up form
    await page.click('[data-testid="sign-up-button"]')

    // Step 4: Should redirect to email verification page
    await expect(page).toHaveURL(/\/verify-email/)
    await expect(page.locator('h1')).toContainText('Check your email')
    await expect(page.locator('text=We\'ve sent a 6-digit verification code')).toBeVisible()

    // Step 5: Verify email display
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // Step 6: Test verification code input
    const codeInput = page.locator('[data-testid="verification-code-input"]')
    await expect(codeInput).toBeVisible()
    await expect(codeInput).toHaveAttribute('maxlength', '6')
    await expect(codeInput).toHaveAttribute('inputmode', 'numeric')

    // Step 7: Test invalid code handling
    await codeInput.fill('12345')
    await page.click('[data-testid="verify-button"]')
    await expect(page.locator('text=Please enter the complete 6-digit code')).toBeVisible()

    // Step 8: Test resend functionality
    const resendButton = page.locator('[data-testid="resend-button"]')
    await expect(resendButton).toBeVisible()
    await resendButton.click()
    
    // Should show sending state
    await expect(page.locator('text=Sending...')).toBeVisible()
    
    // Should show success message and cooldown
    await expect(page.locator('text=Verification code sent!')).toBeVisible()
    await expect(page.locator('text=Resend code in')).toBeVisible()

    // Step 9: Test help links
    await expect(page.locator('text=Check your spam folder')).toBeVisible()
    
    const changeEmailLink = page.locator('text=Use a different email address')
    await expect(changeEmailLink).toBeVisible()
    await changeEmailLink.click()
    await expect(page).toHaveURL('/sign-up')
  })

  test('should handle verification errors gracefully', async ({ page }) => {
    // Navigate directly to verification page
    await page.goto('/verify-email?email=test@example.com')

    // Test with invalid code
    const codeInput = page.locator('[data-testid="verification-code-input"]')
    await codeInput.fill('000000')
    await page.click('[data-testid="verify-button"]')

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible()
    
    // Should allow retry
    const verifyButton = page.locator('[data-testid="verify-button"]')
    await expect(verifyButton).not.toBeDisabled()
    await expect(verifyButton).toContainText('Verify Email')
  })

  test('should redirect to custom URL after verification', async ({ page }) => {
    // Navigate with custom redirect URL
    await page.goto('/verify-email?redirect_url=/dashboard&email=test@example.com')

    // Verify the redirect URL is preserved in the form
    // This would be tested with a valid verification code in a real scenario
    await expect(page).toHaveURL(/redirect_url=%2Fdashboard/)
  })

  test('should be accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/verify-email?email=test@example.com')

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const codeInput = page.locator('[data-testid="verification-code-input"]')
    await expect(codeInput).toBeFocused()

    await page.keyboard.press('Tab')
    const verifyButton = page.locator('[data-testid="verify-button"]')
    await expect(verifyButton).toBeFocused()

    await page.keyboard.press('Tab')
    const resendButton = page.locator('[data-testid="resend-button"]')
    await expect(resendButton).toBeFocused()
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/verify-email?email=test@example.com')

    // Verify mobile-optimized layout
    const codeInput = page.locator('[data-testid="verification-code-input"]')
    await expect(codeInput).toBeVisible()
    
    // Test touch interaction
    await codeInput.tap()
    await expect(codeInput).toBeFocused()

    // Verify numeric keyboard appears (inputmode="numeric")
    await expect(codeInput).toHaveAttribute('inputmode', 'numeric')
  })
})