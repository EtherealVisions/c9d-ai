'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, ArrowLeft, Smartphone, Mail, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TwoFactorFormProps {
  strategy?: string
  error?: string
  className?: string
}

interface FormData {
  code: string
  backupCode: string
}

interface FormErrors {
  code?: string
  backupCode?: string
  general?: string
}

type TwoFactorStrategy = 'totp' | 'phone_code' | 'backup_code'

/**
 * TwoFactorForm component for handling 2FA verification
 * 
 * Features:
 * - TOTP (Time-based One-Time Password) verification
 * - SMS-based verification
 * - Backup code verification
 * - Strategy switching
 * - Comprehensive error handling
 */
export function TwoFactorForm({ strategy, error, className }: TwoFactorFormProps) {
  const { signIn, isLoaded } = useSignIn()
  const router = useRouter()
  
  // Form state
  const [currentStrategy, setCurrentStrategy] = useState<TwoFactorStrategy>(
    (strategy as TwoFactorStrategy) || 'totp'
  )
  const [formData, setFormData] = useState<FormData>({
    code: '',
    backupCode: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [availableStrategies, setAvailableStrategies] = useState<TwoFactorStrategy[]>([])

  // Load available 2FA strategies
  useEffect(() => {
    if (!isLoaded || !signIn) return

    const strategies: TwoFactorStrategy[] = []
    
    // Check available second factors
    signIn.supportedSecondFactors?.forEach((factor) => {
      switch (factor.strategy) {
        case 'totp':
          strategies.push('totp')
          break
        case 'phone_code':
          strategies.push('phone_code')
          break
        case 'backup_code':
          strategies.push('backup_code')
          break
      }
    })
    
    setAvailableStrategies(strategies)
    
    // Set default strategy if current one is not available
    if (strategies.length > 0 && !strategies.includes(currentStrategy)) {
      setCurrentStrategy(strategies[0])
    }
  }, [isLoaded, signIn, currentStrategy])

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
   * Validate verification code
   */
  const validateCode = useCallback((code: string, strategy: TwoFactorStrategy): string | undefined => {
    if (!code) return 'Verification code is required'
    
    switch (strategy) {
      case 'totp':
        if (!/^\d{6}$/.test(code)) return 'TOTP code must be 6 digits'
        break
      case 'phone_code':
        if (!/^\d{6}$/.test(code)) return 'SMS code must be 6 digits'
        break
      case 'backup_code':
        if (!/^[a-zA-Z0-9]{8,12}$/.test(code)) return 'Invalid backup code format'
        break
    }
    
    return undefined
  }, [])

  /**
   * Handle 2FA verification
   */
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded || !signIn) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const code = currentStrategy === 'backup_code' ? formData.backupCode : formData.code
      
      // Validate code
      const codeError = validateCode(code, currentStrategy)
      if (codeError) {
        setErrors({ [currentStrategy === 'backup_code' ? 'backupCode' : 'code']: codeError })
        setIsLoading(false)
        return
      }
      
      // Attempt second factor verification
      const result = await signIn.attemptSecondFactor({
        strategy: currentStrategy,
        code: code
      })
      
      if (result.status === 'complete') {
        // Sign-in completed successfully
        router.push('/dashboard')
      } else {
        // Handle incomplete verification
        setErrors({ general: 'Verification incomplete. Please try again.' })
      }
      
    } catch (error: any) {
      console.error('2FA verification error:', error)
      
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_code_incorrect':
              clerkErrors[currentStrategy === 'backup_code' ? 'backupCode' : 'code'] = 'Invalid verification code'
              break
            case 'form_code_expired':
              clerkErrors[currentStrategy === 'backup_code' ? 'backupCode' : 'code'] = 'Verification code has expired'
              break
            case 'too_many_requests':
              clerkErrors.general = 'Too many verification attempts. Please try again later.'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'Verification failed'
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
   * Handle strategy change
   */
  const handleStrategyChange = (newStrategy: TwoFactorStrategy) => {
    setCurrentStrategy(newStrategy)
    setFormData({ code: '', backupCode: '' })
    setErrors({})
  }

  /**
   * Resend SMS code
   */
  const handleResendSMS = async () => {
    if (!isLoaded || !signIn || currentStrategy !== 'phone_code') return
    
    setIsLoading(true)
    
    try {
      // Find SMS second factor
      const smsFactor = signIn.supportedSecondFactors?.find(
        factor => factor.strategy === 'phone_code'
      )
      
      if (smsFactor) {
        await signIn.prepareSecondFactor({
          strategy: 'phone_code',
          phoneNumberId: (smsFactor as any).phoneNumberId
        })
      }
    } catch (error: any) {
      console.error('SMS resend error:', error)
      setErrors({ general: 'Failed to resend SMS code' })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Navigate back to sign-in
   */
  const handleBack = () => {
    router.push('/sign-in')
  }

  /**
   * Get strategy display info
   */
  const getStrategyInfo = (strategy: TwoFactorStrategy) => {
    switch (strategy) {
      case 'totp':
        return {
          name: 'Authenticator App',
          icon: <Smartphone className="h-4 w-4" />,
          description: 'Use your authenticator app'
        }
      case 'phone_code':
        return {
          name: 'SMS Code',
          icon: <Mail className="h-4 w-4" />,
          description: 'Receive code via SMS'
        }
      case 'backup_code':
        return {
          name: 'Backup Code',
          icon: <Key className="h-4 w-4" />,
          description: 'Use a backup recovery code'
        }
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Back Button */}
      <Button
        type="button"
        variant="ghost"
        className="p-0 h-auto"
        onClick={handleBack}
        disabled={isLoading}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sign In
      </Button>

      {/* General Error */}
      {(errors.general || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.general || error}
          </AlertDescription>
        </Alert>
      )}

      {/* Strategy Selection */}
      {availableStrategies.length > 1 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Choose verification method:</Label>
          <div className="grid gap-2">
            {availableStrategies.map((strategy) => {
              const info = getStrategyInfo(strategy)
              return (
                <Button
                  key={strategy}
                  type="button"
                  variant={currentStrategy === strategy ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleStrategyChange(strategy)}
                  disabled={isLoading}
                >
                  {info.icon}
                  <span className="ml-2">{info.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {info.description}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerification} className="space-y-4">
        {currentStrategy === 'backup_code' ? (
          /* Backup Code Input */
          <div className="space-y-2">
            <Label htmlFor="backupCode">Backup Code</Label>
            <Input
              id="backupCode"
              type="text"
              value={formData.backupCode}
              onChange={(e) => handleInputChange('backupCode', e.target.value)}
              className={cn(errors.backupCode && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.backupCode ? 'backup-code-error' : undefined}
              placeholder="Enter your backup code"
              maxLength={12}
            />
            {errors.backupCode && (
              <p id="backup-code-error" className="text-sm text-destructive">
                {errors.backupCode}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter one of your backup recovery codes
            </p>
          </div>
        ) : (
          /* Regular Code Input */
          <div className="space-y-2">
            <Label htmlFor="code">
              {currentStrategy === 'totp' ? 'Authenticator Code' : 'SMS Code'}
            </Label>
            <Input
              id="code"
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className={cn(errors.code && 'border-destructive')}
              disabled={isLoading}
              required
              aria-describedby={errors.code ? 'code-error' : undefined}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            {errors.code && (
              <p id="code-error" className="text-sm text-destructive">
                {errors.code}
              </p>
            )}
            {currentStrategy === 'totp' && (
              <p className="text-xs text-muted-foreground">
                Open your authenticator app and enter the 6-digit code
              </p>
            )}
            {currentStrategy === 'phone_code' && (
              <p className="text-xs text-muted-foreground">
                Check your phone for the 6-digit SMS code
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isLoaded}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </form>

      {/* SMS Resend Option */}
      {currentStrategy === 'phone_code' && (
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm"
            onClick={handleResendSMS}
            disabled={isLoading}
          >
            Didn't receive the code? Resend SMS
          </Button>
        </div>
      )}

      {/* Alternative Methods */}
      {availableStrategies.length > 1 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Having trouble? Try a different verification method above
          </p>
        </div>
      )}
    </div>
  )
}