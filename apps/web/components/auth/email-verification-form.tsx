'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Mail, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmailVerificationFormProps {
  redirectUrl?: string
  email?: string
  error?: string
  className?: string
}

interface VerificationState {
  code: string
  isLoading: boolean
  isResending: boolean
  error?: string
  success?: string
  resendCooldown: number
}

/**
 * EmailVerificationForm component for handling email verification flow
 * 
 * Features:
 * - 6-digit verification code input
 * - Resend verification email with cooldown
 * - Real-time validation and error handling
 * - Post-verification routing logic
 * - Accessibility compliance
 */
export function EmailVerificationForm({ 
  redirectUrl, 
  email, 
  error: initialError,
  className 
}: EmailVerificationFormProps) {
  const { signUp, isLoaded, setActive } = useSignUp()
  const router = useRouter()
  
  const [state, setState] = useState<VerificationState>({
    code: '',
    isLoading: false,
    isResending: false,
    error: initialError,
    resendCooldown: 0
  })

  // Cooldown timer effect
  useEffect(() => {
    if (state.resendCooldown > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, resendCooldown: prev.resendCooldown - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state.resendCooldown])

  /**
   * Handle verification code input
   */
  const handleCodeChange = useCallback((value: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 6)
    setState(prev => ({ 
      ...prev, 
      code: cleanValue,
      error: undefined // Clear error on input
    }))
  }, [])

  /**
   * Handle verification form submission
   */
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded || !signUp) return
    
    if (state.code.length !== 6) {
      setState(prev => ({ ...prev, error: 'Please enter the complete 6-digit code' }))
      return
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))
    
    try {
      // Attempt email verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: state.code
      })
      
      if (completeSignUp.status === 'complete') {
        // Set the active session
        await setActive({ session: completeSignUp.createdSessionId })
        
        // Show success message briefly
        setState(prev => ({ ...prev, success: 'Email verified successfully!' }))
        
        // Redirect after a short delay
        setTimeout(() => {
          const destination = redirectUrl || '/onboarding'
          router.push(destination)
        }, 1500)
        
      } else {
        // Handle incomplete verification
        setState(prev => ({ 
          ...prev, 
          error: 'Verification incomplete. Please try again.',
          isLoading: false
        }))
      }
      
    } catch (error: any) {
      console.error('Email verification error:', error)
      
      let errorMessage = 'Verification failed. Please try again.'
      
      // Handle Clerk-specific errors
      if (error.errors) {
        const clerkError = error.errors[0]
        switch (clerkError.code) {
          case 'form_code_incorrect':
            errorMessage = 'Invalid verification code. Please check and try again.'
            break
          case 'verification_expired':
            errorMessage = 'Verification code has expired. Please request a new one.'
            break
          case 'verification_failed':
            errorMessage = 'Verification failed. Please request a new code.'
            break
          default:
            errorMessage = clerkError.longMessage || clerkError.message || errorMessage
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false
      }))
    }
  }

  /**
   * Handle resend verification email
   */
  const handleResendCode = async () => {
    if (!isLoaded || !signUp || state.resendCooldown > 0) return
    
    setState(prev => ({ ...prev, isResending: true, error: undefined }))
    
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      
      setState(prev => ({ 
        ...prev, 
        isResending: false,
        resendCooldown: 60, // 60 second cooldown
        success: 'Verification code sent! Check your email.'
      }))
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: undefined }))
      }, 3000)
      
    } catch (error: any) {
      console.error('Resend verification error:', error)
      
      let errorMessage = 'Failed to resend verification code. Please try again.'
      
      if (error.errors) {
        const clerkError = error.errors[0]
        errorMessage = clerkError.longMessage || clerkError.message || errorMessage
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isResending: false
      }))
    }
  }

  /**
   * Get the email address to display
   */
  const getDisplayEmail = () => {
    if (email) return email
    if (signUp?.emailAddress) return signUp.emailAddress
    return 'your email address'
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Email Icon and Info */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit verification code to:
          </p>
          <p className="font-medium text-foreground">
            {getDisplayEmail()}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {state.success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verificationCode" className="text-center block">
            Enter verification code
          </Label>
          <Input
            id="verificationCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={state.code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className={cn(
              'text-center text-2xl font-mono tracking-widest',
              state.error && 'border-destructive'
            )}
            placeholder="000000"
            maxLength={6}
            disabled={state.isLoading}
            required
            aria-describedby="code-description"
            data-testid="verification-code-input"
          />
          <p id="code-description" className="text-xs text-muted-foreground text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={state.isLoading || state.code.length !== 6}
          data-testid="verify-button"
        >
          {state.isLoading ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>

      {/* Resend Code Section */}
      <div className="text-center space-y-4">
        <div className="text-sm text-muted-foreground">
          Didn't receive the code?
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleResendCode}
          disabled={state.isResending || state.resendCooldown > 0}
          className="w-full"
          data-testid="resend-button"
        >
          {state.isResending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : state.resendCooldown > 0 ? (
            `Resend code in ${state.resendCooldown}s`
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend verification code
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          Check your spam folder if you don't see the email
        </p>
        <Button
          variant="link"
          className="p-0 h-auto text-xs"
          onClick={() => router.push('/sign-up')}
        >
          Use a different email address
        </Button>
      </div>
    </div>
  )
}