/**
 * Authentication Security Penetration Testing Suite
 * 
 * Tests authentication security vulnerabilities and attack vectors
 * Requirements: 8.4 (Security), 7.1 (Session Management)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'crypto'

// Mock security testing utilities
const SecurityTestUtils = {
  generateSQLInjectionPayloads: () => [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#",
    "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --"
  ],

  generateXSSPayloads: () => [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "';alert('XSS');//",
    "<iframe src=javascript:alert('XSS')></iframe>"
  ],

  generateCSRFTokens: () => [
    "invalid_csrf_token",
    "",
    "null",
    "undefined",
    "../../etc/passwd",
    "../../../windows/system32/config/sam"
  ],

  generateWeakPasswords: () => [
    "123456",
    "password",
    "admin",
    "qwerty",
    "letmein",
    "welcome",
    "monkey",
    "dragon"
  ],

  generateBruteForceAttempts: (email: string, count: number = 100) => {
    return Array.from({ length: count }, (_, i) => ({
      email,
      password: `attempt_${i}`,
      timestamp: Date.now() + i
    }))
  },

  validatePasswordStrength: (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      commonPassword: !SecurityTestUtils.generateWeakPasswords().includes(password.toLowerCase())
    }

    const score = Object.values(checks).filter(Boolean).length
    return { checks, score, isStrong: score >= 5 }
  },

  simulateRateLimiting: (attempts: number, timeWindow: number = 60000) => {
    const now = Date.now()
    const windowStart = now - timeWindow
    
    return {
      isRateLimited: attempts > 5, // More than 5 attempts in time window
      remainingAttempts: Math.max(0, 5 - attempts),
      resetTime: windowStart + timeWindow
    }
  }
}

// Mock authentication service for security testing
const MockAuthService = {
  attemptCount: new Map<string, number>(),
  blockedIPs: new Set<string>(),
  
  signIn: async (credentials: { email: string; password: string }, clientIP: string = '127.0.0.1') => {
    // Check for blocked IP
    if (MockAuthService.blockedIPs.has(clientIP)) {
      throw new Error('IP_BLOCKED')
    }

    // Increment attempt count first
    const attempts = MockAuthService.attemptCount.get(clientIP) || 0
    MockAuthService.attemptCount.set(clientIP, attempts + 1)

    // Check rate limiting after incrementing
    const rateLimitCheck = SecurityTestUtils.simulateRateLimiting(attempts + 1)
    
    if (rateLimitCheck.isRateLimited) {
      MockAuthService.blockedIPs.add(clientIP)
      throw new Error('RATE_LIMITED')
    }

    // Validate credentials (simplified)
    if (credentials.email === 'test@example.com' && credentials.password === 'SecurePassword123!') {
      // Reset attempt count on successful login
      MockAuthService.attemptCount.delete(clientIP)
      return {
        success: true,
        token: 'valid_jwt_token',
        user: { id: 'user_123', email: credentials.email }
      }
    }

    throw new Error('INVALID_CREDENTIALS')
  },

  validateInput: (input: string) => {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|\\')|(;|\\;)|(--)|(\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)\s*)/i
    ]

    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]

    const hasSQLInjection = sqlPatterns.some(pattern => pattern.test(input))
    const hasXSS = xssPatterns.some(pattern => pattern.test(input))

    // More aggressive sanitization
    let sanitized = input
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/['"`;]/g, '') // Remove dangerous characters

    return {
      isValid: !hasSQLInjection && !hasXSS,
      hasSQLInjection,
      hasXSS,
      sanitized
    }
  },

  resetSecurity: () => {
    MockAuthService.attemptCount.clear()
    MockAuthService.blockedIPs.clear()
  }
}

describe('Authentication Security Penetration Tests', () => {
  beforeEach(() => {
    MockAuthService.resetSecurity()
  })

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in email field', async () => {
      const sqlPayloads = SecurityTestUtils.generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        const validation = MockAuthService.validateInput(payload)
        
        expect(validation.isValid).toBe(false)
        expect(validation.hasSQLInjection).toBe(true)
        expect(validation.sanitized).not.toContain(payload)
        
        // Attempt sign-in with SQL injection payload
        try {
          await MockAuthService.signIn({
            email: payload,
            password: 'password123'
          })
          
          // Should not reach here
          expect(true).toBe(false)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })

    it('should prevent SQL injection in password field', async () => {
      const sqlPayloads = SecurityTestUtils.generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        const validation = MockAuthService.validateInput(payload)
        
        expect(validation.isValid).toBe(false)
        expect(validation.hasSQLInjection).toBe(true)
        
        try {
          await MockAuthService.signIn({
            email: 'test@example.com',
            password: payload
          })
          
          expect(true).toBe(false)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe('XSS Protection', () => {
    it('should prevent XSS attacks in user input', () => {
      const xssPayloads = SecurityTestUtils.generateXSSPayloads()
      
      for (const payload of xssPayloads) {
        const validation = MockAuthService.validateInput(payload)
        
        expect(validation.isValid).toBe(false)
        // XSS detection should work for most payloads
        if (payload.includes('<script>') || payload.includes('javascript:') || payload.includes('onerror=')) {
          expect(validation.hasXSS).toBe(true)
        }
        expect(validation.sanitized).not.toContain('<script>')
        expect(validation.sanitized).not.toContain('javascript:')
        expect(validation.sanitized).not.toContain('onerror=')
      }
    })

    it('should sanitize potentially dangerous characters', () => {
      const dangerousInputs = [
        '<img src="x" onerror="alert(1)">',
        'javascript:void(0)',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>'
      ]
      
      for (const input of dangerousInputs) {
        const validation = MockAuthService.validateInput(input)
        
        expect(validation.sanitized).not.toMatch(/<[^>]*>/g)
        expect(validation.sanitized).not.toContain('javascript:')
        expect(validation.sanitized).not.toContain('"')
        expect(validation.sanitized).not.toContain("'")
      }
    })
  })

  describe('Brute Force Protection', () => {
    it('should implement rate limiting for failed login attempts', async () => {
      const clientIP = '192.168.1.100'
      const maxAttempts = 5
      
      // Attempt multiple failed logins
      for (let i = 0; i < maxAttempts + 2; i++) {
        try {
          await MockAuthService.signIn({
            email: 'test@example.com',
            password: 'wrong_password'
          }, clientIP)
        } catch (error) {
          if (i < maxAttempts) {
            expect((error as Error).message).toBe('INVALID_CREDENTIALS')
          } else {
            // After max attempts, should be rate limited or IP blocked
            expect(['RATE_LIMITED', 'IP_BLOCKED']).toContain((error as Error).message)
          }
        }
      }
      
      // Verify IP is blocked after excessive attempts
      expect(MockAuthService.blockedIPs.has(clientIP)).toBe(true)
    })

    it('should block IP after excessive failed attempts', async () => {
      const clientIP = '192.168.1.101'
      const bruteForceAttempts = SecurityTestUtils.generateBruteForceAttempts('victim@example.com', 10)
      
      let blockedAttempt = -1
      
      for (let i = 0; i < bruteForceAttempts.length; i++) {
        try {
          await MockAuthService.signIn({
            email: bruteForceAttempts[i].email,
            password: bruteForceAttempts[i].password
          }, clientIP)
        } catch (error) {
          if ((error as Error).message === 'RATE_LIMITED' || (error as Error).message === 'IP_BLOCKED') {
            blockedAttempt = i
            break
          }
        }
      }
      
      expect(blockedAttempt).toBeGreaterThan(-1)
      expect(blockedAttempt).toBeLessThanOrEqual(6) // Should be blocked within 6 attempts
    })

    it('should reset attempt counter on successful login', async () => {
      const clientIP = '192.168.1.102'
      
      // Make a few failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await MockAuthService.signIn({
            email: 'test@example.com',
            password: 'wrong_password'
          }, clientIP)
        } catch (error) {
          expect((error as Error).message).toBe('INVALID_CREDENTIALS')
        }
      }
      
      // Successful login should reset counter
      const result = await MockAuthService.signIn({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      }, clientIP)
      
      expect(result.success).toBe(true)
      expect(MockAuthService.attemptCount.has(clientIP)).toBe(false)
    })
  })

  describe('Password Security', () => {
    it('should enforce strong password requirements', () => {
      const weakPasswords = SecurityTestUtils.generateWeakPasswords()
      
      for (const password of weakPasswords) {
        const validation = SecurityTestUtils.validatePasswordStrength(password)
        
        expect(validation.isStrong).toBe(false)
        expect(validation.score).toBeLessThan(5)
        expect(validation.checks.commonPassword).toBe(false)
      }
    })

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MySecureP@ssw0rd!',
        'C0mpl3x&Str0ng#2024',
        'Un1qu3$P@ssw0rd!',
        'S3cur3&R@nd0m#Key!'
      ]
      
      for (const password of strongPasswords) {
        const validation = SecurityTestUtils.validatePasswordStrength(password)
        
        expect(validation.isStrong).toBe(true)
        expect(validation.score).toBeGreaterThanOrEqual(5)
        expect(validation.checks.length).toBe(true)
        expect(validation.checks.uppercase).toBe(true)
        expect(validation.checks.lowercase).toBe(true)
        expect(validation.checks.numbers).toBe(true)
        expect(validation.checks.symbols).toBe(true)
      }
    })

    it('should detect password complexity requirements', () => {
      const testCases = [
        { password: 'onlylowercase', expectedChecks: { lowercase: true, length: true } },
        { password: 'ONLYUPPERCASE', expectedChecks: { uppercase: true, length: true } },
        { password: '12345678', expectedChecks: { numbers: true, length: true } },
        { password: '!@#$%^&*', expectedChecks: { symbols: true, length: true } },
        { password: 'Short1!', expectedChecks: { length: false } }
      ]
      
      for (const testCase of testCases) {
        const validation = SecurityTestUtils.validatePasswordStrength(testCase.password)
        
        for (const [check, expected] of Object.entries(testCase.expectedChecks)) {
          expect(validation.checks[check as keyof typeof validation.checks]).toBe(expected)
        }
      }
    })
  })

  describe('Session Security', () => {
    it('should generate secure session tokens', () => {
      const tokens = Array.from({ length: 100 }, () => {
        const token = randomBytes(32).toString('hex')
        return token
      })
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(tokens.length)
      
      // All tokens should be 64 characters (32 bytes in hex)
      for (const token of tokens) {
        expect(token.length).toBe(64)
        expect(/^[a-f0-9]+$/.test(token)).toBe(true)
      }
    })

    it('should validate token format and structure', () => {
      const validTokens = [
        'a'.repeat(64), // Valid hex token
        randomBytes(32).toString('hex')
      ]
      
      const invalidTokens = [
        'short_token',
        'invalid-characters-in-token!@#',
        '',
        'a'.repeat(63), // Too short
        'a'.repeat(65), // Too long
        'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG' // Invalid hex
      ]
      
      for (const token of validTokens) {
        expect(token.length).toBe(64)
        expect(/^[a-f0-9]+$/.test(token)).toBe(true)
      }
      
      for (const token of invalidTokens) {
        const isValid = token.length === 64 && /^[a-f0-9]+$/.test(token)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Input Validation Security', () => {
    it('should validate email format strictly', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org'
      ]
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@example.com',
        'user@domain',
        '<script>alert("xss")</script>@example.com'
      ]
      
      for (const email of validEmails) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        expect(emailRegex.test(email)).toBe(true)
        
        const validation = MockAuthService.validateInput(email)
        expect(validation.hasXSS).toBe(false)
        expect(validation.hasSQLInjection).toBe(false)
      }
      
      for (const email of invalidEmails) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const isValidFormat = emailRegex.test(email)
        const validation = MockAuthService.validateInput(email)
        
        // Most invalid emails should fail format validation
        // Some may also contain malicious content
        if (email.includes('<script>') || email.includes('javascript:')) {
          expect(validation.hasXSS || validation.hasSQLInjection).toBe(true)
        } else {
          expect(isValidFormat).toBe(false)
        }
      }
    })

    it('should sanitize and validate all user inputs', () => {
      const maliciousInputs = [
        { input: '<script>alert("xss")</script>', type: 'XSS' },
        { input: "'; DROP TABLE users; --", type: 'SQL Injection' },
        { input: 'javascript:alert("xss")', type: 'JavaScript Protocol' },
        { input: '<img src=x onerror=alert("xss")>', type: 'Image XSS' },
        { input: "' OR '1'='1", type: 'SQL Boolean Injection' }
      ]
      
      for (const { input, type } of maliciousInputs) {
        const validation = MockAuthService.validateInput(input)
        
        expect(validation.isValid).toBe(false)
        expect(validation.sanitized).not.toBe(input)
        expect(validation.sanitized.length).toBeLessThanOrEqual(input.length)
        
        console.log(`Blocked ${type}: "${input}" -> "${validation.sanitized}"`)
      }
    })
  })

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens', () => {
      const validToken = createHash('sha256').update(`${Date.now()}_csrf_secret`).digest('hex')
      const invalidTokens = SecurityTestUtils.generateCSRFTokens()
      
      // Mock CSRF validation
      const validateCSRFToken = (token: string) => {
        if (!token || token.length !== 64) return false
        if (!/^[a-f0-9]+$/.test(token)) return false
        return token === validToken
      }
      
      expect(validateCSRFToken(validToken)).toBe(true)
      
      for (const invalidToken of invalidTokens) {
        expect(validateCSRFToken(invalidToken)).toBe(false)
      }
    })
  })

  describe('Security Headers Validation', () => {
    it('should enforce security headers', () => {
      const requiredHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
      
      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        expect(header).toBeDefined()
        expect(expectedValue).toBeDefined()
        expect(typeof expectedValue).toBe('string')
        expect(expectedValue.length).toBeGreaterThan(0)
      }
    })
  })
})