'use client'

import React, { useState, useCallback } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPasswordRequirements } from '@/lib/config/clerk'

interface PasswordResetFormProps {
  email?: string
  token?: string
  error?: string
  className?: string
}

interface FormData {
  email: string
  password: string
  confirmPassword: string
  code: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  code?: string
  general?: string
}

type ResetStep = 'request' | 'verify' | 'reset' | 'success'

/**
 * PasswordResetForm component with comprehensive password reset flow
 * 
 * Features:
 * - Email-based password reset request
 * - Verification code validation
 * - New password setting with strength validation
 * - Success confirmation
 * - Comprehensive error handling
 */
export function PasswordResetForm({ email, token, error, className }: PasswordResetFormProps) {
  const { signIn, isLoaded } = useSignIn()
  const router = useRouter()
  
  // Form state
  const [currentStep, setCurrentStep] = useState<ResetStep>(
    token ? 'reset' : email ? 'verify' : 'request'
  )
  const [formData, setFormData] = useState<FormData>({
    email: email || '',
    password: '',
    confirmPassword: '',
    code: token || ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  // Get password requirements
  const passwordRequirements = getPasswordRequirements()

  /**
   * Validate email format
   */
  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format'
    return undefined
  }, [])

  /**
   * Validate password strength
   */
  const validatePassword = useCallback((password: string): string | undefined => {
    if (!password) return 'Password is required'
    
    const requirements = passwordRequirements
    const errors: string[] = []
    
    if (password.length < requirements.minLength) {
      errors.push(`At least ${requirements.minLength} characters`)
    }
    
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('One uppercase letter')
    }
    
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('One lowercase letter')
    }
    
    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('One number')
    }
    
    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('One special character')
    }
    
    if (requirements.forbiddenPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common')
    }
    
    if (errors.length > 0) {
      return `Password must contain: ${errors.join(', ')}`
    }
    
    return undefined
  }, [passwordRequirements])

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
   * Handle password reset request
   */
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate email
      const emailError = validateEmail(formData.email)
      if (emailError) {
        setErrors({ email: emailError })
        setIsLoading(false)
        return
      }
      
      // Create sign-in attempt to trigger password reset
      await signIn.create({
        identifier: formData.email
      })
      
      // Prepare password reset
      const firstFactor = signIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code'
      )
      
      if (firstFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'reset_password_email_code',
          emailAddressId: (firstFactor as any).emailAddressId
        })
        
        setResetEmailSent(true)
        setCurrentStep('verify')
      } else {
        setErrors({ general: 'Password reset is not available for this account' })
      }
      
    } catch (error: any) {
      console.error('Password reset request error:', error)
      
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_identifier_not_found':
              clerkErrors.email = 'No account found with this email address'
              break
            case 'too_many_requests':
              clerkErrors.general = 'Too many reset requests. Please try again later.'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'Failed to send reset email'
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
   * Handle verification code submission
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      if (!formData.code) {
        setErrors({ code: 'Verification code is required' })
        setIsLoading(false)
        return
      }
      
      // Attempt first factor verification
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: formData.code
      })
      
      if (result.status === 'needs_new_password') {
        setCurrentStep('reset')
      } else {
        setErrors({ general: 'Unexpected verification result. Please try again.' })
      }
      
    } catch (error: any) {
      console.error('Code verification error:', error)
      
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_code_incorrect':
              clerkErrors.code = 'Invalid verification code'
              break
            case 'form_code_expired':
              clerkErrors.code = 'Verification code has expired'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'Code verification failed'
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
   * Handle password reset
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate passwords
      const passwordError = validatePassword(formData.password)
      if (passwordError) {
        setErrors({ password: passwordError })
        setIsLoading(false)
        return
      }
      
      if (formData.password !== formData.confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match' })
        setIsLoading(false)
        return
      }
      
      // Reset password
      const result = await signIn.resetPassword({
        password: formData.password
      })
      
      if (result.status === 'complete') {
        setCurrentStep('success')
      } else {
        setErrors({ general: 'Password reset failed. Please try again.' })
      }
      
    } catch (error: any) {
      console.error('Password reset error:', error)
      
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_password_pwned':
              clerkErrors.password = 'This password has been compromised. Please choose a different one.'
              break
            case 'form_password_validation_failed':
              clerkErrors.password = 'Password does not meet security requirements'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'Password reset failed'
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
   * Resend verification code
   */
  const handleResendCode = async () => {
    if (!isLoaded) return
    
    setIsLoading(true)
    
    try {
      const firstFactor = signIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code'
      )
      
      if (firstFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'reset_password_email_code',
          emailAddressId: (firstFactor as any).emailAddressId
        })
        
        setResetEmailSent(true)
      }
    } catch (error: any) {
      console.error('Resend code error:', error)
      setErrors({ general: 'Failed to resend verification code' })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Navigate back to previous step
   */
  const handleBack = () => {
    switch (currentStep) {
      case 'verify':
        setCurrentStep('request')
        break
      case 'reset':
        setCurrentStep('verify')
        break
      default:
        router.push('/sign-in')
    }
  }

  /**
   * Navigate to sign in
   */
  const handleSignIn = () => {
    router.push('/sign-in')
  }

  return (
    <div data-testid="password-reset-form" className={cn('space-y-6', className)}>
      {/* Back Button */}
      {currentStep !== 'success' && (
        <Button
          type="button"
          variant="ghost"
          className="p-0 h-auto"
          onClick={handleBack}
          disabled={isLoading}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* General Error */}
      {(errors.general || error) && (
        <Alert data-testid="general-error-alert" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-testid="general-error-message">
            {errors.general || error}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {resetEmailSent && currentStep === 'verify' && (
        <Alert data-testid="email-sent-alert">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription data-testid="email-sent-message">
            We've sent a verification code to {formData.email}. Please check your email and enter the code below.
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Request Password Reset */}
      {currentStep === 'request' && (
        <form data-testid="request-reset-form" onSubmit={handleResetRequest} className="space-y-4">
          <div data-testid="email-field" className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              data-testid="email-input"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={cn(errors.email && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p id="email-error" data-testid="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            data-testid="send-reset-email-button"
          >
            {isLoading ? 'Sending...' : 'Send Reset Email'}
          </Button>
        </form>
      )}

      {/* Step 2: Verify Code */}
      {currentStep === 'verify' && (
        <form data-testid="verify-code-form" onSubmit={handleVerifyCode} className="space-y-4">
          <div data-testid="verification-code-field" className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              data-testid="verification-code-input"
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className={cn(errors.code && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.code ? 'code-error' : undefined}
              placeholder="Enter the 6-digit code"
              maxLength={6}
            />
            {errors.code && (
              <p id="code-error" data-testid="verification-code-error" className="text-sm text-destructive">
                {errors.code}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            data-testid="verify-code-button"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleResendCode}
              disabled={isLoading}
              data-testid="resend-code-button"
            >
              Didn't receive the code? Resend
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Reset Password */}
      {currentStep === 'reset' && (
        <form data-testid="reset-password-form" onSubmit={handlePasswordReset} className="space-y-4">
          <div data-testid="new-password-field" className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                data-testid="new-password-input"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  'pr-10',
                  errors.password && 'border-destructive'
                )}
                disabled={isLoading}
                required
                aria-describedby={errors.password ? 'password-error' : undefined}
                placeholder="Enter your new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="toggle-new-password-visibility"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p id="password-error" data-testid="new-password-error" className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          <div data-testid="confirm-password-field" className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                data-testid="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={cn(
                  'pr-10',
                  errors.confirmPassword && 'border-destructive'
                )}
                disabled={isLoading}
                required
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                placeholder="Confirm your new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                data-testid="toggle-confirm-password-visibility"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" data-testid="confirm-password-error" className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            data-testid="reset-password-button"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}

      {/* Step 4: Success */}
      {currentStep === 'success' && (
        <div data-testid="success-section" className="text-center space-y-4">
          <div data-testid="success-icon" className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="space-y-2">
            <h3 data-testid="success-title" className="text-lg font-semibold">Password Reset Successful</h3>
            <p data-testid="success-message" className="text-muted-foreground">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>

          <Button
            onClick={handleSignIn}
            className="w-full"
            data-testid="continue-to-sign-in-button"
          >
            Continue to Sign In
          </Button>
        </div>
      )}

      {/* Sign In Link */}
      {currentStep !== 'success' && (
        <div data-testid="sign-in-link-section" className="text-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={handleSignIn}
              data-testid="sign-in-link"
            >
              Sign in
            </Button>
          </p>
        </div>
      )}
    </div>
  )
}