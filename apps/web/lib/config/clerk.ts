/**
 * Clerk Configuration and Setup
 * Centralized configuration for Clerk authentication with environment-specific settings
 */

import { getAppConfigSync } from './init'

export interface ClerkConfig {
  publishableKey: string
  secretKey: string
  webhookSecret: string
  signInUrl: string
  signUpUrl: string
  afterSignInUrl: string
  afterSignUpUrl: string
  appearance: {
    theme: any
    variables: Record<string, string>
    elements: Record<string, any>
  }
  features: {
    socialAuth: boolean
    twoFactorAuth: boolean
    emailVerification: boolean
    passwordReset: boolean
  }
}

/**
 * Get Clerk configuration with environment-specific settings
 */
export function getClerkConfig(): ClerkConfig {
  const publishableKey = getAppConfigSync('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') || ''
  const secretKey = getAppConfigSync('CLERK_SECRET_KEY') || ''
  const webhookSecret = getAppConfigSync('CLERK_WEBHOOK_SECRET') || ''
  const nodeEnv = getAppConfigSync('NODE_ENV') || 'development'
  const appUrl = getAppConfigSync('NEXT_PUBLIC_APP_URL') || 'http://localhost:3007'

  return {
    publishableKey,
    secretKey,
    webhookSecret,
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding',
    appearance: {
      theme: {
        primaryColor: '#3B82F6', // C9d.ai blue
        primaryColorShade: 600,
        borderRadius: '8px'
      },
      variables: {
        colorPrimary: '#3B82F6',
        colorBackground: '#0F172A', // Dark background
        colorInputBackground: '#1E293B',
        colorInputText: '#F1F5F9',
        colorText: '#F1F5F9',
        colorTextSecondary: '#94A3B8',
        colorDanger: '#EF4444',
        colorSuccess: '#10B981',
        colorWarning: '#F59E0B',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        borderRadius: '8px'
      },
      elements: {
        formButtonPrimary: {
          backgroundColor: '#3B82F6',
          '&:hover': {
            backgroundColor: '#2563EB'
          }
        },
        card: {
          backgroundColor: '#1E293B',
          border: '1px solid #334155'
        },
        headerTitle: {
          color: '#F1F5F9'
        },
        headerSubtitle: {
          color: '#94A3B8'
        },
        socialButtonsBlockButton: {
          backgroundColor: '#334155',
          border: '1px solid #475569',
          color: '#F1F5F9',
          '&:hover': {
            backgroundColor: '#475569'
          }
        },
        formFieldInput: {
          backgroundColor: '#1E293B',
          border: '1px solid #475569',
          color: '#F1F5F9',
          '&:focus': {
            borderColor: '#3B82F6',
            boxShadow: '0 0 0 1px #3B82F6'
          }
        },
        formFieldLabel: {
          color: '#F1F5F9'
        },
        identityPreviewText: {
          color: '#94A3B8'
        },
        formButtonReset: {
          color: '#94A3B8',
          '&:hover': {
            color: '#F1F5F9'
          }
        }
      }
    },
    features: {
      socialAuth: true,
      twoFactorAuth: nodeEnv === 'production',
      emailVerification: true,
      passwordReset: true
    }
  }
}

/**
 * Validate Clerk configuration
 */
export function validateClerkConfig(config: Partial<ClerkConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.publishableKey) {
    errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required')
  } else if (!config.publishableKey.startsWith('pk_')) {
    errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key')
  }

  if (!config.secretKey) {
    errors.push('CLERK_SECRET_KEY is required')
  } else if (!config.secretKey.startsWith('sk_')) {
    errors.push('CLERK_SECRET_KEY must be a valid Clerk secret key')
  }

  if (!config.webhookSecret) {
    errors.push('CLERK_WEBHOOK_SECRET is required for webhook verification')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Get Clerk environment-specific settings
 */
export function getClerkEnvironmentSettings() {
  const nodeEnv = getAppConfigSync('NODE_ENV') || 'development'
  const isDevelopment = nodeEnv === 'development'
  const isProduction = nodeEnv === 'production'

  return {
    isDevelopment,
    isProduction,
    allowedOrigins: isDevelopment 
      ? ['http://localhost:3007', 'http://localhost:3000']
      : [getAppConfigSync('NEXT_PUBLIC_APP_URL') || 'https://app.c9d.ai'],
    sessionTokenName: isDevelopment ? '__session_dev' : '__session',
    cookieSettings: {
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: isProduction ? '.c9d.ai' : undefined
    }
  }
}

/**
 * Social authentication provider configuration
 */
export interface SocialProvider {
  id: string
  name: string
  enabled: boolean
  icon?: string
  strategy: string
}

export function getSocialProviders(): SocialProvider[] {
  return [
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
  ]
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbiddenPasswords: string[]
}

export function getPasswordRequirements(): PasswordRequirements {
  return {
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
  }
}

/**
 * Session configuration
 */
export interface SessionConfig {
  maxAge: number
  inactivityTimeout: number
  multiSession: boolean
  sameSite: 'strict' | 'lax' | 'none'
  secure: boolean
}

export function getSessionConfig(): SessionConfig {
  const nodeEnv = getAppConfigSync('NODE_ENV') || 'development'
  const isProduction = nodeEnv === 'production'

  return {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    inactivityTimeout: 30 * 60, // 30 minutes in seconds
    multiSession: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction
  }
}