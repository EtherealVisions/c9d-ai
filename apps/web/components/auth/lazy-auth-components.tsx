/**
 * Lazy-loaded authentication components with performance optimizations
 * 
 * This module provides lazy-loaded versions of authentication components
 * with optimized chunk splitting and loading strategies.
 */

'use client'

import React, { Suspense, ComponentType } from 'react'
import { createLazyAuthComponent } from '@/lib/performance/auth-performance'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Loading fallback components
const AuthFormSkeleton = () => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="space-y-2">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Social auth buttons skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Divider skeleton */}
      <div className="relative">
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-4 w-20 mx-auto absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      {/* Form fields skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  </Card>
)

const AuthFormSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading authentication form...</p>
    </div>
  </div>
)

// Lazy-loaded authentication components with optimized chunk names
export const LazySignInForm = createLazyAuthComponent(
  () => import('@/components/auth/sign-in-form').then(mod => ({ default: mod.SignInForm })),
  {
    chunkName: 'auth-sign-in',
    preload: true
  }
)

export const LazySignUpForm = createLazyAuthComponent(
  () => import('@/components/auth/sign-up-form').then(mod => ({ default: mod.SignUpForm })),
  {
    chunkName: 'auth-sign-up',
    preload: true
  }
)

export const LazyPasswordResetForm = createLazyAuthComponent(
  () => import('@/components/auth/password-reset-form').then(mod => ({ default: mod.PasswordResetForm })),
  {
    chunkName: 'auth-password-reset',
    preload: false
  }
)

export const LazyEmailVerificationForm = createLazyAuthComponent(
  () => import('@/components/auth/email-verification-form').then(mod => ({ default: mod.EmailVerificationForm })),
  {
    chunkName: 'auth-email-verification',
    preload: false
  }
)

export const LazyTwoFactorForm = createLazyAuthComponent(
  () => import('@/components/auth/two-factor-form').then(mod => ({ default: mod.TwoFactorForm })),
  {
    chunkName: 'auth-two-factor',
    preload: false
  }
)

export const LazyTwoFactorSetup = createLazyAuthComponent(
  () => import('@/components/auth/two-factor-setup').then(mod => ({ default: mod.TwoFactorSetup })),
  {
    chunkName: 'auth-two-factor-setup',
    preload: false
  }
)

// Wrapper components with Suspense and error boundaries
interface LazyAuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ComponentType
  skeleton?: boolean
}

const LazyAuthWrapper: React.FC<LazyAuthWrapperProps> = ({ 
  children, 
  fallback: CustomFallback,
  skeleton = true 
}) => {
  const FallbackComponent = CustomFallback || (skeleton ? AuthFormSkeleton : AuthFormSpinner)
  
  return (
    <Suspense fallback={<FallbackComponent />}>
      {children}
    </Suspense>
  )
}

// Pre-configured lazy auth components with wrappers
export const SignInFormLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper>
    <LazySignInForm {...props} />
  </LazyAuthWrapper>
)

export const SignUpFormLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper>
    <LazySignUpForm {...props} />
  </LazyAuthWrapper>
)

export const PasswordResetFormLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper skeleton={false}>
    <LazyPasswordResetForm {...props} />
  </LazyAuthWrapper>
)

export const EmailVerificationFormLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper skeleton={false}>
    <LazyEmailVerificationForm {...props} />
  </LazyAuthWrapper>
)

export const TwoFactorFormLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper skeleton={false}>
    <LazyTwoFactorForm {...props} />
  </LazyAuthWrapper>
)

export const TwoFactorSetupLazy: React.FC<any> = (props) => (
  <LazyAuthWrapper skeleton={false}>
    <LazyTwoFactorSetup {...props} />
  </LazyAuthWrapper>
)

// Performance-optimized auth layout
export const LazyAuthLayout = createLazyAuthComponent(
  () => import('@/components/auth/auth-layout').then(mod => ({ default: mod.AuthLayout })),
  {
    chunkName: 'auth-layout',
    preload: true
  }
)

export const AuthLayoutLazy: React.FC<any> = (props) => (
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <AuthFormSpinner />
    </div>
  }>
    <LazyAuthLayout {...props} />
  </Suspense>
)

// Preload function for critical auth components
export const preloadCriticalAuthComponents = async (): Promise<void> => {
  if (typeof window === 'undefined') return

  try {
    // Preload the most commonly used components
    const preloadPromises = [
      import('@/components/auth/sign-in-form'),
      import('@/components/auth/sign-up-form'),
      import('@/components/auth/auth-layout')
    ]

    // Use requestIdleCallback for non-blocking preloading
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        Promise.all(preloadPromises).catch(console.warn)
      }, { timeout: 2000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        Promise.all(preloadPromises).catch(console.warn)
      }, 100)
    }
  } catch (error) {
    console.warn('Failed to preload critical auth components:', error)
  }
}

// Component registry for dynamic loading
export const authComponentRegistry = {
  'sign-in': LazySignInForm,
  'sign-up': LazySignUpForm,
  'password-reset': LazyPasswordResetForm,
  'email-verification': LazyEmailVerificationForm,
  'two-factor': LazyTwoFactorForm,
  'two-factor-setup': LazyTwoFactorSetup,
  'auth-layout': LazyAuthLayout
} as const

export type AuthComponentType = keyof typeof authComponentRegistry

/**
 * Dynamic auth component loader
 */
export const loadAuthComponent = (
  componentType: AuthComponentType
): ComponentType<any> | null => {
  return authComponentRegistry[componentType] || null
}

/**
 * Preload specific auth component
 */
export const preloadAuthComponent = async (
  componentType: AuthComponentType
): Promise<void> => {
  const componentMap = {
    'sign-in': () => import('@/components/auth/sign-in-form'),
    'sign-up': () => import('@/components/auth/sign-up-form'),
    'password-reset': () => import('@/components/auth/password-reset-form'),
    'email-verification': () => import('@/components/auth/email-verification-form'),
    'two-factor': () => import('@/components/auth/two-factor-form'),
    'two-factor-setup': () => import('@/components/auth/two-factor-setup'),
    'auth-layout': () => import('@/components/auth/auth-layout')
  }

  const importFn = componentMap[componentType]
  if (importFn) {
    try {
      await importFn()
    } catch (error) {
      console.warn(`Failed to preload ${componentType} component:`, error)
    }
  }
}