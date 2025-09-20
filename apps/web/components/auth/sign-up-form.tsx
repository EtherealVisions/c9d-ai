'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPasswordRequirements, getSocialProviders } from '@/lib/config/clerk'
import { 
  AccessibleInput, 
  AccessibleButton, 
  AccessibleFormGroup,
  SkipLink,
  LiveRegion
} from '@/components/ui/accessible-form'
import { useAccessibility, useAnnouncement, useKeyboardNavigation } from '@/contexts/accessibility-context'
import { FocusManager, generateId, ScreenReaderSupport } from '@/lib/utils/accessibility'
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations'

interface SignUpFormProps {
  redirectUrl?: string
  invitationToken?: string
  className?: string
}

interface FormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
  general?: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

/**
 * SignUpForm component with comprehensive validation and accessibility
 * 
 * Features:
 * - Real-time password strength validation with screen reader support
 * - Form state management with accessible error handling
 * - Social authentication integration with proper ARIA labels
 * - Email verification flow with clear instructions
 * - WCAG 2.1 AA compliance
 * - Keyboard navigation support
 * - High contrast mode compatibility
 * - Touch device optimizations
 * - Screen reader announcements for all state changes
 */
export function SignUpForm({ redirectUrl, invitationToken, className }: SignUpFormProps) {
  const { signUp, isLoaded, setActive } = useSignUp()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false
  })
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
  const firstNameRef = useRef<HTMLInputElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  // Generate unique IDs for ARIA relationships
  const formId = generateId('sign-up-form')
  const firstNameId = generateId('first-name')
  const lastNameId = generateId('last-name')
  const emailId = generateId('email')
  const passwordId = generateId('password')
  const confirmPasswordId = generateId('confirm-password')
  const passwordStrengthId = generateId('password-strength')
  const errorRegionId = generateId('error-region')
  const statusRegionId = generateId('status-region')

  // Get configuration
  const passwordRequirements = getPasswordRequirements()
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
      // Escape key - clear form
      if (Object.values(formData).some(value => value)) {
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: ''
        })
        setErrors({})
        setPasswordStrength({ score: 0, feedback: [], isValid: false })
        announce('Form cleared', 'polite')
      }
    }
  )

  // Set up accessibility on mount
  useEffect(() => {
    // Set up focus trap when form loads
    if (formRef.current) {
      const cleanup = FocusManager.trapFocus(formRef.current)
      
      // Focus first input on mount
      setTimeout(() => {
        firstNameRef.current?.focus()
      }, 100)

      return cleanup
    }
  }, [])

  // Announce loading states
  useEffect(() => {
    if (isLoading) {
      announceLoading('Creating account, please wait')
      setCurrentAnnouncement('Creating account, please wait')
    }
  }, [isLoading, announceLoading])

  // Announce errors
  useEffect(() => {
    if (errors.general) {
      announceError(errors.general)
      setCurrentAnnouncement(`Error: ${errors.general}`)
    }
  }, [errors.general, announceError])

  // Announce password strength changes
  useEffect(() => {
    if (formData.password && passwordStrength.feedback.length > 0) {
      const strengthLabel = getPasswordStrengthLabel(passwordStrength.score)
      const requirements = passwordStrength.feedback.join(', ')
      const message = `Password strength: ${strengthLabel}. Missing requirements: ${requirements}`
      setCurrentAnnouncement(message)
    } else if (formData.password && passwordStrength.isValid) {
      const message = 'Password meets all requirements'
      announceSuccess(message)
      setCurrentAnnouncement(message)
    }
  }, [passwordStrength, formData.password, announceSuccess])

  /**
   * Validate password strength in real-time
   */
  const validatePasswordStrength = useCallback((password: string): PasswordStrength => {
    const feedback: string[] = []
    let score = 0

    if (password.length >= passwordRequirements.minLength) {
      score += 1
    } else {
      feedback.push(`At least ${passwordRequirements.minLength} characters`)
    }

    if (passwordRequirements.requireUppercase && /[A-Z]/.test(password)) {
      score += 1
    } else if (passwordRequirements.requireUppercase) {
      feedback.push('One uppercase letter')
    }

    if (passwordRequirements.requireLowercase && /[a-z]/.test(password)) {
      score += 1
    } else if (passwordRequirements.requireLowercase) {
      feedback.push('One lowercase letter')
    }

    if (passwordRequirements.requireNumbers && /\d/.test(password)) {
      score += 1
    } else if (passwordRequirements.requireNumbers) {
      feedback.push('One number')
    }

    if (passwordRequirements.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else if (passwordRequirements.requireSpecialChars) {
      feedback.push('One special character')
    }

    // Check for forbidden passwords
    if (passwordRequirements.forbiddenPasswords.some(forbidden => 
      password.toLowerCase().includes(forbidden.toLowerCase())
    )) {
      feedback.push('Avoid common passwords')
      score = Math.max(0, score - 2)
    }

    return {
      score,
      feedback,
      isValid: score >= 5 && feedback.length === 0
    }
  }, [passwordRequirements])

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
        const strength = validatePasswordStrength(value)
        if (!strength.isValid) return 'Password does not meet requirements'
        break
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password'
        if (value !== formData.password) return 'Passwords do not match'
        break
      
      case 'firstName':
        if (!value) return 'First name is required'
        if (value.length < 2) return 'First name must be at least 2 characters'
        break
      
      case 'lastName':
        if (!value) return 'Last name is required'
        if (value.length < 2) return 'Last name must be at least 2 characters'
        break
    }
    return undefined
  }, [formData.password, validatePasswordStrength])

  /**
   * Handle input change with real-time validation
   */
  const handleInputChange = useCallback((name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time password strength validation
    if (name === 'password') {
      setPasswordStrength(validatePasswordStrength(value))
    }
    
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword)
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }))
    }
  }, [errors, formData.confirmPassword, validateField, validatePasswordStrength])

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
      
      // Create sign-up with Clerk
      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        ...(invitationToken && { invitationToken })
      })
      
      // Send email verification
      await result.prepareEmailAddressVerification({ strategy: 'email_code' })
      
      // Redirect to verification page
      const verifyUrl = new URL('/verify-email', window.location.origin)
      if (redirectUrl) verifyUrl.searchParams.set('redirect_url', redirectUrl)
      router.push(verifyUrl.toString())
      
    } catch (error: any) {
      console.error('Sign-up error:', error)
      
      // Handle Clerk-specific errors
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_identifier_exists':
              clerkErrors.email = 'An account with this email already exists'
              break
            case 'form_password_pwned':
              clerkErrors.password = 'This password has been compromised. Please choose a different one'
              break
            case 'form_password_validation_failed':
              clerkErrors.password = 'Password does not meet security requirements'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'An error occurred during sign-up'
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
      await signUp.authenticateWithRedirect({
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
   * Get password strength color
   */
  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  /**
   * Get password strength label
   */
  const getPasswordStrengthLabel = (score: number) => {
    if (score <= 1) return 'Weak'
    if (score <= 3) return 'Fair'
    if (score <= 4) return 'Good'
    return 'Strong'
  }

  return (
    <div className={cn(
      // Mobile-first responsive spacing
      'space-y-4 xs:space-y-5 sm:space-y-6',
      // Mobile optimizations
      isMobile && 'mobile-form',
      // Virtual keyboard adjustments
      isVirtualKeyboardOpen && 'mobile-keyboard-aware',
      className
    )}>
      {/* Social Authentication */}
      <div className={cn(
        // Mobile-first responsive spacing
        'space-y-2 xs:space-y-3 sm:space-y-3'
      )}>
        {socialProviders.filter(p => p.enabled).map(provider => (
          <Button
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
          >
            <span className={cn(
              "flex-shrink-0",
              // Mobile-first responsive spacing
              "mr-2 xs:mr-3 sm:mr-2"
            )}>
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
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
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
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Invitation Notice */}
      {invitationToken && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've been invited to join an organization. Complete your registration to accept the invitation.
          </AlertDescription>
        </Alert>
      )}

      {/* Sign-up Form */}
      <form onSubmit={handleSubmit} className={cn(
        // Mobile-first responsive spacing
        'space-y-3 xs:space-y-4 sm:space-y-4'
      )}>
        {/* Name Fields */}
        <div className={cn(
          // Mobile-first responsive grid
          'grid gap-3 xs:gap-4 sm:gap-4',
          // Stack on mobile, side-by-side on larger screens
          'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2'
        )}>
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              onBlur={() => {
                const error = validateField('firstName', formData.firstName)
                if (error) setErrors(prev => ({ ...prev, firstName: error }))
              }}
              className={cn(errors.firstName && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            {errors.firstName && (
              <p id="firstName-error" className="text-sm text-destructive">
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              onBlur={() => {
                const error = validateField('lastName', formData.lastName)
                if (error) setErrors(prev => ({ ...prev, lastName: error }))
              }}
              className={cn(errors.lastName && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            {errors.lastName && (
              <p id="lastName-error" className="text-sm text-destructive">
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => {
              const error = validateField('email', formData.email)
              if (error) setErrors(prev => ({ ...prev, email: error }))
            }}
            className={cn(errors.email && 'border-destructive')}
            disabled={isLoading}
            required
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => {
                const error = validateField('password', formData.password)
                if (error) setErrors(prev => ({ ...prev, password: error }))
              }}
              className={cn(
                'pr-10',
                errors.password && 'border-destructive'
              )}
              disabled={isLoading}
              required
              aria-describedby={errors.password ? 'password-error' : 'password-strength'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div id="password-strength" className={cn(
              // Mobile-first responsive spacing
              'space-y-2 xs:space-y-2 sm:space-y-2',
              // Mobile optimizations
              isMobile && 'password-strength-mobile'
            )}>
              <div className={cn(
                "flex items-center",
                // Mobile-first responsive spacing
                "space-x-2 xs:space-x-2 sm:space-x-2"
              )}>
                <div className={cn(
                  "flex-1 bg-muted rounded-full overflow-hidden",
                  // Mobile-first responsive height
                  "h-2 xs:h-2 sm:h-2",
                  // Mobile enhancement
                  isMobile && 'strength-bar'
                )}>
                  <div
                    className={cn(
                      'h-full rounded-full',
                      // Mobile enhancement
                      isMobile ? 'strength-fill' : 'transition-all duration-300',
                      getPasswordStrengthColor(passwordStrength.score)
                    )}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className={cn(
                  "text-muted-foreground",
                  // Mobile-first responsive text
                  "text-xs xs:text-xs sm:text-xs"
                )}>
                  {getPasswordStrengthLabel(passwordStrength.score)}
                </span>
              </div>

              {/* Password Requirements */}
              {passwordStrength.feedback.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Password must include:</p>
                  <ul className="space-y-1">
                    {passwordStrength.feedback.map((requirement, index) => (
                      <li key={index} className="flex items-center space-x-2 text-xs">
                        <X className="h-3 w-3 text-destructive" />
                        <span className="text-muted-foreground">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Password Valid Indicator */}
              {passwordStrength.isValid && (
                <div className="flex items-center space-x-2 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  <span>Password meets all requirements</span>
                </div>
              )}
            </div>
          )}

          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => {
                const error = validateField('confirmPassword', formData.confirmPassword)
                if (error) setErrors(prev => ({ ...prev, confirmPassword: error }))
              }}
              className={cn(
                'pr-10',
                errors.confirmPassword && 'border-destructive'
              )}
              disabled={isLoading}
              required
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-sm text-destructive">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* CAPTCHA Container - Required by Clerk for bot protection */}
        <div 
          id="clerk-captcha"
          className="flex justify-center"
          role="region"
          aria-label="Security verification"
          aria-describedby="captcha-description"
        >
          {/* Clerk will inject the CAPTCHA widget here */}
        </div>
        <div id="captcha-description" className="sr-only">
          Complete the security verification to create your account
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className={cn(
            'w-full',
            // Mobile optimizations
            isMobile && 'touch-target-enhanced',
            // Loading state
            isLoading && 'mobile-loading'
          )}
          disabled={isLoading || !isLoaded}
        >
          <span className={cn(
            // Mobile-first responsive text
            "text-sm xs:text-base sm:text-sm font-medium"
          )}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </span>
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => router.push('/sign-in')}
          >
            Sign in
          </Button>
        </p>
      </div>
    </div>
  )
}