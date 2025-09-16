'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Users, Settings, Palette, Send, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Types for organization setup
export interface OrganizationTemplate {
  id: string
  name: string
  description: string
  category: 'startup' | 'enterprise' | 'agency' | 'nonprofit' | 'education' | 'custom'
  defaultRoles: Array<{
    name: string
    permissions: string[]
    isDefault?: boolean
  }>
  recommendedSettings: Record<string, unknown>
  onboardingPaths: Array<{
    role: string
    pathId: string
    isRequired: boolean
  }>
}

export interface CustomizationOption {
  id: string
  name: string
  description: string
  type: 'branding' | 'content' | 'workflow' | 'integration'
  options: Array<{
    key: string
    label: string
    type: 'text' | 'select' | 'boolean' | 'color' | 'file'
    defaultValue?: unknown
    required?: boolean
  }>
}

export interface OrganizationOnboardingConfig {
  organizationId: string
  welcomeMessage: string
  branding: {
    primaryColor?: string
    logoUrl?: string
    customCss?: string
  }
  customContent: Array<{
    id: string
    type: 'welcome' | 'tutorial' | 'resource'
    title: string
    content: string
    order: number
  }>
  roleConfigurations: Array<{
    role: string
    onboardingPath: string
    customizations: Record<string, unknown>
    mentorAssignment?: {
      enabled: boolean
      autoAssign: boolean
      mentorRole?: string
    }
    additionalResources: Array<{
      title: string
      url: string
      type: 'documentation' | 'video' | 'tutorial'
    }>
    completionCriteria: {
      requiredSteps: string[]
      timeLimit?: number
      passingScore?: number
    }
  }>
  mandatoryModules: string[]
  completionRequirements: {
    minimumSteps: number
    requiredModules: string[]
    timeLimit?: number
  }
  notificationSettings: {
    welcomeEmail: boolean
    progressReminders: boolean
    completionCelebration: boolean
    mentorNotifications: boolean
  }
}

export interface TeamInvitationData {
  email: string
  role: string
  customMessage?: string
  onboardingPathOverride?: string
}

export interface OrganizationSetupWizardProps {
  organizationId: string
  onSetupComplete: (config: OrganizationOnboardingConfig) => void
  availableTemplates: OrganizationTemplate[]
  customizationOptions: CustomizationOption[]
  className?: string
}

type SetupStep = 'template' | 'customization' | 'roles' | 'invitations' | 'review'

const SETUP_STEPS: Array<{
  id: SetupStep
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: 'template',
    title: 'Choose Template',
    description: 'Select an organizational structure template',
    icon: Settings
  },
  {
    id: 'customization',
    title: 'Customize Experience',
    description: 'Brand and customize the onboarding experience',
    icon: Palette
  },
  {
    id: 'roles',
    title: 'Configure Roles',
    description: 'Set up role-specific onboarding paths',
    icon: Users
  },
  {
    id: 'invitations',
    title: 'Invite Team',
    description: 'Send invitations to team members',
    icon: Send
  },
  {
    id: 'review',
    title: 'Review & Complete',
    description: 'Review configuration and complete setup',
    icon: CheckCircle
  }
]

export function OrganizationSetupWizard({
  organizationId,
  onSetupComplete,
  availableTemplates,
  customizationOptions,
  className
}: OrganizationSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<OrganizationTemplate | null>(null)
  const [customizations, setCustomizations] = useState<Record<string, unknown>>({})
  const [roleConfigurations, setRoleConfigurations] = useState<OrganizationOnboardingConfig['roleConfigurations']>([])
  const [invitations, setInvitations] = useState<TeamInvitationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep)
  const progress = ((currentStepIndex + 1) / SETUP_STEPS.length) * 100

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < SETUP_STEPS.length) {
      setCurrentStep(SETUP_STEPS[nextIndex].id)
      setError(null)
    }
  }, [currentStepIndex])

  const handlePrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(SETUP_STEPS[prevIndex].id)
      setError(null)
    }
  }, [currentStepIndex])

  const handleTemplateSelect = useCallback((template: OrganizationTemplate) => {
    setSelectedTemplate(template)
    
    // Initialize role configurations from template
    const roleConfigs = template.defaultRoles.map(role => ({
      role: role.name,
      onboardingPath: template.onboardingPaths.find(path => path.role === role.name)?.pathId || '',
      customizations: {},
      additionalResources: [],
      completionCriteria: {
        requiredSteps: [],
        timeLimit: undefined,
        passingScore: undefined
      }
    }))
    
    setRoleConfigurations(roleConfigs)
    
    // Apply recommended settings
    setCustomizations(template.recommendedSettings)
  }, [])

  const handleCustomizationChange = useCallback((key: string, value: unknown) => {
    setCustomizations(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleRoleConfigurationChange = useCallback((
    roleIndex: number,
    field: keyof OrganizationOnboardingConfig['roleConfigurations'][0],
    value: unknown
  ) => {
    setRoleConfigurations(prev => prev.map((config, index) => 
      index === roleIndex ? { ...config, [field]: value } : config
    ))
  }, [])

  const handleAddInvitation = useCallback(() => {
    setInvitations(prev => [...prev, { email: '', role: '', customMessage: '' }])
  }, [])

  const handleInvitationChange = useCallback((
    index: number,
    field: keyof TeamInvitationData,
    value: string
  ) => {
    setInvitations(prev => prev.map((invitation, i) => 
      i === index ? { ...invitation, [field]: value } : invitation
    ))
  }, [])

  const handleRemoveInvitation = useCallback((index: number) => {
    setInvitations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleComplete = useCallback(async () => {
    if (!selectedTemplate) {
      setError('Please select a template')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const config: OrganizationOnboardingConfig = {
        organizationId,
        welcomeMessage: customizations.welcomeMessage as string || `Welcome to ${selectedTemplate.name}!`,
        branding: {
          primaryColor: customizations.primaryColor as string,
          logoUrl: customizations.logoUrl as string,
          customCss: customizations.customCss as string
        },
        customContent: [],
        roleConfigurations,
        mandatoryModules: customizations.mandatoryModules as string[] || [],
        completionRequirements: {
          minimumSteps: customizations.minimumSteps as number || 5,
          requiredModules: customizations.requiredModules as string[] || [],
          timeLimit: customizations.timeLimit as number
        },
        notificationSettings: {
          welcomeEmail: customizations.welcomeEmail as boolean ?? true,
          progressReminders: customizations.progressReminders as boolean ?? true,
          completionCelebration: customizations.completionCelebration as boolean ?? true,
          mentorNotifications: customizations.mentorNotifications as boolean ?? false
        }
      }

      onSetupComplete(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, selectedTemplate, customizations, roleConfigurations, onSetupComplete])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'template':
        return selectedTemplate !== null
      case 'customization':
        return true // Customization is optional
      case 'roles':
        return roleConfigurations.length > 0
      case 'invitations':
        return true // Invitations are optional
      case 'review':
        return true
      default:
        return false
    }
  }, [currentStep, selectedTemplate, roleConfigurations])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'template':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Organization Template</h3>
              <p className="text-muted-foreground mb-4">
                Select a template that best matches your organization structure and needs.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {availableTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedTemplate?.id === template.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Default Roles:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.defaultRoles.map((role) => (
                            <Badge key={role.name} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'customization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Customize Onboarding Experience</h3>
              <p className="text-muted-foreground mb-4">
                Personalize the onboarding experience with your branding and preferences.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <Textarea
                    id="welcomeMessage"
                    data-testid="welcome-message-input"
                    placeholder="Welcome to our organization! We're excited to have you on board."
                    value={customizations.welcomeMessage as string || ''}
                    onChange={(e) => handleCustomizationChange('welcomeMessage', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Input
                    id="primaryColor"
                    data-testid="primary-color-input"
                    type="color"
                    value={customizations.primaryColor as string || '#3b82f6'}
                    onChange={(e) => handleCustomizationChange('primaryColor', e.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    data-testid="logo-url-input"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={customizations.logoUrl as string || ''}
                    onChange={(e) => handleCustomizationChange('logoUrl', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notification Settings</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'welcomeEmail', label: 'Send welcome emails' },
                      { key: 'progressReminders', label: 'Send progress reminders' },
                      { key: 'completionCelebration', label: 'Celebrate completions' },
                      { key: 'mentorNotifications', label: 'Notify mentors' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={customizations[key] as boolean ?? true}
                          onChange={(e) => handleCustomizationChange(key, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={key} className="text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'roles':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configure Role-Specific Onboarding</h3>
              <p className="text-muted-foreground mb-4">
                Set up onboarding paths and requirements for each role in your organization.
              </p>
            </div>

            <div className="space-y-4">
              {roleConfigurations.map((config, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{config.role}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`onboardingPath-${index}`}>Onboarding Path</Label>
                      <Select
                        value={config.onboardingPath}
                        onValueChange={(value) => handleRoleConfigurationChange(index, 'onboardingPath', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select onboarding path" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic Onboarding</SelectItem>
                          <SelectItem value="advanced">Advanced Onboarding</SelectItem>
                          <SelectItem value="admin">Admin Onboarding</SelectItem>
                          <SelectItem value="developer">Developer Onboarding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`timeLimit-${index}`}>Time Limit (days)</Label>
                      <Input
                        id={`timeLimit-${index}`}
                        type="number"
                        placeholder="30"
                        value={config.completionCriteria.timeLimit || ''}
                        onChange={(e) => handleRoleConfigurationChange(index, 'completionCriteria', {
                          ...config.completionCriteria,
                          timeLimit: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'invitations':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Invite Team Members</h3>
              <p className="text-muted-foreground mb-4">
                Send invitations to team members to join your organization.
              </p>
            </div>

            <div className="space-y-4">
              {invitations.map((invitation, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor={`email-${index}`}>Email</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="colleague@example.com"
                          value={invitation.email}
                          onChange={(e) => handleInvitationChange(index, 'email', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`role-${index}`}>Role</Label>
                        <Select
                          value={invitation.role}
                          onValueChange={(value) => handleInvitationChange(index, 'role', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleConfigurations.map((config) => (
                              <SelectItem key={config.role} value={config.role}>
                                {config.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveInvitation(index)}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor={`message-${index}`}>Custom Message (Optional)</Label>
                      <Textarea
                        id={`message-${index}`}
                        placeholder="Welcome to our team! We're excited to work with you."
                        value={invitation.customMessage || ''}
                        onChange={(e) => handleInvitationChange(index, 'customMessage', e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={handleAddInvitation}
                className="w-full"
              >
                Add Team Member
              </Button>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Configuration</h3>
              <p className="text-muted-foreground mb-4">
                Review your organization setup before completing the configuration.
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template & Customization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Template:</strong> {selectedTemplate?.name}</p>
                    <p><strong>Welcome Message:</strong> {customizations.welcomeMessage as string || 'Default welcome message'}</p>
                    <p><strong>Primary Color:</strong> 
                      <span 
                        className="inline-block w-4 h-4 rounded ml-2 border"
                        style={{ backgroundColor: customizations.primaryColor as string || '#3b82f6' }}
                      />
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Role Configurations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {roleConfigurations.map((config, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{config.role}</span>
                        <Badge variant="outline">{config.onboardingPath || 'No path selected'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  {invitations.length > 0 ? (
                    <div className="space-y-2">
                      {invitations.map((invitation, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{invitation.email}</span>
                          <Badge variant="outline">{invitation.role}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No invitations to send</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("max-w-4xl mx-auto p-6", className)}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Organization Setup</h2>
          <Badge variant="outline">{currentStepIndex + 1} of {SETUP_STEPS.length}</Badge>
        </div>
        
        <Progress value={progress} className="mb-4" />
        
        <div className="flex items-center space-x-4">
          {SETUP_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center space-x-2 text-sm",
                  isActive && "text-primary font-medium",
                  isCompleted && "text-muted-foreground",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4",
                  isCompleted && "text-green-600"
                )} />
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert data-testid="error-alert" variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-testid="error-message">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep === 'review' ? (
          <Button
            data-testid="complete-setup-button"
            onClick={handleComplete}
            disabled={!canProceed() || isLoading}
          >
            {isLoading ? (
              <span data-testid="completing-text">Completing...</span>
            ) : (
              'Complete Setup'
            )}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}