'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { QRCodeSVG } from 'qrcode.react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Copy, Download, Smartphone, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TwoFactorSetupProps {
  onComplete?: () => void
  className?: string
}

interface FormData {
  code: string
  phoneNumber: string
}

interface FormErrors {
  code?: string
  phoneNumber?: string
  general?: string
}

type SetupStep = 'choose' | 'totp_setup' | 'totp_verify' | 'sms_setup' | 'sms_verify' | 'backup_codes' | 'complete'

/**
 * TwoFactorSetup component for configuring 2FA
 * 
 * Features:
 * - TOTP setup with QR code
 * - SMS setup with phone verification
 * - Backup code generation and display
 * - Step-by-step setup process
 * - Comprehensive error handling
 */
export function TwoFactorSetup({ onComplete, className }: TwoFactorSetupProps) {
  const { user, isLoaded } = useUser()
  
  // Setup state
  const [currentStep, setCurrentStep] = useState<SetupStep>('choose')
  const [formData, setFormData] = useState<FormData>({
    code: '',
    phoneNumber: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [totpSecret, setTotpSecret] = useState<string>('')
  const [totpUri, setTotpUri] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Check current 2FA status
  useEffect(() => {
    if (!isLoaded || !user) return

    const hasTOTP = user.twoFactorEnabled
    const hasSMS = user.phoneNumbers.some(phone => phone.verification?.status === 'verified')
    
    // If 2FA is already enabled, show completion
    if (hasTOTP || hasSMS) {
      setCurrentStep('complete')
    }
  }, [isLoaded, user])

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  /**
   * Start TOTP setup
   */
  const handleStartTOTP = async () => {
    if (!user) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Create TOTP
      const totp = await user.createTOTP()
      
      setTotpSecret(totp.secret!)
      setTotpUri(totp.uri!)
      setCurrentStep('totp_setup')
      
    } catch (error: any) {
      console.error('TOTP setup error:', error)
      setErrors({ general: 'Failed to setup authenticator app. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Verify TOTP setup
   */
  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate code
      if (!formData.code || !/^\d{6}$/.test(formData.code)) {
        setErrors({ code: 'Please enter a valid 6-digit code' })
        setIsLoading(false)
        return
      }
      
      // Verify TOTP
      await user.verifyTOTP({ code: formData.code })
      
      // Generate backup codes
      const codes = await user.createBackupCode()
      setBackupCodes(codes.codes)
      setCurrentStep('backup_codes')
      
    } catch (error: any) {
      console.error('TOTP verification error:', error)
      
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
              clerkErrors.general = err.longMessage || err.message || 'Verification failed'
          }
        })
        setErrors(clerkErrors)
      } else {
        setErrors({ general: 'Verification failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Start SMS setup
   */
  const handleStartSMS = async () => {
    setCurrentStep('sms_setup')
  }

  /**
   * Setup SMS 2FA
   */
  const handleSetupSMS = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate phone number
      if (!formData.phoneNumber || !/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
        setErrors({ phoneNumber: 'Please enter a valid phone number' })
        setIsLoading(false)
        return
      }
      
      // Create phone number
      const phoneNumber = await user.createPhoneNumber({ phoneNumber: formData.phoneNumber })
      
      // Prepare verification
      await phoneNumber.prepareVerification()
      
      setCurrentStep('sms_verify')
      
    } catch (error: any) {
      console.error('SMS setup error:', error)
      
      if (error.errors) {
        const clerkErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          switch (err.code) {
            case 'form_param_format_invalid':
              clerkErrors.phoneNumber = 'Invalid phone number format'
              break
            case 'form_identifier_exists':
              clerkErrors.phoneNumber = 'This phone number is already in use'
              break
            default:
              clerkErrors.general = err.longMessage || err.message || 'SMS setup failed'
          }
        })
        setErrors(clerkErrors)
      } else {
        setErrors({ general: 'SMS setup failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Verify SMS code
   */
  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Validate code
      if (!formData.code || !/^\d{6}$/.test(formData.code)) {
        setErrors({ code: 'Please enter a valid 6-digit code' })
        setIsLoading(false)
        return
      }
      
      // Find the phone number to verify
      const phoneNumber = user.phoneNumbers.find(phone => 
        phone.phoneNumber === formData.phoneNumber
      )
      
      if (!phoneNumber) {
        setErrors({ general: 'Phone number not found' })
        setIsLoading(false)
        return
      }
      
      // Verify SMS code
      await phoneNumber.attemptVerification({ code: formData.code })
      
      // Generate backup codes
      const codes = await user.createBackupCode()
      setBackupCodes(codes.codes)
      setCurrentStep('backup_codes')
      
    } catch (error: any) {
      console.error('SMS verification error:', error)
      
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
              clerkErrors.general = err.longMessage || err.message || 'Verification failed'
          }
        })
        setErrors(clerkErrors)
      } else {
        setErrors({ general: 'Verification failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Copy backup codes to clipboard
   */
  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopiedCodes(true)
      setTimeout(() => setCopiedCodes(false), 2000)
    } catch (error) {
      console.error('Failed to copy backup codes:', error)
    }
  }

  /**
   * Download backup codes as text file
   */
  const handleDownloadBackupCodes = () => {
    const content = `C9d.ai Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe and secure. Each code can only be used once.`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'c9d-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Complete setup
   */
  const handleComplete = () => {
    setCurrentStep('complete')
    onComplete?.()
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* General Error */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.general}
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Choose Method */}
      {currentStep === 'choose' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Secure Your Account</h3>
            <p className="text-muted-foreground">
              Choose a two-factor authentication method to add an extra layer of security
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={handleStartTOTP}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Authenticator App</CardTitle>
                    <CardDescription>
                      Use an app like Google Authenticator or Authy
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={handleStartSMS}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 text-primary">📱</div>
                  <div>
                    <CardTitle className="text-base">SMS Text Message</CardTitle>
                    <CardDescription>
                      Receive codes via text message
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: TOTP Setup */}
      {currentStep === 'totp_setup' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Setup Authenticator App</h3>
            <p className="text-muted-foreground">
              Scan the QR code with your authenticator app
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                {totpUri && (
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG value={totpUri} size={200} />
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Can't scan the code? Enter this key manually:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {totpSecret}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setCurrentStep('totp_verify')}
            className="w-full"
            disabled={isLoading}
          >
            I've Added the Account
          </Button>
        </div>
      )}

      {/* Step 3: TOTP Verification */}
      {currentStep === 'totp_verify' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Verify Authenticator App</h3>
            <p className="text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleVerifyTOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">Verification Code</Label>
              <Input
                id="totp-code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className={cn(errors.code && 'border-destructive')}
                disabled={isLoading}
                required
                aria-describedby={errors.code ? 'totp-code-error' : undefined}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              {errors.code && (
                <p id="totp-code-error" className="text-sm text-destructive">
                  {errors.code}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isLoaded}
            >
              {isLoading ? 'Verifying...' : 'Verify and Continue'}
            </Button>
          </form>
        </div>
      )}

      {/* Step 4: SMS Setup */}
      {currentStep === 'sms_setup' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Setup SMS Authentication</h3>
            <p className="text-muted-foreground">
              Enter your phone number to receive verification codes
            </p>
          </div>

          <form onSubmit={handleSetupSMS} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={cn(errors.phoneNumber && 'border-destructive')}
                disabled={isLoading}
                required
                aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phoneNumber && (
                <p id="phone-error" className="text-sm text-destructive">
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isLoaded}
            >
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>
        </div>
      )}

      {/* Step 5: SMS Verification */}
      {currentStep === 'sms_verify' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Verify Phone Number</h3>
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to {formData.phoneNumber}
            </p>
          </div>

          <form onSubmit={handleVerifySMS} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-code">Verification Code</Label>
              <Input
                id="sms-code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className={cn(errors.code && 'border-destructive')}
                disabled={isLoading}
                required
                aria-describedby={errors.code ? 'sms-code-error' : undefined}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              {errors.code && (
                <p id="sms-code-error" className="text-sm text-destructive">
                  {errors.code}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isLoaded}
            >
              {isLoading ? 'Verifying...' : 'Verify and Continue'}
            </Button>
          </form>
        </div>
      )}

      {/* Step 6: Backup Codes */}
      {currentStep === 'backup_codes' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <h3 className="text-lg font-semibold">Save Your Backup Codes</h3>
            <p className="text-muted-foreground">
              Store these codes safely. Each can only be used once.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopyBackupCodes}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copiedCodes ? 'Copied!' : 'Copy Codes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownloadBackupCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Keep these codes in a safe place. You'll need them to access your account if you lose your primary 2FA method.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleComplete}
            className="w-full"
          >
            Complete Setup
          </Button>
        </div>
      )}

      {/* Step 7: Complete */}
      {currentStep === 'complete' && (
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Two-Factor Authentication Enabled</h3>
            <p className="text-muted-foreground">
              Your account is now protected with two-factor authentication
            </p>
          </div>
          
          <Button onClick={onComplete} className="w-full">
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}