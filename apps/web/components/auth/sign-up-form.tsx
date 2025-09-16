'use client'

import React, { useState, useCallback } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPasswordRequirements, getSocialProviders } from '@/lib/config/clerk'

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
 * SignUpForm component with comprehensive validation and real-time feedback
 * 
 * Features:
 * - Real-time password strength validation
 * - Form state management with error handling
 * - Social authentication integration
 * - Email verification flow
 * - Accessibility compliance
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

  // Get configuration
  const passwordRequirements = getPasswordRequirements()
  const socialProviders = getSocialProviders()

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
    <div className={cn('space-y-6', className)}>
      {/* Social Authentication */}
      <div className="space-y-3">
        {socialProviders.filter(p => p.enabled).map(provider => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialAuth(provider.strategy)}
            disabled={isLoading}
          >
            <span className="mr-2">
              {provider.icon === 'google' && '🔍'}
              {provider.icon === 'github' && '🐙'}
              {provider.icon === 'microsoft' && '🪟'}
            </span>
            Continue with {provider.name}
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
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
            <div id="password-strength" className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      getPasswordStrengthColor(passwordStrength.score)
                    )}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isLoaded}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
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