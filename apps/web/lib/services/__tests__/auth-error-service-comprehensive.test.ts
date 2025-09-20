import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthErrorService, authErrorService, AuthErrorHandler } from '../auth-error-service'
import { AuthenticationError, AuthErrorCode, createAuthError } from '@/lib/errors/authentication-errors'
import { AuthLogger } from '@/lib/errors/auth-error-logger'

// Mock dependencies
vi.mock('@/lib/errors/clerk-error-mapper', () => ({
  mapClerkError: vi.fn(),
  isClerkError: vi.fn()
}))

vi.mock('@/lib/errors/auth-error-logger', () => ({
  AuthLogger: {
    logSignInFailure: vi.fn(),
    logSignUpFailure: vi.fn(),
    logVerificationFailure: vi.fn(),
    logSocialAuthFailure: vi.fn(),
    logSignInSuccess: vi.fn()
  },
  AuthEventType: {
    SIGN_IN_FAILURE: 'sign_in_failure',
    SIGN_UP_FAILURE: 'sign_up_failure',
    VERIFICATION_FAILURE: 'verification_failure',
    SOCIAL_AUTH_FAILURE: 'social_auth_failure'
  }
}))

describe('AuthErrorService - Comprehensive Coverage', () => {
  let service: AuthErrorService
  let mockAuthError: AuthenticationError

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get fresh instance for each test
    service = AuthErrorService.getInstance()
    
    // Clear any existing history
    service.clearErrorHistory(0)
    
    mockAuthError = createAuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      {
        userId: 'user-123',
        sessionId: 'session-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthErrorService.getInstance()
      const instance2 = AuthErrorService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(authErrorService)
    })
  })

  describe('handleError', () => {
    it('should handle AuthenticationError instances', () => {
      const result = service.handleError(mockAuthError)

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS)
      expect(result.message).toBe('Invalid email or password')
    })

    it('should handle Clerk errors', () => {
      const { mapClerkError, isClerkError } = require('@/lib/errors/clerk-error-mapper')
      
      const clerkError = {
        errors: [{ code: 'form_password_incorrect', message: 'Password is incorrect' }]
      }

      isClerkError.mockReturnValue(true)
      mapClerkError.mockReturnValue(mockAuthError)

      const result = service.handleError(clerkError)

      expect(isClerkError).toHaveBeenCalledWith(clerkError)
      expect(mapClerkError).toHaveBeenCalledWith(clerkError, {})
      expect(result).toBe(mockAuthError)
    })

    it('should handle generic Error instances', () => {
      const genericError = new Error('Network connection failed')

      const result = service.handleError(genericError)

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.authCode).toBe(AuthErrorCode.NETWORK_ERROR)
      expect(result.message).toBe('Network connection failed')
    })

    it('should handle unknown error types', () => {
      const unknownError = 'string error'

      const result = service.handleError(unknownError)

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.authCode).toBe(AuthErrorCode.AUTHENTICATION_FAILED)
      expect(result.message).toBe('An unknown authentication error occurred')
    })

    it('should enrich error context when requested', () => {
      const additionalContext = {
        metadata: {
          action: 'test-action',
          customField: 'custom-value'
        }
      }

      const result = service.handleError(mockAuthError, additionalContext, {
        includeContext: true
      })

      expect(result.context.metadata).toEqual(
        expect.objectContaining(additionalContext.metadata)
      )
    })

    it('should log error when requested', () => {
      service.handleError(mockAuthError, {}, { logError: true })

      expect(AuthLogger.logSignInFailure).toHaveBeenCalledWith(
        mockAuthError,
        expect.objectContaining({
          service: 'AuthErrorService',
          errorCode: AuthErrorCode.INVALID_CREDENTIALS
        })
      )
    })

    it('should skip logging when disabled', () => {
      service.handleError(mockAuthError, {}, { logError: false })

      expect(AuthLogger.logSignInFailure).not.toHaveBeenCalled()
    })

    it('should store error in history for analysis', () => {
      service.handleError(mockAuthError)

      const stats = service.getErrorStats()
      expect(stats.totalErrors).toBe(1)
      expect(stats.errorsByType[AuthErrorCode.INVALID_CREDENTIALS]).toBe(1)
    })
  })

  describe('handleSignInError', () => {
    it('should handle sign-in specific errors', () => {
      const email = 'test@example.com'
      const error = new Error('Sign-in failed')

      const result = service.handleSignInError(error, email, { sessionId: 'session-123' })

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.email).toBe(email)
      expect(result.context.metadata?.action).toBe('sign-in')
      expect(result.context.sessionId).toBe('session-123')
      expect(AuthLogger.logSignInFailure).toHaveBeenCalledWith(result, { email })
    })

    it('should handle sign-in errors without email', () => {
      const error = new Error('Sign-in failed')

      const result = service.handleSignInError(error)

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.action).toBe('sign-in')
      expect(AuthLogger.logSignInFailure).toHaveBeenCalled()
    })
  })

  describe('handleSignUpError', () => {
    it('should handle sign-up specific errors', () => {
      const email = 'test@example.com'
      const error = new Error('Sign-up failed')

      const result = service.handleSignUpError(error, email, { sessionId: 'session-123' })

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.email).toBe(email)
      expect(result.context.metadata?.action).toBe('sign-up')
      expect(AuthLogger.logSignUpFailure).toHaveBeenCalledWith(result, { email })
    })
  })

  describe('handleVerificationError', () => {
    it('should handle verification specific errors', () => {
      const error = new Error('Verification failed')
      const verificationType = 'email'

      const result = service.handleVerificationError(error, verificationType, { userId: 'user-123' })

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.verificationType).toBe(verificationType)
      expect(result.context.metadata?.action).toBe('verification')
      expect(AuthLogger.logVerificationFailure).toHaveBeenCalledWith(result, { verificationType })
    })

    it('should handle different verification types', () => {
      const verificationTypes = ['email', 'phone', 'totp', 'sms'] as const

      verificationTypes.forEach(type => {
        const error = new Error(`${type} verification failed`)
        const result = service.handleVerificationError(error, type)

        expect(result.context.metadata?.verificationType).toBe(type)
      })
    })
  })

  describe('handleSocialAuthError', () => {
    it('should handle social authentication specific errors', () => {
      const error = new Error('Social auth failed')
      const provider = 'google'

      const result = service.handleSocialAuthError(error, provider, { userId: 'user-123' })

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.provider).toBe(provider)
      expect(result.context.metadata?.action).toBe('social-auth')
      expect(AuthLogger.logSocialAuthFailure).toHaveBeenCalledWith(provider, result)
    })

    it('should handle different social providers', () => {
      const providers = ['google', 'github', 'microsoft', 'facebook']

      providers.forEach(provider => {
        const error = new Error(`${provider} auth failed`)
        const result = service.handleSocialAuthError(error, provider)

        expect(result.context.metadata?.provider).toBe(provider)
      })
    })
  })

  describe('attemptRecovery', () => {
    it('should attempt recovery and track success', async () => {
      // Mock successful recovery
      vi.spyOn(service as any, 'executeRecoveryAction').mockResolvedValue({
        success: true,
        recoveryAction: 'retry',
        message: 'Recovery successful'
      })

      const result = await service.attemptRecovery(mockAuthError, 'retry')

      expect(result.success).toBe(true)
      expect(result.recoveryAction).toBe('retry')
      expect(AuthLogger.logSignInSuccess).toHaveBeenCalled()
    })

    it('should handle recovery failure', async () => {
      // Mock failed recovery
      vi.spyOn(service as any, 'executeRecoveryAction').mockResolvedValue({
        success: false,
        recoveryAction: 'retry',
        message: 'Recovery failed'
      })

      const result = await service.attemptRecovery(mockAuthError, 'retry')

      expect(result.success).toBe(false)
      expect(result.recoveryAction).toBe('retry')
      expect(AuthLogger.logSignInSuccess).not.toHaveBeenCalled()
    })

    it('should handle recovery action throwing error', async () => {
      // Mock recovery action throwing error
      vi.spyOn(service as any, 'executeRecoveryAction').mockRejectedValue(
        new Error('Recovery action failed')
      )

      const result = await service.attemptRecovery(mockAuthError, 'retry')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(AuthenticationError)
      expect(result.message).toBe('Recovery attempt failed')
    })

    it('should track recovery attempts', async () => {
      vi.spyOn(service as any, 'executeRecoveryAction').mockResolvedValue({
        success: false,
        recoveryAction: 'retry'
      })

      // First attempt
      await service.attemptRecovery(mockAuthError, 'retry')
      
      // Second attempt
      await service.attemptRecovery(mockAuthError, 'retry')

      const stats = service.getErrorStats()
      expect(stats.recoverySuccessRate).toBe(0) // No successes
    })
  })

  describe('getRecoverySuggestions', () => {
    it('should provide suggestions for invalid credentials', () => {
      const error = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid credentials')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Double-check your email and password')
      expect(suggestions).toContain('Try using the "Forgot Password" option')
      expect(suggestions).toContain('Ensure Caps Lock is not enabled')
      expect(suggestions).toContain('Check for typos in your email address')
    })

    it('should provide suggestions for email not verified', () => {
      const error = createAuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Check your email inbox for a verification message')
      expect(suggestions).toContain('Look in your spam or junk folder')
      expect(suggestions).toContain('Request a new verification email')
    })

    it('should provide suggestions for account locked', () => {
      const error = createAuthError(AuthErrorCode.ACCOUNT_LOCKED, 'Account locked')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Wait for the lockout period to expire')
      expect(suggestions).toContain('Contact support for immediate assistance')
    })

    it('should provide suggestions for two-factor required', () => {
      const error = createAuthError(AuthErrorCode.TWO_FACTOR_REQUIRED, '2FA required')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Open your authenticator app')
      expect(suggestions).toContain('Use a backup code if available')
      expect(suggestions).toContain('Ensure your device time is synchronized')
    })

    it('should provide suggestions for network errors', () => {
      const error = createAuthError(AuthErrorCode.NETWORK_ERROR, 'Network error')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Try refreshing the page')
      expect(suggestions).toContain('Disable VPN if you\'re using one')
    })

    it('should provide suggestions for service unavailable', () => {
      const error = createAuthError(AuthErrorCode.SERVICE_UNAVAILABLE, 'Service unavailable')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Wait a few minutes and try again')
      expect(suggestions).toContain('Check our status page for service updates')
    })

    it('should provide default suggestions for unknown errors', () => {
      const error = createAuthError(AuthErrorCode.AUTHENTICATION_FAILED, 'Unknown error')
      const suggestions = service.getRecoverySuggestions(error)

      expect(suggestions).toContain('Try refreshing the page')
      expect(suggestions).toContain('Clear your browser cache')
      expect(suggestions).toContain('Try using a different browser')
      expect(suggestions).toContain('Contact support if the problem persists')
    })
  })

  describe('getErrorStats', () => {
    beforeEach(() => {
      // Clear history before each test
      service.clearErrorHistory(0)
    })

    it('should return empty stats when no errors', () => {
      const stats = service.getErrorStats()

      expect(stats.totalErrors).toBe(0)
      expect(stats.errorsByType).toEqual({})
      expect(stats.topErrors).toEqual([])
      expect(stats.recoverySuccessRate).toBe(0)
    })

    it('should calculate error statistics correctly', () => {
      // Add multiple errors
      const error1 = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 1')
      const error2 = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 2')
      const error3 = createAuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Error 3')

      service.handleError(error1)
      service.handleError(error2)
      service.handleError(error3)

      const stats = service.getErrorStats()

      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByType[AuthErrorCode.INVALID_CREDENTIALS]).toBe(2)
      expect(stats.errorsByType[AuthErrorCode.EMAIL_NOT_VERIFIED]).toBe(1)
      expect(stats.topErrors[0]).toEqual({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        count: 2,
        percentage: expect.closeTo(66.67, 1)
      })
    })

    it('should filter errors by time range', () => {
      // Create an old error (simulate by manipulating timestamp)
      const oldError = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Old error')
      oldError.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago

      const recentError = createAuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Recent error')

      service.handleError(oldError)
      service.handleError(recentError)

      const stats = service.getErrorStats(24) // Last 24 hours

      expect(stats.totalErrors).toBe(1) // Only recent error
      expect(stats.errorsByType[AuthErrorCode.EMAIL_NOT_VERIFIED]).toBe(1)
      expect(stats.errorsByType[AuthErrorCode.INVALID_CREDENTIALS]).toBeUndefined()
    })

    it('should calculate recovery success rate', async () => {
      // Mock recovery attempts
      vi.spyOn(service as any, 'executeRecoveryAction')
        .mockResolvedValueOnce({ success: true, recoveryAction: 'retry' })
        .mockResolvedValueOnce({ success: false, recoveryAction: 'retry' })

      await service.attemptRecovery(mockAuthError, 'retry')
      await service.attemptRecovery(mockAuthError, 'retry')

      const stats = service.getErrorStats()

      expect(stats.recoverySuccessRate).toBe(50) // 1 success out of 2 attempts
    })
  })

  describe('clearErrorHistory', () => {
    it('should clear old errors from history', () => {
      // Add errors
      service.handleError(mockAuthError)
      
      // Clear errors older than 0 hours (all errors)
      service.clearErrorHistory(0)

      const stats = service.getErrorStats()
      expect(stats.totalErrors).toBe(0)
    })

    it('should keep recent errors', () => {
      service.handleError(mockAuthError)
      
      // Clear errors older than 24 hours (keep recent ones)
      service.clearErrorHistory(24)

      const stats = service.getErrorStats()
      expect(stats.totalErrors).toBe(1)
    })
  })

  describe('Error Type Inference', () => {
    it('should infer network error from message', () => {
      const networkError = new Error('Network request failed')
      const result = service.handleError(networkError)

      expect(result.authCode).toBe(AuthErrorCode.NETWORK_ERROR)
    })

    it('should infer timeout error from message', () => {
      const timeoutError = new Error('Request timeout')
      const result = service.handleError(timeoutError)

      expect(result.authCode).toBe(AuthErrorCode.SERVICE_UNAVAILABLE)
    })

    it('should infer credential error from message', () => {
      const credentialError = new Error('Invalid password provided')
      const result = service.handleError(credentialError)

      expect(result.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS)
    })

    it('should default to authentication failed for unknown messages', () => {
      const unknownError = new Error('Something went wrong')
      const result = service.handleError(unknownError)

      expect(result.authCode).toBe(AuthErrorCode.AUTHENTICATION_FAILED)
    })
  })

  describe('Recovery Action Simulation', () => {
    it('should simulate retry recovery', async () => {
      const result = await (service as any).executeRecoveryAction(mockAuthError, 'retry', {})

      expect(result.recoveryAction).toBe('retry')
      expect(result.message).toBe('Retry attempt completed')
      expect(result.nextStep).toBe('Please try signing in again')
      expect(typeof result.success).toBe('boolean')
    })

    it('should simulate resend verification recovery', async () => {
      const result = await (service as any).executeRecoveryAction(mockAuthError, 'resend-verification', {})

      expect(result.success).toBe(true)
      expect(result.recoveryAction).toBe('resend-verification')
      expect(result.message).toBe('Verification email sent')
      expect(result.nextStep).toBe('Check your email for the verification link')
    })

    it('should simulate resend code recovery', async () => {
      const result = await (service as any).executeRecoveryAction(mockAuthError, 'resend-code', {})

      expect(result.success).toBe(true)
      expect(result.recoveryAction).toBe('resend-code')
      expect(result.message).toBe('New verification code sent')
      expect(result.nextStep).toBe('Enter the new verification code')
    })

    it('should handle unknown recovery actions', async () => {
      const result = await (service as any).executeRecoveryAction(mockAuthError, 'unknown-action', {})

      expect(result.success).toBe(false)
      expect(result.recoveryAction).toBe('unknown-action')
      expect(result.message).toBe('Recovery action not implemented')
    })
  })

  describe('AuthErrorHandler Convenience Functions', () => {
    it('should provide handleSignInError convenience function', () => {
      const result = AuthErrorHandler.handleSignInError(
        new Error('Sign-in failed'),
        'test@example.com'
      )

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.email).toBe('test@example.com')
      expect(result.context.metadata?.action).toBe('sign-in')
    })

    it('should provide handleSignUpError convenience function', () => {
      const result = AuthErrorHandler.handleSignUpError(
        new Error('Sign-up failed'),
        'test@example.com'
      )

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.email).toBe('test@example.com')
      expect(result.context.metadata?.action).toBe('sign-up')
    })

    it('should provide handleVerificationError convenience function', () => {
      const result = AuthErrorHandler.handleVerificationError(
        new Error('Verification failed'),
        'email'
      )

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.verificationType).toBe('email')
      expect(result.context.metadata?.action).toBe('verification')
    })

    it('should provide handleSocialAuthError convenience function', () => {
      const result = AuthErrorHandler.handleSocialAuthError(
        new Error('Social auth failed'),
        'google'
      )

      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.context.metadata?.provider).toBe('google')
      expect(result.context.metadata?.action).toBe('social-auth')
    })

    it('should provide attemptRecovery convenience function', async () => {
      const result = await AuthErrorHandler.attemptRecovery(mockAuthError, 'retry')

      expect(result.recoveryAction).toBe('retry')
      expect(typeof result.success).toBe('boolean')
    })

    it('should provide getRecoverySuggestions convenience function', () => {
      const suggestions = AuthErrorHandler.getRecoverySuggestions(mockAuthError)

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should provide getErrorStats convenience function', () => {
      const stats = AuthErrorHandler.getErrorStats()

      expect(stats).toHaveProperty('totalErrors')
      expect(stats).toHaveProperty('errorsByType')
      expect(stats).toHaveProperty('topErrors')
      expect(stats).toHaveProperty('recoverySuccessRate')
    })
  })

  describe('Memory Management', () => {
    it('should limit error history per key', () => {
      // Add more than 100 errors for the same key
      for (let i = 0; i < 150; i++) {
        const error = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, `Error ${i}`)
        service.handleError(error)
      }

      const stats = service.getErrorStats()
      expect(stats.totalErrors).toBeLessThanOrEqual(100)
    })

    it('should handle error key generation', () => {
      const error1 = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 1', {
        userId: 'user-1',
        ipAddress: '192.168.1.1'
      })

      const error2 = createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 2', {
        userId: 'user-2',
        ipAddress: '192.168.1.2'
      })

      service.handleError(error1)
      service.handleError(error2)

      // Should track errors separately by user and IP
      const stats = service.getErrorStats()
      expect(stats.totalErrors).toBe(2)
    })
  })
})