'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ChevronLeft, ChevronRight, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InteractiveStepComponent } from './interactive-step-component'
import { ProgressIndicator } from './progress-indicator'
import { ContextualHelp } from './contextual-help'
import { OnboardingService } from '@/lib/services/onboarding-service'
import type { 
  OnboardingSession, 
  OnboardingStep, 
  OnboardingContext,
  StepResult 
} from '@/lib/models/onboarding-types'

export interface OnboardingWizardProps {
  userId: string
  organizationId?: string
  onboardingType: 'individual' | 'team_admin' | 'team_member'
  onComplete: (result: OnboardingResult) => void
  onExit: (progress: OnboardingProgress) => void
  className?: string
}

export interface OnboardingResult {
  sessionId: string
  completedSteps: string[]
  totalTimeSpent: number
  achievements: Achievement[]
  finalScore?: number
}

export interface OnboardingProgress {
  sessionId: string
  currentStepIndex: number
  progressPercentage: number
  timeSpent: number
  canResume: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  earnedAt: string
  points: number
}

export function OnboardingWizard({
  userId,
  organizationId,
  onboardingType,
  onComplete,
  onExit,
  className
}: OnboardingWizardProps) {
  // State management
  const [session, setSession] = useState<OnboardingSession | null>(null)
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now())

  // Initialize onboarding session
  const initializeOnboarding = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const context: OnboardingContext = {
        userId,
        organizationId,
        userRole: onboardingType === 'individual' ? 'individual' : 
                 onboardingType === 'team_admin' ? 'admin' : 'member',
        preferences: {
          sessionType: onboardingType
        }
      }

      const newSession = await OnboardingService.initializeOnboarding(userId, context)
      setSession(newSession)

      // Get the onboarding path and steps
      if (newSession.path_id) {
        const path = await OnboardingService.getOnboardingPath(newSession.path_id)
        if (path?.steps) {
          const sortedSteps = path.steps.sort((a, b) => a.step_order - b.step_order)
          setSteps(sortedSteps)
          
          // Set current step based on session's current step index
          const currentStepIndex = newSession.current_step_index || 0
          setCurrentStep(sortedSteps[currentStepIndex] || sortedSteps[0] || null)
          setStepStartTime(Date.now())
        }
      }
    } catch (err) {
      console.error('Failed to initialize onboarding:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [userId, organizationId, onboardingType])

  // Handle step completion
  const handleStepComplete = useCallback(async (result: StepResult) => {
    if (!session || !currentStep) return

    try {
      setIsProcessing(true)
      setError(null)

      const stepResult: StepResult = {
        ...result,
        timeSpent: Date.now() - stepStartTime
      }

      const { session: updatedSession, nextStep, isPathComplete } = 
        await OnboardingService.recordStepCompletion(session.id, currentStep.id, stepResult)

      setSession(updatedSession)

      if (isPathComplete) {
        // Onboarding completed
        const completionResult: OnboardingResult = {
          sessionId: session.id,
          completedSteps: steps.map(step => step.id),
          totalTimeSpent: updatedSession.time_spent,
          achievements: [], // TODO: Get achievements from session
          finalScore: result.feedback?.score as number
        }
        onComplete(completionResult)
      } else if (nextStep) {
        // Move to next step
        setCurrentStep(nextStep)
        setStepStartTime(Date.now())
      }
    } catch (err) {
      console.error('Failed to complete step:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete step')
    } finally {
      setIsProcessing(false)
    }
  }, [session, currentStep, stepStartTime, steps, onComplete])

  // Handle step skip
  const handleStepSkip = useCallback(async () => {
    if (!session || !currentStep) return

    const skipResult: StepResult = {
      stepId: currentStep.id,
      status: 'skipped',
      timeSpent: Date.now() - stepStartTime,
      userActions: { action: 'skip', timestamp: new Date().toISOString() }
    }

    await handleStepComplete(skipResult)
  }, [session, currentStep, stepStartTime, handleStepComplete])

  // Handle navigation
  const handlePrevious = useCallback(() => {
    if (!session || !currentStep) return

    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
      setStepStartTime(Date.now())
    }
  }, [session, currentStep, steps])

  const handleNext = useCallback(() => {
    if (!session || !currentStep) return

    const currentIndex = steps.findIndex(step => step.id === currentStep.id)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
      setStepStartTime(Date.now())
    }
  }, [session, currentStep, steps])

  // Handle exit
  const handleExit = useCallback(async () => {
    if (!session) return

    try {
      await OnboardingService.pauseOnboardingSession(session.id)
      
      const progress: OnboardingProgress = {
        sessionId: session.id,
        currentStepIndex: session.current_step_index,
        progressPercentage: session.progress_percentage,
        timeSpent: session.time_spent,
        canResume: true
      }
      
      onExit(progress)
    } catch (err) {
      console.error('Failed to pause session:', err)
      // Still call onExit even if pause fails
      onExit({
        sessionId: session.id,
        currentStepIndex: session.current_step_index,
        progressPercentage: session.progress_percentage,
        timeSpent: session.time_spent,
        canResume: false
      })
    }
  }, [session, onExit])

  // Initialize on mount
  useEffect(() => {
    initializeOnboarding()
  }, [initializeOnboarding])

  // Calculate progress
  const currentStepIndex = currentStep ? steps.findIndex(step => step.id === currentStep.id) : 0
  const progressPercentage = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < steps.length - 1
  const isLastStep = currentStepIndex === steps.length - 1

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Initializing your onboarding experience...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={initializeOnboarding} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No session or step
  if (!session || !currentStep) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No onboarding content available</p>
            <Button onClick={handleExit} variant="outline" className="mt-4">
              Exit
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("w-full max-w-6xl mx-auto space-y-6", className)}>
      {/* Header with progress and controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {session.session_type === 'individual' ? 'Personal Onboarding' :
               session.session_type === 'team_admin' ? 'Team Admin Setup' :
               'Team Member Onboarding'}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="text-muted-foreground"
                aria-label="Get help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className="text-muted-foreground"
                aria-label="Exit onboarding"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ProgressIndicator
            currentStep={currentStepIndex + 1}
            totalSteps={steps.length}
            completedMilestones={[]} // TODO: Get from session
            nextMilestone={null} // TODO: Calculate next milestone
            estimatedTimeRemaining={
              steps.slice(currentStepIndex).reduce((total, step) => total + step.estimated_time, 0)
            }
            className="mt-4"
          />
        </CardHeader>
      </Card>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step content */}
        <div className="lg:col-span-3">
          <InteractiveStepComponent
            step={currentStep}
            onStepComplete={handleStepComplete}
            onNeedHelp={() => setShowHelp(true)}
            allowSkip={!currentStep.is_required}
            sandboxMode={currentStep.step_type === 'exercise'}
            isProcessing={isProcessing}
          />
        </div>

        {/* Contextual help sidebar */}
        <div className="lg:col-span-1">
          <ContextualHelp
            step={currentStep}
            isVisible={showHelp}
            onClose={() => setShowHelp(false)}
            onEscalateSupport={() => {
              // TODO: Implement support escalation
              console.log('Escalating to support')
            }}
          />
        </div>
      </div>

      {/* Navigation footer */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoBack || isProcessing}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {!currentStep.is_required && (
              <Button
                variant="ghost"
                onClick={handleStepSkip}
                disabled={isProcessing}
                className="text-muted-foreground"
              >
                Skip Step
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            
            {canGoNext && (
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={isProcessing}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Processing step completion...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}