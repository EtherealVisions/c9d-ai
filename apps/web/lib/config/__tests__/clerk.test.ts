import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  getClerkConfig, 
  validateClerkConfig, 
  getClerkEnvironmentSettings,
  getSocialProviders,
  getPasswordRequirements,
  getSessionConfig
} from '../clerk'

// Mock the config init module
vi.mock('../init', () => ({
  getAppConfigSync: vi.fn((key: string) => {
    const mockConfig: Record<string, string> = {
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': 'pk_test_mock_key',
      'CLERK_SECRET_KEY': 'sk_test_mock_secret',
      'CLERK_WEBHOOK_SECRET': 'whsec_mock_webhook_secret',
      'NODE_ENV': 'test',
      'NEXT_PUBLIC_APP_URL': 'http://localhost:3007'
    }
    return mockConfig[key]
  })
}))

describe('Clerk Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClerkConfig', () => {
    it('should return complete Clerk configuration', () => {
      const config = getClerkConfig()

      expect(config).toEqual({
        publishableKey: 'pk_test_mock_key',
        secretKey: 'sk_test_mock_secret',
        webhookSecret: 'whsec_mock_webhook_secret',
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
        afterSignInUrl: '/dashboard',
        afterSignUpUrl: '/onboarding',
        appearance: expect.objectContaining({
          theme: expect.objectContaining({
            primaryColor: '#3B82F6'
          }),
          variables: expect.objectContaining({
            colorPrimary: '#3B82F6'
          }),
          elements: expect.any(Object)
        }),
        features: {
          socialAuth: true,
          twoFactorAuth: false, // test environment
          emailVerification: true,
          passwordReset: true
        }
      })
    })

    it('should handle missing configuration gracefully', async () => {
      const initModule = await import('../init')
      const { getAppConfigSync } = vi.mocked(initModule)
      getAppConfigSync.mockReturnValue('')

      const config = getClerkConfig()

      expect(config.publishableKey).toBe('')
      expect(config.secretKey).toBe('')
      expect(config.webhookSecret).toBe('')
    })
  })

  describe('validateClerkConfig', () => {
    it('should validate complete configuration successfully', () => {
      const config = {
        publishableKey: 'pk_test_valid_key',
        secretKey: 'sk_test_valid_secret',
        webhookSecret: 'whsec_valid_webhook_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing publishable key', () => {
      const config = {
        secretKey: 'sk_test_valid_secret',
        webhookSecret: 'whsec_valid_webhook_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required')
    })

    it('should detect invalid publishable key format', () => {
      const config = {
        publishableKey: 'invalid_key_format',
        secretKey: 'sk_test_valid_secret',
        webhookSecret: 'whsec_valid_webhook_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key')
    })

    it('should detect missing secret key', () => {
      const config = {
        publishableKey: 'pk_test_valid_key',
        webhookSecret: 'whsec_valid_webhook_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CLERK_SECRET_KEY is required')
    })

    it('should detect invalid secret key format', () => {
      const config = {
        publishableKey: 'pk_test_valid_key',
        secretKey: 'invalid_secret_format',
        webhookSecret: 'whsec_valid_webhook_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CLERK_SECRET_KEY must be a valid Clerk secret key')
    })

    it('should detect missing webhook secret', () => {
      const config = {
        publishableKey: 'pk_test_valid_key',
        secretKey: 'sk_test_valid_secret'
      }

      const result = validateClerkConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CLERK_WEBHOOK_SECRET is required for webhook verification')
    })
  })

  describe('getClerkEnvironmentSettings', () => {
    it('should return development settings for test environment', () => {
      const settings = getClerkEnvironmentSettings()

      expect(settings).toEqual({
        isDevelopment: true, // test environment is treated as development
        isProduction: false,
        allowedOrigins: ['http://localhost:3007', 'http://localhost:3000'],
        sessionTokenName: '__session_dev',
        cookieSettings: {
          secure: false,
          sameSite: 'lax',
          domain: undefined
        }
      })
    })
  })

  describe('getSocialProviders', () => {
    it('should return configured social providers', () => {
      const providers = getSocialProviders()

      expect(providers).toHaveLength(3)
      expect(providers).toEqual([
        {
          id: 'google',
          name: 'Google',
          enabled: true,
          icon: 'google',
          strategy: 'oauth_google'
        },
        {
          id: 'github',
          name: 'GitHub',
          enabled: true,
          icon: 'github',
          strategy: 'oauth_github'
        },
        {
          id: 'microsoft',
          name: 'Microsoft',
          enabled: true,
          icon: 'microsoft',
          strategy: 'oauth_microsoft'
        }
      ])
    })
  })

  describe('getPasswordRequirements', () => {
    it('should return password requirements configuration', () => {
      const requirements = getPasswordRequirements()

      expect(requirements).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbiddenPasswords: [
          'password',
          '12345678',
          'qwerty',
          'admin',
          'letmein',
          'welcome'
        ]
      })
    })
  })

  describe('getSessionConfig', () => {
    it('should return session configuration for test environment', () => {
      const config = getSessionConfig()

      expect(config).toEqual({
        maxAge: 7 * 24 * 60 * 60, // 7 days
        inactivityTimeout: 30 * 60, // 30 minutes
        multiSession: true,
        sameSite: 'lax',
        secure: false
      })
    })
  })
})