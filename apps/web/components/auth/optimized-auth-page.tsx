/**
 * Optimized Authentication Page Component
 * 
 * This component demonstrates the implementation of all performance optimizations
 * including lazy loading, caching, and performance monitoring.
 */

'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  SignInFormLazy, 
  SignUpFormLazy, 
  PasswordResetFormLazy,
  EmailVerificationFormLazy,
  preloadCriticalAuthComponents
} from '@/components/auth/lazy-auth-components'
import { AuthLayoutLazy } from '@/components/auth/lazy-auth-components'
import { useAuthPerformance, usePagePerformance } from '@/hooks/use-auth-performance'
import { 
  userDataCache_instance, 
  sessionCache_instance, 
  formStateCache_instance,
  initializeAuthPerformance
} from '@/lib/performance/auth-performance'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export interface OptimizedAuthPageProps {
  mode: 'sign-in' | 'sign-up' | 'password-reset' | 'email-verification'
  redirectUrl?: string
  invitationToken?: string
  className?: string
}

/**
 * Performance-optimized authentication page with comprehensive monitoring
 */
export function OptimizedAuthPage({
  mode,
  redirectUrl,
  invitationToken,
  className
}: OptimizedAuthPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Performance monitoring
  const {
    performanceData,
    warnings,
    recommendations,
    trackInteraction,
    trackNetworkRequest,
    exportPerformanceData
  } = usePagePerformance(`auth-${mode}`)

  const [isInitialized, setIsInitialized] = useState(false)
  const [showPerformanceWarnings, setShowPerformanceWarnings] = useState(false)

  // Initialize performance optimizations
  useEffect(() => {
    const initializePerformance = async () => {
      try {
        // Initialize auth performance system
        initializeAuthPerformance()
        
        // Preload critical components
        await preloadCriticalAuthComponents()
        
        // Restore form state if available
        const formId = `auth-${mode}`
        const savedFormState = await formStateCache_instance.restoreFormState(formId)
        
        if (savedFormState) {
          console.debug('Restored form state for', formId)
        }
        
        setIsInitialized(true)
      } catch (error) {
        console.warn('Failed to initialize auth performance:', error)
        setIsInitialized(true) // Continue anyway
      }
    }

    initializePerformance()
  }, [mode])

  // Monitor performance warnings
  useEffect(() => {
    if (warnings.length > 0) {
      console.warn('Auth performance warnings:', warnings)
      
      // Show warnings in development
      if (process.env.NODE_ENV === 'development') {
        setShowPerformanceWarnings(true)
      }
    }
  }, [warnings])

  // Export performance data for analytics
  useEffect(() => {
    const handleBeforeUnload = () => {
      const perfData = exportPerformanceData()
      if (perfData) {
        // Send to analytics service
        navigator.sendBeacon('/api/analytics/performance', JSON.stringify(perfData))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [exportPerformanceData])

  /**
   * Handle form submission with performance tracking
   */
  const handleFormSubmission = async (formData: any) => {
    const endInteraction = trackInteraction('form-submission')
    
    try {
      // Save form state for recovery
      const formId = `auth-${mode}`
      formStateCache_instance.saveFormState(formId, formData)
      
      // Track network request
      const result = await trackNetworkRequest(async () => {
        // Simulate form submission - replace with actual auth logic
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { success: true }
      }, 'auth-submission')
      
      // Clear form state on success
      formStateCache_instance.clearFormState(formId)
      
      return result
    } catch (error) {
      console.error('Form submission failed:', error)
      throw error
    } finally {
      endInteraction?.()
    }
  }

  /**
   * Render the appropriate auth form component
   */
  const renderAuthForm = () => {
    const commonProps = {
      redirectUrl,
      invitationToken,
      onSubmit: handleFormSubmission
    }

    switch (mode) {
      case 'sign-in':
        return <SignInFormLazy {...commonProps} />
      
      case 'sign-up':
        return <SignUpFormLazy {...commonProps} />
      
      case 'password-reset':
        return <PasswordResetFormLazy {...commonProps} />
      
      case 'email-verification':
        return <EmailVerificationFormLazy {...commonProps} />
      
      default:
        return <SignInFormLazy {...commonProps} />
    }
  }

  /**
   * Get page title and subtitle based on mode
   */
  const getPageContent = () => {
    switch (mode) {
      case 'sign-in':
        return {
          title: 'Welcome back',
          subtitle: 'Sign in to your C9d.ai account'
        }
      
      case 'sign-up':
        return {
          title: 'Create your account',
          subtitle: 'Get started with C9d.ai today'
        }
      
      case 'password-reset':
        return {
          title: 'Reset your password',
          subtitle: 'Enter your email to receive reset instructions'
        }
      
      case 'email-verification':
        return {
          title: 'Verify your email',
          subtitle: 'Check your inbox for the verification code'
        }
      
      default:
        return {
          title: 'Authentication',
          subtitle: 'Access your account'
        }
    }
  }

  const { title, subtitle } = getPageContent()

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('auth-page-optimized', className)}>
      {/* Performance warnings for development */}
      {showPerformanceWarnings && warnings.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Performance Issues Detected:</p>
                <ul className="text-xs space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
                {recommendations.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium">
                      Recommendations
                    </summary>
                    <ul className="text-xs space-y-1 mt-1">
                      {recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main authentication layout */}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      }>
        <AuthLayoutLazy
          title={title}
          subtitle={subtitle}
          className="auth-layout-optimized"
        >
          {renderAuthForm()}
        </AuthLayoutLazy>
      </Suspense>

      {/* Performance monitoring data (development only) */}
      {process.env.NODE_ENV === 'development' && performanceData && (
        <div className="fixed bottom-4 left-4 z-50 max-w-xs">
          <details className="bg-background border rounded-lg p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              Performance Data
            </summary>
            <div className="mt-2 space-y-1">
              <div>Load: {performanceData.componentLoadTime.toFixed(2)}ms</div>
              <div>Render: {performanceData.renderTime.toFixed(2)}ms</div>
              <div>Cache Hit: {(performanceData.cacheHitRate * 100).toFixed(1)}%</div>
              <div>Memory: {(performanceData.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
              {performanceData.networkLatency > 0 && (
                <div>Network: {performanceData.networkLatency.toFixed(2)}ms</div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

/**
 * Optimized sign-in page
 */
export function OptimizedSignInPage(props: Omit<OptimizedAuthPageProps, 'mode'>) {
  return <OptimizedAuthPage {...props} mode="sign-in" />
}

/**
 * Optimized sign-up page
 */
export function OptimizedSignUpPage(props: Omit<OptimizedAuthPageProps, 'mode'>) {
  return <OptimizedAuthPage {...props} mode="sign-up" />
}

/**
 * Optimized password reset page
 */
export function OptimizedPasswordResetPage(props: Omit<OptimizedAuthPageProps, 'mode'>) {
  return <OptimizedAuthPage {...props} mode="password-reset" />
}

/**
 * Optimized email verification page
 */
export function OptimizedEmailVerificationPage(props: Omit<OptimizedAuthPageProps, 'mode'>) {
  return <OptimizedAuthPage {...props} mode="email-verification" />
}