'use client'

import React, { useState, useCallback } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSocialProviders } from '@/lib/config/clerk'

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
 * SignInForm component with social authentication and comprehensive error handling
 * 
 * Features:
 * - Email/password authentication
 * - Social authentication integration (Google, GitHub, Microsoft)
 * - "Remember Me" functionality
 * - Comprehensive error handling
 * - Accessibility compliance
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

  // Get configuration
  const socialProviders = getSocialProviders()

  // Load remember me preference on mount
  React.useEffect(() => {
    const savedRememberMe = localStorage.getItem('c9d-remember-me')
    if (savedRememberMe === 'true') {
      setRememberMe(true)
    }
  }, [])

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
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address first' })
      return
    }

    if (!signIn) return

    try {
      await signIn.create({
        identifier: formData.email
      })

      // Note: For password reset, we redirect to a dedicated reset page
      // The prepareFirstFactor call would require an emailAddressId which we don't have here

      // Redirect to reset password page
      router.push(`/reset-password?email=${encodeURIComponent(formData.email)}`)
    } catch (error: any) {
      console.error('Password reset error:', error)
      setErrors({ general: 'Failed to send password reset email. Please try again.' })
    }
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
      {(errors.general || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.general || error}
          </AlertDescription>
        </Alert>
      )}

      {/* Sign-in Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot password?
            </Button>
          </div>
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
              aria-describedby={errors.password ? 'password-error' : undefined}
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
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            disabled={isLoading}
          />
          <Label htmlFor="remember-me" className="text-sm">
            Remember me
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isLoaded}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* Sign Up Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => router.push('/sign-up')}
          >
            Sign up
          </Button>
        </p>
      </div>
    </div>
  )
}