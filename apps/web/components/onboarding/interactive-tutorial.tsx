'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Pause, 
  RotateCcw, 
  HelpCircle,
  Clock,
  Users,
  Target
} from 'lucide-react'
import { SandboxService, Tutorial, TutorialStep, SandboxSession } from '@/lib/services/sandbox-service'

interface InteractiveTutorialProps {
  tutorialId: string
  userId: string
  onComplete?: (tutorialId: string, completionData: any) => void
  onExit?: () => void
  className?: string
}

interface TutorialState {
  currentStepIndex: number
  completedSteps: string[]
  isActive: boolean
  feedback: string | null
  errors: string[]
  startTime: Date
}

export function InteractiveTutorial({
  tutorialId,
  userId,
  onComplete,
  onExit,
  className = ''
}: InteractiveTutorialProps) {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null)
  const [session, setSession] = useState<SandboxSession | null>(null)
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    currentStepIndex: 0,
    completedSteps: [],
    isActive: false,
    feedback: null,
    errors: [],
    startTime: new Date()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showHints, setShowHints] = useState(false)

  // Load tutorial and create session
  useEffect(() => {
    const loadTutorial = async () => {
      try {
        const tutorialData = SandboxService.getTutorial(tutorialId)
        if (!tutorialData) {
          throw new Error(`Tutorial ${tutorialId} not found`)
        }

        setTutorial(tutorialData)
        
        // Create sandbox session
        const sandboxSession = await SandboxService.createSession(
          userId,
          'auth-tutorial', // Default environment for auth tutorials
          'tutorial'
        )
        
        setSession(sandboxSession)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load tutorial:', error)
        setIsLoading(false)
      }
    }

    loadTutorial()
  }, [tutorialId, userId])

  // Start tutorial
  const startTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      startTime: new Date()
    }))
  }, [])

  // Pause tutorial
  const pauseTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isActive: false
    }))
  }, [])

  // Reset tutorial
  const resetTutorial = useCallback(() => {
    setTutorialState({
      currentStepIndex: 0,
      completedSteps: [],
      isActive: false,
      feedback: null,
      errors: [],
      startTime: new Date()
    })
  }, [])

  // Validate step completion
  const validateStep = useCallback(async (stepId: string, userInput: unknown) => {
    if (!session) return

    try {
      const result = SandboxService.validateStep(session.id, stepId, userInput)
      
      setTutorialState(prev => ({
        ...prev,
        feedback: result.feedback,
        completedSteps: result.isValid 
          ? [...prev.completedSteps, stepId]
          : prev.completedSteps,
        currentStepIndex: result.isValid && result.nextStep
          ? prev.currentStepIndex + 1
          : prev.currentStepIndex
      }))

      // Check if tutorial is complete
      if (tutorial && result.isValid && !result.nextStep) {
        const completionData = {
          tutorialId,
          completedAt: new Date(),
          duration: Date.now() - tutorialState.startTime.getTime(),
          stepsCompleted: tutorialState.completedSteps.length + 1,
          totalSteps: tutorial.steps.length
        }
        
        onComplete?.(tutorialId, completionData)
      }
    } catch (error) {
      setTutorialState(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }))
    }
  }, [session, tutorial, tutorialId, tutorialState.startTime, tutorialState.completedSteps, onComplete])

  // Simulate step action (for demo purposes)
  const simulateStepAction = useCallback((step: TutorialStep) => {
    // This would normally interact with the actual UI elements
    // For demo purposes, we'll simulate the action
    let simulatedInput: unknown

    switch (step.action) {
      case 'click':
        simulatedInput = step.target
        break
      case 'input':
        simulatedInput = step.expectedValue || 'demo-input'
        break
      case 'navigate':
        simulatedInput = step.target
        break
      default:
        simulatedInput = true
    }

    validateStep(step.id, simulatedInput)
  }, [validateStep])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading tutorial...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tutorial) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert data-testid="tutorial-not-found">
            <AlertDescription>
              Tutorial not found. Please check the tutorial ID and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const currentStep = tutorial.steps[tutorialState.currentStepIndex]
  const progress = (tutorialState.completedSteps.length / tutorial.steps.length) * 100
  const isCompleted = tutorialState.completedSteps.length === tutorial.steps.length

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tutorial Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" data-testid="tutorial-title">
                {tutorial.title}
                <Badge 
                  variant={tutorial.difficulty === 'beginner' ? 'default' : 
                          tutorial.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                  data-testid="tutorial-difficulty"
                >
                  {tutorial.difficulty}
                </Badge>
              </CardTitle>
              <CardDescription data-testid="tutorial-description">{tutorial.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="tutorial-duration">
              <Clock className="h-4 w-4" />
              {tutorial.estimatedTime} min
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span data-testid="progress-indicator">{tutorialState.completedSteps.length}/{tutorial.steps.length} steps</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2" 
              aria-valuenow={progress} 
              aria-valuemin={0} 
              aria-valuemax={100}
              data-testid="progress-bar"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Tutorial Controls */}
      <div className="flex items-center gap-2">
        {!tutorialState.isActive && !isCompleted && (
          <Button 
            onClick={startTutorial} 
            className="flex items-center gap-2"
            data-testid={tutorialState.completedSteps.length > 0 ? 'resume-tutorial-button' : 'start-tutorial-button'}
          >
            <Play className="h-4 w-4" />
            {tutorialState.completedSteps.length > 0 ? 'Resume' : 'Start'} Tutorial
          </Button>
        )}
        
        {tutorialState.isActive && (
          <Button 
            onClick={pauseTutorial} 
            variant="outline" 
            className="flex items-center gap-2"
            data-testid="pause-tutorial-button"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        
        <Button 
          onClick={resetTutorial} 
          variant="outline" 
          className="flex items-center gap-2"
          data-testid="reset-tutorial-button"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        
        {onExit && (
          <Button onClick={onExit} variant="ghost" data-testid="exit-tutorial-button">
            Exit Tutorial
          </Button>
        )}
      </div>

      {/* Current Step */}
      {tutorialState.isActive && currentStep && !isCompleted && (
        <Card data-testid="current-step-container" role="region" aria-label={`Current step: ${currentStep.title}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="current-step-title">
              <Target className="h-5 w-5" />
              Step {tutorialState.currentStepIndex + 1}: {currentStep.title}
            </CardTitle>
            <CardDescription data-testid="step-description">{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Step Action Button */}
              <Button 
                onClick={() => simulateStepAction(currentStep)}
                className="w-full"
                data-testid="step-action-button"
              >
                {currentStep.action === 'click' && 'Click Element'}
                {currentStep.action === 'input' && 'Enter Input'}
                {currentStep.action === 'navigate' && 'Navigate'}
                {currentStep.action === 'validate' && 'Validate'}
                {currentStep.action === 'wait' && 'Continue'}
              </Button>

              {/* Hints */}
              {currentStep.hints.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-2"
                    data-testid={showHints ? 'hide-hints-button' : 'show-hints-button'}
                  >
                    <HelpCircle className="h-4 w-4" />
                    {showHints ? 'Hide' : 'Show'} Hints
                  </Button>
                  
                  {showHints && (
                    <div className="space-y-1" data-testid="hints-container">
                      {currentStep.hints.map((hint, index) => (
                        <Alert key={index}>
                          <AlertDescription data-testid="hint-text">{hint}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {tutorialState.feedback && (
        <Alert data-testid="step-feedback">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{tutorialState.feedback}</AlertDescription>
        </Alert>
      )}

      {/* Completion */}
      {isCompleted && (
        <Card data-testid="tutorial-completed">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold" data-testid="completion-message">Tutorial Completed!</h3>
                <p className="text-muted-foreground" data-testid="completion-description">
                  Congratulations! You've successfully completed the {tutorial.title} tutorial.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button onClick={resetTutorial} variant="outline" data-testid="try-again-button">
                  Try Again
                </Button>
                {onExit && (
                  <Button onClick={onExit} data-testid="continue-to-platform-button">
                    Continue to Platform
                  </Button>
                )}
                {tutorial.id === 'auth-basics' && (
                  <Button onClick={() => window.location.href = '/sign-in'} data-testid="continue-to-signin-button">
                    Continue to Sign In
                  </Button>
                )}
                {tutorial.id === 'signup-process' && (
                  <Button onClick={() => window.location.href = '/sign-up'} data-testid="continue-to-signup-button">
                    Continue to Sign Up
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Overview */}
      <Card data-testid="tutorial-steps-overview">
        <CardHeader>
          <CardTitle>Tutorial Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tutorial.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50" data-testid="step-overview-item">
                {tutorialState.completedSteps.includes(step.id) ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : index === tutorialState.currentStepIndex && tutorialState.isActive ? (
                  <Circle className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}