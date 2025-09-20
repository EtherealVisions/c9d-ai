'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { AlertCircle, CheckCircle, Shield, Smartphone, Mail, Key, Download, Copy, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TwoFactorSetup } from './two-factor-setup'

interface TwoFactorManagementProps {
  className?: string
}

interface TwoFactorMethod {
  id: string
  type: 'totp' | 'sms' | 'backup_codes'
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  lastUsed?: Date
  phoneNumber?: string
}

/**
 * TwoFactorManagement component for managing 2FA settings
 * 
 * Features:
 * - View enabled 2FA methods
 * - Enable/disable 2FA methods
 * - Manage backup codes
 * - View 2FA usage statistics
 * - Security recommendations
 */
export function TwoFactorManagement({ className }: TwoFactorManagementProps) {
  const { user, isLoaded } = useUser()
  
  // Component state
  const [methods, setMethods] = useState<TwoFactorMethod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  /**
   * Load 2FA methods from user data
   */
  const loadMethods = useCallback(() => {
    if (!user) return

    const methods: TwoFactorMethod[] = []

    // TOTP (Authenticator App)
    methods.push({
      id: 'totp',
      type: 'totp',
      name: 'Authenticator App',
      description: 'Use an authenticator app like Google Authenticator or Authy',
      icon: <Smartphone className="h-5 w-5" />,
      enabled: user.twoFactorEnabled || false,
      lastUsed: user.lastSignInAt ? new Date(user.lastSignInAt) : undefined
    })

    // SMS
    const verifiedPhone = user.phoneNumbers.find(phone => 
      phone.verification?.status === 'verified'
    )
    methods.push({
      id: 'sms',
      type: 'sms',
      name: 'SMS Text Message',
      description: 'Receive verification codes via text message',
      icon: <Mail className="h-5 w-5" />,
      enabled: !!verifiedPhone,
      phoneNumber: verifiedPhone?.phoneNumber,
      lastUsed: (verifiedPhone?.verification as any)?.verifiedAt ? 
        new Date((verifiedPhone?.verification as any)?.verifiedAt) : undefined
    })

    // Backup Codes
    methods.push({
      id: 'backup_codes',
      type: 'backup_codes',
      name: 'Backup Codes',
      description: 'Recovery codes for when other methods are unavailable',
      icon: <Key className="h-5 w-5" />,
      enabled: user.backupCodeEnabled || false
    })

    setMethods(methods)
  }, [user])

  // Load methods when user changes
  useEffect(() => {
    if (isLoaded) {
      loadMethods()
    }
  }, [isLoaded, loadMethods])

  /**
   * Disable a 2FA method
   */
  const handleDisableMethod = async (methodId: string) => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      switch (methodId) {
        case 'totp':
          await user.disableTOTP()
          break
        case 'sms':
          const phoneNumber = user.phoneNumbers.find(phone => 
            phone.verification?.status === 'verified'
          )
          if (phoneNumber) {
            await phoneNumber.destroy()
          }
          break
        case 'backup_codes':
          // Backup codes are typically disabled when TOTP is disabled
          break
      }

      loadMethods()
    } catch (error: any) {
      console.error('Failed to disable 2FA method:', error)
      setError('Failed to disable 2FA method. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Generate new backup codes
   */
  const handleGenerateBackupCodes = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await user.createBackupCode()
      setBackupCodes(result.codes)
      setShowBackupCodes(true)
      loadMethods()
    } catch (error: any) {
      console.error('Failed to generate backup codes:', error)
      setError('Failed to generate backup codes. Please try again.')
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
   * Handle setup completion
   */
  const handleSetupComplete = () => {
    setShowSetup(false)
    loadMethods()
  }

  /**
   * Get security level based on enabled methods
   */
  const getSecurityLevel = () => {
    const enabledCount = methods.filter(m => m.enabled).length
    
    if (enabledCount === 0) return { level: 'none', color: 'destructive', text: 'No 2FA enabled' }
    if (enabledCount === 1) return { level: 'basic', color: 'warning', text: 'Basic protection' }
    if (enabledCount === 2) return { level: 'good', color: 'default', text: 'Good protection' }
    return { level: 'excellent', color: 'success', text: 'Excellent protection' }
  }

  const securityLevel = getSecurityLevel()
  const hasAnyEnabled = methods.some(m => m.enabled)

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading 2FA settings...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Security Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={securityLevel.color as "destructive" | "warning" | "default" | "success"}>
              {securityLevel.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!hasAnyEnabled && (
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your account is not protected by two-factor authentication. 
                Enable 2FA to significantly improve your account security.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {method.icon}
                  <div>
                    <h4 className="font-medium">{method.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                      {method.phoneNumber && ` (${method.phoneNumber})`}
                    </p>
                    {method.lastUsed && (
                      <p className="text-xs text-muted-foreground">
                        Last used: {method.lastUsed.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {method.enabled ? (
                    <>
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                      {method.type === 'backup_codes' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateBackupCodes}
                          disabled={isLoading}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Regenerate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisableMethod(method.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Disable
                      </Button>
                    </>
                  ) : (
                    <Dialog open={showSetup} onOpenChange={setShowSetup}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Enable
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                          <DialogDescription>
                            Choose and configure your preferred 2FA method
                          </DialogDescription>
                        </DialogHeader>
                        <TwoFactorSetup onComplete={handleSetupComplete} />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!hasAnyEnabled && (
            <div className="mt-6 text-center">
              <Dialog open={showSetup} onOpenChange={setShowSetup}>
                <DialogTrigger asChild>
                  <Button>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Choose and configure your preferred 2FA method
                    </DialogDescription>
                  </DialogHeader>
                  <TwoFactorSetup onComplete={handleSetupComplete} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {hasAnyEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!methods.find(m => m.id === 'totp')?.enabled && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Enable Authenticator App
                    </p>
                    <p className="text-sm text-yellow-700">
                      Authenticator apps are more secure than SMS and work offline.
                    </p>
                  </div>
                </div>
              )}

              {!methods.find(m => m.id === 'backup_codes')?.enabled && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Generate Backup Codes
                    </p>
                    <p className="text-sm text-blue-700">
                      Backup codes help you regain access if you lose your primary 2FA method.
                    </p>
                  </div>
                </div>
              )}

              {methods.filter(m => m.enabled).length < 2 && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Enable Multiple Methods
                    </p>
                    <p className="text-sm text-green-700">
                      Having multiple 2FA methods provides better security and redundancy.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Backup Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          
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
                variant="outline"
                className="flex-1"
                onClick={handleCopyBackupCodes}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copiedCodes ? 'Copied!' : 'Copy Codes'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadBackupCodes}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Keep these codes in a safe place. You'll need them to access your account 
                if you lose your primary 2FA method.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}