// Unit tests for Phase.dev Error Handler
import { describe, it, expect, beforeEach } from 'vitest'
import { PhaseErrorHandler, FallbackStrategy } from '../phase-error-handler'
import { PhaseSDKErrorCode, PhaseSDKError } from '../phase-sdk-client'
import { TokenSource } from '../phase-token-loader'

describe('PhaseErrorHandler', () => {
  let mockTokenSource: TokenSource
  let mockError: PhaseSDKError

  beforeEach(() => {
    mockTokenSource = {
      source: 'local.env.local',
      token: 'test-token-12345',
      path: '/path/to/.env.local'
    }

    mockError = {
      code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
      message: 'Authentication failed',
      details: {},
      isRetryable: false,
      tokenSource: mockTokenSource
    }
  })

  describe('handleSDKError', () => {
    describe('TOKEN_NOT_FOUND error handling', () => {
      it('should handle TOKEN_NOT_FOUND error with proper fallback strategy', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.TOKEN_NOT_FOUND,
          message: 'Token not found',
          details: {},
          isRetryable: false
        }

        const result = PhaseErrorHandler.handleSDKError(error, null, 'initialization')

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.userMessage).toContain('PHASE_SERVICE_TOKEN not found')
        expect(result.logMessage).toContain('No PHASE_SERVICE_TOKEN found in any source')
        expect(result.debugInfo).toEqual({
          errorCode: PhaseSDKErrorCode.TOKEN_NOT_FOUND,
          checkedSources: [
            'process.env.PHASE_SERVICE_TOKEN',
            'local .env.local',
            'local .env',
            'root .env.local',
            'root .env'
          ],
          suggestion: 'Add PHASE_SERVICE_TOKEN to one of the checked sources'
        })
      })

      it('should provide guidance when no token source is available', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.TOKEN_NOT_FOUND,
          message: 'Token not found',
          details: {},
          isRetryable: false
        }

        const result = PhaseErrorHandler.handleSDKError(error, null)

        expect(result.userMessage).toContain('Add it to process.env, .env.local, or .env file')
      })
    })

    describe('AUTHENTICATION_FAILED error handling', () => {
      it('should handle authentication failure with token source information', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
          message: 'Authentication failed',
          details: {},
          isRetryable: false,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource, 'secret retrieval')

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.userMessage).toContain('Token loaded from local .env.local file')
        expect(result.userMessage).toContain('Verify your token is valid')
        expect(result.logMessage).toContain('Authentication failed with token from local.env.local')
        expect(result.debugInfo?.tokenSource).toBe('local.env.local')
        expect(result.debugInfo?.tokenPath).toBe('/path/to/.env.local')
      })

      it('should handle authentication failure without token source', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
          message: 'Authentication failed',
          details: {},
          isRetryable: false
        }

        const result = PhaseErrorHandler.handleSDKError(error, null)

        expect(result.logMessage).toContain('unknown source')
        expect(result.debugInfo?.tokenSource).toBeUndefined()
      })
    })

    describe('INVALID_TOKEN error handling', () => {
      it('should handle invalid token with source information', () => {
        const tokenSource: TokenSource = {
          source: 'process.env',
          token: 'invalid-token'
        }

        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.INVALID_TOKEN,
          message: 'Invalid token format',
          details: {},
          isRetryable: false,
          tokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, tokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.userMessage).toContain('Token loaded from environment variable')
        expect(result.userMessage).toContain('Check the token format')
        expect(result.debugInfo?.suggestion).toContain('Regenerate token')
      })
    })

    describe('APP_NOT_FOUND error handling', () => {
      it('should handle app not found with app name in details', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.APP_NOT_FOUND,
          message: 'App not found',
          details: { appName: 'TestApp' },
          isRetryable: false,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.userMessage).toContain('app "TestApp" not found')
        expect(result.userMessage).toContain('Create the app in Phase.dev console')
        expect(result.debugInfo?.appName).toBe('TestApp')
      })

      it('should handle app not found without app name in details', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.APP_NOT_FOUND,
          message: 'App not found',
          details: {},
          isRetryable: false
        }

        const result = PhaseErrorHandler.handleSDKError(error, null)

        expect(result.userMessage).toContain('app "unknown" not found')
        expect(result.debugInfo?.appName).toBe('unknown')
      })
    })

    describe('ENVIRONMENT_NOT_FOUND error handling', () => {
      it('should handle environment not found with app and environment details', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.ENVIRONMENT_NOT_FOUND,
          message: 'Environment not found',
          details: { appName: 'TestApp', environment: 'production' },
          isRetryable: false,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.userMessage).toContain('environment "production" not found in app "TestApp"')
        expect(result.debugInfo?.appName).toBe('TestApp')
        expect(result.debugInfo?.environment).toBe('production')
      })
    })

    describe('NETWORK_ERROR error handling', () => {
      it('should handle network errors with retry strategy', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.NETWORK_ERROR,
          message: 'Network connection failed',
          details: { originalError: 'ECONNREFUSED' },
          isRetryable: true,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(true)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.RETRY_WITH_BACKOFF)
        expect(result.userMessage).toContain('temporarily unavailable')
        expect(result.debugInfo?.networkError).toBe('ECONNREFUSED')
      })
    })

    describe('RATE_LIMIT_EXCEEDED error handling', () => {
      it('should handle rate limit with retry after information', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          details: { retryAfter: 120 },
          isRetryable: true,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(true)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.RETRY_WITH_BACKOFF)
        expect(result.userMessage).toContain('retry in 120 seconds')
        expect(result.debugInfo?.retryAfter).toBe(120)
      })

      it('should use default retry time when not specified', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          details: {},
          isRetryable: true
        }

        const result = PhaseErrorHandler.handleSDKError(error, null)

        expect(result.userMessage).toContain('retry in 60 seconds')
        expect(result.debugInfo?.retryAfter).toBe(60)
      })
    })

    describe('Generic SDK error handling', () => {
      it('should handle retryable SDK errors', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.SDK_ERROR,
          message: 'Generic SDK error',
          details: { originalError: 'Some SDK error' },
          isRetryable: true,
          tokenSource: mockTokenSource
        }

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(true)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.RETRY_WITH_BACKOFF)
      })

      it('should handle non-retryable SDK errors', () => {
        const error: PhaseSDKError = {
          code: PhaseSDKErrorCode.SDK_ERROR,
          message: 'Generic SDK error',
          details: {},
          isRetryable: false
        }

        const result = PhaseErrorHandler.handleSDKError(error, null)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
      })
    })

    describe('Unknown error handling', () => {
      it('should normalize regular Error objects', () => {
        const error = new Error('Regular error message')

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.logMessage).toContain('Regular error message')
      })

      it('should normalize string errors', () => {
        const error = 'String error message'

        const result = PhaseErrorHandler.handleSDKError(error, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
        expect(result.logMessage).toContain('String error message')
      })

      it('should handle null/undefined errors', () => {
        const result = PhaseErrorHandler.handleSDKError(null, mockTokenSource)

        expect(result.shouldFallback).toBe(true)
        expect(result.retryable).toBe(false)
        expect(result.fallbackStrategy).toBe(FallbackStrategy.LOCAL_ENV_ONLY)
      })
    })
  })

  describe('createFallbackMechanism', () => {
    it('should create LOCAL_ENV_ONLY fallback mechanism', () => {
      const mechanism = PhaseErrorHandler.createFallbackMechanism(FallbackStrategy.LOCAL_ENV_ONLY)

      expect(mechanism.description).toContain('local environment variables')
      expect(mechanism.implementation).toContain('Load environment variables from .env files')
      expect(mechanism.retryLogic).toBeUndefined()
    })

    it('should create RETRY_WITH_BACKOFF fallback mechanism', () => {
      const mechanism = PhaseErrorHandler.createFallbackMechanism(FallbackStrategy.RETRY_WITH_BACKOFF)

      expect(mechanism.description).toContain('exponential backoff')
      expect(mechanism.implementation).toContain('Retry Phase.dev operation')
      expect(mechanism.retryLogic).toEqual({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000
      })
    })

    it('should create CACHE_FALLBACK fallback mechanism', () => {
      const mechanism = PhaseErrorHandler.createFallbackMechanism(FallbackStrategy.CACHE_FALLBACK)

      expect(mechanism.description).toContain('cached Phase.dev data')
      expect(mechanism.implementation).toContain('previously cached secrets')
    })

    it('should create FAIL_FAST fallback mechanism', () => {
      const mechanism = PhaseErrorHandler.createFallbackMechanism(FallbackStrategy.FAIL_FAST)

      expect(mechanism.description).toContain('Fail immediately')
      expect(mechanism.implementation).toContain('Throw error immediately')
    })

    it('should create GRACEFUL_DEGRADATION fallback mechanism', () => {
      const mechanism = PhaseErrorHandler.createFallbackMechanism(FallbackStrategy.GRACEFUL_DEGRADATION)

      expect(mechanism.description).toContain('reduced functionality')
      expect(mechanism.implementation).toContain('limited features')
    })
  })

  describe('getTroubleshootingSteps', () => {
    it('should provide troubleshooting steps for TOKEN_NOT_FOUND', () => {
      const steps = PhaseErrorHandler.getTroubleshootingSteps(PhaseSDKErrorCode.TOKEN_NOT_FOUND)

      expect(steps).toContain('Add PHASE_SERVICE_TOKEN to your environment variables')
      expect(steps).toContain('Create a .env.local file with PHASE_SERVICE_TOKEN=your_token')
      expect(steps.length).toBeGreaterThan(0)
    })

    it('should provide troubleshooting steps for AUTHENTICATION_FAILED', () => {
      const steps = PhaseErrorHandler.getTroubleshootingSteps(PhaseSDKErrorCode.AUTHENTICATION_FAILED)

      expect(steps).toContain('Verify the token in Phase.dev console')
      expect(steps).toContain('Regenerate the service token if needed')
      expect(steps.length).toBeGreaterThan(0)
    })

    it('should provide troubleshooting steps for APP_NOT_FOUND', () => {
      const steps = PhaseErrorHandler.getTroubleshootingSteps(PhaseSDKErrorCode.APP_NOT_FOUND)

      expect(steps).toContain('Create the app in Phase.dev console')
      expect(steps).toContain('Verify the app name spelling and case')
      expect(steps.length).toBeGreaterThan(0)
    })

    it('should provide troubleshooting steps for NETWORK_ERROR', () => {
      const steps = PhaseErrorHandler.getTroubleshootingSteps(PhaseSDKErrorCode.NETWORK_ERROR)

      expect(steps).toContain('Check internet connectivity')
      expect(steps).toContain('Verify Phase.dev service status')
      expect(steps.length).toBeGreaterThan(0)
    })

    it('should provide default troubleshooting steps for unknown errors', () => {
      const steps = PhaseErrorHandler.getTroubleshootingSteps('UNKNOWN_ERROR' as PhaseSDKErrorCode)

      expect(steps).toContain('Check Phase.dev service status')
      expect(steps).toContain('Verify all configuration is correct')
      expect(steps.length).toBeGreaterThan(0)
    })
  })

  describe('formatErrorForLogging', () => {
    it('should format error with token source for logging', () => {
      const formatted = PhaseErrorHandler.formatErrorForLogging(mockError, mockTokenSource, 'test operation')

      expect(formatted.timestamp).toBeDefined()
      expect(formatted.operation).toBe('test operation')
      expect(formatted.errorCode).toBe(PhaseSDKErrorCode.AUTHENTICATION_FAILED)
      expect(formatted.message).toBe('Authentication failed')
      expect(formatted.isRetryable).toBe(false)
      expect(formatted.tokenSource).toEqual({
        source: 'local.env.local',
        path: '/path/to/.env.local',
        hasToken: true,
        tokenLength: 16
      })
      expect(formatted.troubleshootingSteps).toBeDefined()
    })

    it('should format error without token source', () => {
      const formatted = PhaseErrorHandler.formatErrorForLogging(mockError, null)

      expect(formatted.tokenSource).toBeNull()
      expect(formatted.operation).toBe('unknown')
    })

    it('should never log actual token value', () => {
      const formatted = PhaseErrorHandler.formatErrorForLogging(mockError, mockTokenSource)

      const formattedStr = JSON.stringify(formatted)
      expect(formattedStr).not.toContain('test-token-12345')
      expect(formatted.tokenSource).toHaveProperty('hasToken', true)
      expect(formatted.tokenSource).toHaveProperty('tokenLength', 16)
    })
  })

  describe('createUserFriendlyMessage', () => {
    it('should create user-friendly message with troubleshooting steps', () => {
      const message = PhaseErrorHandler.createUserFriendlyMessage(mockError, mockTokenSource)

      expect(message).toContain('Phase.dev authentication failed')
      expect(message).toContain('Token loaded from local .env.local file')
      expect(message).toContain('Troubleshooting steps:')
      expect(message).toContain('1. Verify the token in Phase.dev console')
    })

    it('should create message without token source', () => {
      const error: PhaseSDKError = {
        code: PhaseSDKErrorCode.TOKEN_NOT_FOUND,
        message: 'Token not found',
        details: {},
        isRetryable: false
      }

      const message = PhaseErrorHandler.createUserFriendlyMessage(error, null)

      expect(message).toContain('PHASE_SERVICE_TOKEN not found')
      expect(message).toContain('Troubleshooting steps:')
    })
  })

  describe('Token source guidance generation', () => {
    it('should generate guidance for process.env source', () => {
      const tokenSource: TokenSource = {
        source: 'process.env',
        token: 'test-token'
      }

      const error: PhaseSDKError = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Auth failed',
        details: {},
        isRetryable: false
      }

      const result = PhaseErrorHandler.handleSDKError(error, tokenSource)

      expect(result.userMessage).toContain('Token loaded from environment variable PHASE_SERVICE_TOKEN')
    })

    it('should generate guidance for root .env.local source', () => {
      const tokenSource: TokenSource = {
        source: 'root.env.local',
        token: 'test-token',
        path: '/workspace/.env.local'
      }

      const error: PhaseSDKError = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Auth failed',
        details: {},
        isRetryable: false
      }

      const result = PhaseErrorHandler.handleSDKError(error, tokenSource)

      expect(result.userMessage).toContain('Token loaded from workspace root .env.local file (/workspace/.env.local)')
    })

    it('should handle unknown token source gracefully', () => {
      const tokenSource: TokenSource = {
        source: 'unknown-source' as any,
        token: 'test-token'
      }

      const error: PhaseSDKError = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Auth failed',
        details: {},
        isRetryable: false
      }

      const result = PhaseErrorHandler.handleSDKError(error, tokenSource)

      expect(result.userMessage).toContain('Token loaded from unknown-source')
    })
  })
})