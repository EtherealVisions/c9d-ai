'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSocialProviders } from '@/lib/config/clerk'
import { 
  AccessibleInput, 
  AccessibleButton, 
  AccessibleCheckbox, 
  AccessibleFormGroup,
  SkipLink,
  LiveRegion
} from '@/components/ui/accessible-form'
import { useAccessibility, useAnnouncement, useKeyboardNavigation } from '@/contexts/accessibility-context'
import { FocusManager, generateId } from '@/lib/utils/accessibility'
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations'

interface SignInFormProps {
  redirectUrl?: string
  error?: string
  className?: string
}

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

/**
 * SignInForm component with social authentication and comprehensive accessibility
 * 
 * Features:
 * - Email/password authentication with full accessibility support
 * - Social authentication integration (Google, GitHub, Microsoft)
 * - "Remember Me" functionality with proper ARIA labels
 * - Comprehensive error handling with screen reader announcements
 * - WCAG 2.1 AA compliance
 * - Keyboard navigation support
 * - High contrast mode compatibility
 * - Touch device optimizations
 * - Screen reader support with live regions
 */
export function SignInForm({ redirectUrl, error, className }: SignInFormProps) {
  const { signIn, isLoaded, setActive } = useSignIn()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [currentAnnouncement, setCurrentAnnouncement] = useState('')

  // Accessibility hooks
  const { isTouchDevice, announce } = useAccessibility()
  const { announceError, announceSuccess, announceLoading } = useAnnouncement()
  
  // Mobile optimization hooks
  const { 
    isMobile, 
    isVirtualKeyboardOpen, 
    addTouchFeedback, 
    optimizeForMobile,
    handleOrientationChange
  } = useMobileOptimizations()
  
  // Refs for focus management
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  // Generate unique IDs for ARIA relationships
  const formId = generateId('sign-in-form')
  const emailFieldId = generateId('email-field')
  const passwordFieldId = generateId('password-field')
  const rememberMeId = generateId('remember-me')
  const errorRegionId = generateId('error-region')
  const statusRegionId = generateId('status-region')

  // Get configuration
  const socialProviders = getSocialProviders()

  // Keyboard navigation
  const { handleKeyDown } = useKeyboardNavigation(
    () => {
      // Enter key - submit form if valid
      if (formRef.current && !isLoading) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
        formRef.current.dispatchEvent(submitEvent)
      }
    },
    () => {
      // Escape key - clear form or navigate away
      if (formData.email || formData.password) {
        setFormData({ email: '', password: '' })
        setErrors({})
        announce('Form cleared', 'polite')
      }
    }
  )

  // Load remember me preference and set up accessibility on mount
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('c9d-remember-me')
    if (savedRememberMe === 'true') {
      setRememberMe(true)
    }

    // Set up focus trap when form loads
    if (formRef.current) {
      const cleanup = FocusManager.trapFocus(formRef.current)
      
      // Focus first input on mount (delay for mobile)
      const focusDelay = isMobile ? 300 : 100
      setTimeout(() => {
        emailRef.current?.focus()
      }, focusDelay)

      return cleanup
    }
  }, [isMobile])

  // Handle orientation changes for mobile
  useEffect(() => {
    if (!isMobile) return

    const cleanup = handleOrientationChange((orientation) => {
      // Adjust form layout for orientation changes
      if (orientation === 'landscape' && isVirtualKeyboardOpen) {
        // Scroll to active element when keyboard is open in landscape
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && formRef.current?.contains(activeElement)) {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
          }, 100)
        }
      }
    })

    return cleanup
  }, [isMobile, isVirtualKeyboardOpen, handleOrientationChange])

  // Optimize form elements for mobile
  useEffect(() => {
    if (!isMobile || !formRef.current) return

    const cleanupFunctions: (() => void)[] = []

    // Optimize all interactive elements
    const interactiveElements = formRef.current.querySelectorAll(
      'button, input, [role="button"]'
    ) as NodeListOf<HTMLElement>

    interactiveElements.forEach(element => {
      cleanupFunctions.push(optimizeForMobile(element))
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [isMobile, optimizeForMobile])

  // Announce loading states
  useEffect(() => {
    if (isLoading) {
      announceLoading('Signing in, please wait')
      setCurrentAnnouncement('Signing in, please wait')
    }
  }, [isLoading, announceLoading])

  // Announce errors
  useEffect(() => {
    if (error || errors.general) {
      const errorMessage = error || errors.general || ''
      announceError(errorMessage)
      setCurrentAnnouncement(`Error: ${errorMessage}`)
    }
  }, [error, errors.general, announceError])

  /**
   * Validate form field
   */
  const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format'
        break
      
      case 'password':
        if (!value) return 'Password is required'
        break
    }
    return undefined
  }, [])

  /**
   * Handle input change with real-time validation
   */
  const handleInputChange = useCallback((name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate all fields
      const fieldErrors: FormErrors = {}
      Object.keys(formData).forEach(key => {
        const error = validateField(key as keyof FormData, formData[key as keyof FormData])
        if (error) fieldErrors[key as keyof FormErrors] = error
      })
      
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }
      
      // Attempt sign-in with Clerk
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password
      })
      
      if (result.status === 'complete') {
        // Set the active session with appropriate configuration
        await setActive({ 
          session: result.createdSessionId,
          // Note: Clerk handles session persistence automatically
          // The rememberMe state could be used for additional client-side preferences
        })
        
        // Store remember me preference for future use
        if (rememberMe) {
          localStorage.setItem('c9d-remember-me', 'true')
        } else {
          localStorage.removeItem('c9d-remember-me')
        }
        
        // Redirect to appropriate destination
        router.push(redirectUrl || '/dashboard')
      } else {
        // Handle incomplete sign-in (e.g., 2FA required)
        console.log('Sign-in incomplete:', result)
        setErrors({ general: 'Additional verification required. Please check your email or authenticator app.' })
      }
      
    } catch (error: any) {
      console.error('Sign-in error:', error)
      
      // Handle Clerk-specific errors
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_identifier_not_found':
              clerkErrors.email = 'No account found with this email address'
              break
            case 'form_password_incorrect':
              clerkErrors.password = 'Incorrect password'
              break
            case 'form_identifier_exists':
              clerkErrors.email = 'Please verify your email address before signing in'
              break
            case 'session_exists':
              // User is already signed in, redirect
              router.push(redirectUrl || '/dashboard')
              return
            case 'too_many_requests':
              clerkErrors.general = 'Too many sign-in attempts. Please try again later.'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'An error occurred during sign-in'
          }
        })
        setErrors(clerkErrors)
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle social authentication
   */
  const handleSocialAuth = async (strategy: string) => {
    if (!isLoaded) return
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: strategy as any,
        redirectUrl: redirectUrl || '/dashboard',
        redirectUrlComplete: redirectUrl || '/dashboard'
      })
    } catch (error: any) {
      console.error('Social auth error:', error)
      setErrors({ general: 'Social authentication failed. Please try again.' })
    }
  }

  /**
   * Handle forgot password
   */
  const handleForgotPassword = () => {
    // Navigate to password reset page with email if provided
    const resetUrl = formData.email 
      ? `/reset-password?email=${encodeURIComponent(formData.email)}`
      : '/reset-password'
    
    router.push(resetUrl)
  }

  return (
    <div 
      data-testid="sign-in-form" 
      className={cn(
        // Mobile-first responsive spacing
        'space-y-4 xs:space-y-5 sm:space-y-6',
        // Mobile optimizations
        isMobile && 'mobile-form',
        // Virtual keyboard adjustments
        isVirtualKeyboardOpen && 'mobile-keyboard-aware',
        className
      )}
      role="main"
      aria-labelledby="sign-in-heading"
    >
      {/* Skip Link */}
      <SkipLink href="#sign-in-form-fields">
        Skip to sign-in form
      </SkipLink>

      {/* Live Regions for Screen Reader Announcements */}
      <LiveRegion priority="assertive">
        {currentAnnouncement}
      </LiveRegion>

      {/* Form Heading */}
      <div className="sr-only">
        <h1 id="sign-in-heading">Sign in to your account</h1>
      </div>

      {/* Social Authentication */}
      <AccessibleFormGroup>
        <div 
          data-testid="social-auth-section" 
          className={cn(
            // Mobile-first responsive spacing
            'space-y-2 xs:space-y-3 sm:space-y-3'
          )}
          role="group"
          aria-labelledby="social-auth-heading"
        >
          <h2 id="social-auth-heading" className="sr-only">
            Social authentication options
          </h2>
          
          {socialProviders.filter(p => p.enabled).map((provider, index) => (
            <AccessibleButton
              key={provider.id}
              type="button"
              variant="outline"
              className={cn(
                'w-full',
                // Mobile optimizations
                isMobile && 'social-auth-mobile touch-target-enhanced',
                // Loading state
                isLoading && 'mobile-loading'
              )}
              onClick={() => handleSocialAuth(provider.strategy)}
              disabled={isLoading}
              data-testid={`social-auth-${provider.id}-button`}
              aria-describedby={`${provider.id}-description`}
              onKeyDown={handleKeyDown}
            >
              <span className={cn(
                "flex-shrink-0",
                // Mobile-first responsive spacing
                "mr-2 xs:mr-3 sm:mr-2"
              )} aria-hidden="true">
                {provider.icon === 'google' && '🔍'}
                {provider.icon === 'github' && '🐙'}
                {provider.icon === 'microsoft' && '🪟'}
              </span>
              <span className={cn(
                // Mobile-first responsive text
                "text-sm xs:text-base sm:text-sm font-medium"
              )}>
                Continue with {provider.name}
              </span>
              <span id={`${provider.id}-description`} className="sr-only">
                Sign in using your {provider.name} account
              </span>
            </AccessibleButton>
          ))}
        </div>
      </AccessibleFormGroup>

      {/* Divider */}
      <div className="relative" role="separator" aria-label="Or continue with email">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className={cn(
          "relative flex justify-center uppercase",
          // Mobile-first responsive text sizing
          "text-xs xs:text-xs sm:text-xs"
        )}>
          <span className={cn(
            "bg-background text-muted-foreground",
            // Mobile-first responsive padding
            "px-2 xs:px-3 sm:px-2"
          )}>
            Or continue with email
          </span>
        </div>
      </div>

      {/* General Error */}
      {(errors.general || error) && (
        <div
          id={errorRegionId}
          role="alert"
          aria-live="assertive"
          data-testid="sign-in-error-alert"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription data-testid="sign-in-error-message">
              {errors.general || error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Sign-in Form */}
      <form 
        ref={formRef}
        id={formId}
        data-testid="sign-in-form-fields" 
        onSubmit={handleSubmit} 
        className="space-y-4"
        noValidate
        aria-labelledby="form-heading"
        onKeyDown={handleKeyDown}
      >
        <h2 id="form-heading" className="sr-only">
          Email and password sign-in form
        </h2>
        {/* Email Field */}
        <AccessibleInput
          ref={emailRef}
          id={emailFieldId}
          data-testid="email-input"
          type="email"
          label="Email address"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => {
            const error = validateField('email', formData.email)
            if (error) setErrors(prev => ({ ...prev, email: error }))
          }}
          error={errors.email}
          disabled={isLoading}
          required
          autoComplete="email"
          placeholder="Enter your email address"
          hint="We'll use this to identify your account"
        />

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={passwordFieldId} className="text-sm font-medium">
              Password
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </label>
            <AccessibleButton
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleForgotPassword}
              disabled={isLoading}
              data-testid="forgot-password-link"
              aria-describedby="forgot-password-description"
            >
              Forgot password?
              <span id="forgot-password-description" className="sr-only">
                Reset your password via email
              </span>
            </AccessibleButton>
          </div>
          
          <AccessibleInput
            id={passwordFieldId}
            data-testid="password-input"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={() => {
              const error = validateField('password', formData.password)
              if (error) setErrors(prev => ({ ...prev, password: error }))
            }}
            error={errors.password}
            disabled={isLoading}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            showPasswordToggle
          />
        </div>

        {/* Remember Me */}
        <AccessibleCheckbox
          id={rememberMeId}
          data-testid="remember-me-checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isLoading}
          label="Remember me on this device"
          description="Keep me signed in for faster access (not recommended on shared devices)"
        />

        {/* CAPTCHA Container - Required by Clerk for bot protection */}
        <div 
          id="clerk-captcha"
          className="flex justify-center"
          role="region"
          aria-label="Security verification"
          aria-describedby="signin-captcha-description"
        >
          {/* Clerk will inject the CAPTCHA widget here when needed */}
        </div>
        <div id="signin-captcha-description" className="sr-only">
          Complete the security verification if prompted
        </div>

        {/* Submit Button */}
        <AccessibleButton
          ref={submitButtonRef}
          type="submit"
          className={cn(
            'w-full',
            // Mobile optimizations
            isMobile && 'touch-target-enhanced',
            // Loading state
            isLoading && 'mobile-loading'
          )}
          disabled={isLoading || !isLoaded}
          loading={isLoading}
          loadingText="Signing in..."
          data-testid="sign-in-submit-button"
          aria-describedby="submit-description"
        >
          <span className={cn(
            // Mobile-first responsive text
            "text-sm xs:text-base sm:text-sm font-medium"
          )}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </span>
          <span id="submit-description" className="sr-only">
            Submit the sign-in form to access your account
          </span>
        </AccessibleButton>
      </form>

      {/* Sign Up Link */}
      <div 
        data-testid="sign-up-link-section" 
        className="text-center"
        role="complementary"
        aria-labelledby="sign-up-heading"
      >
        <h3 id="sign-up-heading" className="sr-only">
          Create new account
        </h3>
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <AccessibleButton
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => router.push('/sign-up')}
            data-testid="sign-up-link"
            aria-describedby="sign-up-description"
          >
            Sign up
            <span id="sign-up-description" className="sr-only">
              Navigate to the account registration page
            </span>
          </AccessibleButton>
        </p>
      </div>

      {/* Status Region for Success Messages */}
      <div
        id={statusRegionId}
        role="status"
        aria-live="polite"
        className="sr-only"
      />
    </div>
  )
}