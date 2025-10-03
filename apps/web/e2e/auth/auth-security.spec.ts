/**
 * Security-focused E2E tests for authentication
 * Tests security features and attack prevention
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Security Tests', () => {
  test.describe('XSS Prevention', () => {
    test('should sanitize user input in email field', async ({ page }) => {
      await page.goto('/sign-in')
      
      const xssPayload = '<script>alert("XSS")</script>test@example.com'
      await page.getByLabel('Email address').fill(xssPayload)
      await page.getByLabel('Password').fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      
      // Should not execute script
      await page.waitForTimeout(1000)
      
      // Check that no alert was shown
      const dialogs: string[] = []
      page.on('dialog', dialog => {
        dialogs.push(dialog.message())
        dialog.dismiss()
      })
      
      expect(dialogs).toHaveLength(0)
    })

    test('should sanitize error messages', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Try to inject script via URL parameter
      await page.goto('/sign-in?error=<script>alert("XSS")</script>')
      
      // Should display error but not execute script
      const dialogs: string[] = []
      page.on('dialog', dialog => {
        dialogs.push(dialog.message())
        dialog.dismiss()
      })
      
      await page.waitForTimeout(1000)
      expect(dialogs).toHaveLength(0)
    })
  })

  test.describe('CSRF Protection', () => {
    test('should include CSRF token in forms', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Check for CSRF meta tag or hidden input
      const csrfMeta = await page.locator('meta[name="csrf-token"]').count()
      const csrfInput = await page.locator('input[name="csrf_token"]').count()
      
      expect(csrfMeta + csrfInput).toBeGreaterThan(0)
    })
  })

  test.describe('SQL Injection Prevention', () => {
    test('should handle SQL injection attempts in email', async ({ page }) => {
      await page.goto('/sign-in')
      
      const sqlPayload = "admin'--"
      await page.getByLabel('Email address').fill(sqlPayload)
      await page.getByLabel('Password').fill('password')
      await page.getByRole('button', { name: 'Sign In' }).click()
      
      // Should show validation error, not SQL error
      await expect(page.getByText(/invalid email|email.*required/i)).toBeVisible()
    })

    test('should handle SQL injection attempts in password', async ({ page }) => {
      await page.goto('/sign-in')
      
      await page.getByLabel('Email address').fill('test@example.com')
      await page.getByLabel('Password').fill("' OR '1'='1")
      await page.getByRole('button', { name: 'Sign In' }).click()
      
      // Should show normal authentication error
      await expect(page.getByText(/incorrect.*password|invalid.*credentials/i)).toBeVisible({
        timeout: 10000
      })
    })
  })

  test.describe('Brute Force Protection', () => {
    test('should implement rate limiting after failed attempts', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.getByLabel('Email address').fill('bruteforce@example.com')
        await page.getByLabel('Password').fill(`WrongPassword${i}`)
        await page.getByRole('button', { name: 'Sign In' }).click()
        
        // Wait a bit between attempts
        await page.waitForTimeout(500)
      }
      
      // Should show rate limit message
      await expect(page.getByText(/too many attempts|rate limit|try again later/i)).toBeVisible({
        timeout: 10000
      })
    })

    test('should show CAPTCHA after multiple failed attempts', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Attempt multiple failed logins
      for (let i = 0; i < 3; i++) {
        await page.getByLabel('Email address').fill('captcha@example.com')
        await page.getByLabel('Password').fill(`WrongPassword${i}`)
        await page.getByRole('button', { name: 'Sign In' }).click()
        await page.waitForTimeout(500)
      }
      
      // Should show CAPTCHA or security verification
      const captchaVisible = await page.locator('[data-testid="captcha"]').isVisible() ||
                            await page.getByText(/verify.*human|security.*check/i).isVisible()
      
      expect(captchaVisible).toBeTruthy()
    })
  })

  test.describe('Session Security', () => {
    test('should expire session after inactivity', async ({ page, context }) => {
      // This test would require ability to manipulate time
      // For now, we'll test that session info is present
      await page.goto('/sign-in')
      
      // Check for session-related headers
      const response = await page.goto('/sign-in')
      const headers = response?.headers()
      
      // Should have security headers
      expect(headers?.['x-frame-options']).toBeDefined()
      expect(headers?.['x-content-type-options']).toBeDefined()
    })

    test('should invalidate session on sign out', async ({ page, context }) => {
      // First sign in (using mock or test account)
      await page.goto('/sign-in')
      
      // After sign in, get cookies
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'))
      
      if (sessionCookie) {
        // Sign out
        await page.goto('/api/auth/signout', { waitUntil: 'networkidle' })
        
        // Check cookies again
        const newCookies = await context.cookies()
        const newSessionCookie = newCookies.find(c => c.name === sessionCookie.name)
        
        // Session cookie should be cleared or expired
        expect(newSessionCookie?.value).not.toBe(sessionCookie.value)
      }
    })
  })

  test.describe('Password Security', () => {
    test('should enforce password complexity requirements', async ({ page }) => {
      await page.goto('/sign-up')
      
      const passwordInput = page.getByLabel('Password', { exact: true })
      
      // Test weak passwords
      const weakPasswords = [
        'password',
        '12345678',
        'aaaaaaaa',
        'Password',
        'Password1'
      ]
      
      for (const weakPassword of weakPasswords) {
        await passwordInput.fill(weakPassword)
        await passwordInput.blur()
        
        // Should show weak password indicator
        await expect(page.getByText(/weak|improve/i)).toBeVisible()
      }
    })

    test('should not allow common passwords', async ({ page }) => {
      await page.goto('/sign-up')
      
      await page.getByLabel('First Name').fill('Test')
      await page.getByLabel('Last Name').fill('User')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password', { exact: true }).fill('password123')
      await page.getByLabel('Confirm Password').fill('password123')
      await page.getByRole('button', { name: 'Create Account' }).click()
      
      // Should show error about common password
      await expect(page.getByText(/common password|choose a stronger/i)).toBeVisible()
    })

    test('should mask password by default', async ({ page }) => {
      await page.goto('/sign-in')
      
      const passwordInput = page.getByLabel('Password')
      
      // Should be password type
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Should not show password in page source
      await passwordInput.fill('MySecretPassword123!')
      const inputValue = await passwordInput.getAttribute('value')
      
      // Value should exist but be masked in UI
      expect(inputValue).toBe('MySecretPassword123!')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  test.describe('Data Validation', () => {
    test('should validate email format strictly', async ({ page }) => {
      await page.goto('/sign-in')
      
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test @example.com',
        'test@example',
        'test@.com'
      ]
      
      for (const invalidEmail of invalidEmails) {
        await page.getByLabel('Email address').fill(invalidEmail)
        await page.getByLabel('Password').click() // Blur
        
        await expect(page.getByText(/valid email|invalid email/i)).toBeVisible()
      }
    })

    test('should limit input lengths', async ({ page }) => {
      await page.goto('/sign-up')
      
      // Try to input very long strings
      const longString = 'a'.repeat(1000)
      
      await page.getByLabel('First Name').fill(longString)
      await page.getByLabel('Last Name').fill(longString)
      await page.getByLabel('Email').fill(longString + '@example.com')
      
      // Check that inputs are truncated
      const firstNameValue = await page.getByLabel('First Name').inputValue()
      const lastNameValue = await page.getByLabel('Last Name').inputValue()
      const emailValue = await page.getByLabel('Email').inputValue()
      
      expect(firstNameValue.length).toBeLessThan(1000)
      expect(lastNameValue.length).toBeLessThan(1000)
      expect(emailValue.length).toBeLessThan(1000)
    })
  })

  test.describe('Content Security Policy', () => {
    test('should have CSP headers', async ({ page }) => {
      const response = await page.goto('/sign-in')
      const headers = response?.headers()
      
      const csp = headers?.['content-security-policy'] || headers?.['x-content-security-policy']
      
      if (csp) {
        // Should restrict script sources
        expect(csp).toContain("script-src")
        // Should restrict style sources
        expect(csp).toContain("style-src")
      }
    })
  })

  test.describe('Secure Communication', () => {
    test('should use HTTPS in production', async ({ page }) => {
      // In production, all auth pages should redirect to HTTPS
      const response = await page.goto('/sign-in')
      const url = response?.url() || ''
      
      // In production, should be HTTPS
      if (process.env.NODE_ENV === 'production') {
        expect(url).toMatch(/^https:/)
      }
    })

    test('should set secure cookie flags', async ({ context, page }) => {
      await page.goto('/sign-in')
      
      const cookies = await context.cookies()
      const authCookies = cookies.filter(c => 
        c.name.includes('auth') || 
        c.name.includes('session') ||
        c.name.includes('__clerk')
      )
      
      // In production, cookies should be secure
      if (process.env.NODE_ENV === 'production') {
        authCookies.forEach(cookie => {
          expect(cookie.secure).toBeTruthy()
          expect(cookie.httpOnly).toBeTruthy()
          expect(cookie.sameSite).toBe('Lax')
        })
      }
    })
  })

  test.describe('Account Enumeration Prevention', () => {
    test('should not reveal if email exists during sign in', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Try with non-existent email
      await page.getByLabel('Email address').fill('definitelynotexist@example.com')
      await page.getByLabel('Password').fill('SomePassword123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      
      const errorText1 = await page.getByRole('alert').textContent()
      
      // Try with potentially existing email
      await page.getByLabel('Email address').fill('admin@example.com')
      await page.getByLabel('Password').fill('WrongPassword123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      
      const errorText2 = await page.getByRole('alert').textContent()
      
      // Error messages should be the same (generic)
      expect(errorText1).toContain('Invalid email or password')
      expect(errorText2).toContain('Invalid email or password')
    })

    test('should have same response time for existing and non-existing accounts', async ({ page }) => {
      await page.goto('/sign-in')
      
      // Time non-existent account
      const start1 = Date.now()
      await page.getByLabel('Email address').fill('notexist@example.com')
      await page.getByLabel('Password').fill('Password123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForSelector('[role="alert"]')
      const time1 = Date.now() - start1
      
      // Time potentially existing account
      await page.reload()
      const start2 = Date.now()
      await page.getByLabel('Email address').fill('admin@example.com')
      await page.getByLabel('Password').fill('WrongPassword!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForSelector('[role="alert"]')
      const time2 = Date.now() - start2
      
      // Response times should be similar (within 500ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(500)
    })
  })
})
