'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  Clock, 
  HelpCircle, 
  Play, 
  Pause, 
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingStep, StepResult } from '@/lib/models/onboarding-types'

export interface InteractiveStepComponentProps {
  step: OnboardingStep
  onStepComplete: (result: StepResult) => void
  onNeedHelp: () => void
  allowSkip: boolean
  sandboxMode: boolean
  isProcessing?: boolean
  className?: string
}

interface StepValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  score?: number
}

interface InteractiveElement {
  id: string
  type: 'input' | 'choice' | 'code' | 'drag_drop' | 'simulation'
  label: string
  required: boolean
  validation?: Record<string, unknown>
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  defaultValue?: unknown
}

export function InteractiveStepComponent({
  step,
  onStepComplete,
  onNeedHelp,
  allowSkip,
  sandboxMode,
  isProcessing = false,
  className
}: InteractiveStepComponentProps) {
  // State management
  const [isStarted, setIsStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [userInputs, setUserInputs] = useState<Record<string, unknown>>({})
  const [validation, setValidation] = useState<StepValidation>({ isValid: false, errors: [], warnings: [] })
  const [attempts, setAttempts] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [activeTab, setActiveTab] = useState('content')

  // Extract interactive elements from step
  const interactiveElements = (step.interactive_elements?.elements as InteractiveElement[]) || []
  const hasInteractiveElements = interactiveElements.length > 0
  const stepContent = step.content || {}
  const successCriteria = step.success_criteria || {}

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isStarted && !isPaused && startTime) {
      interval = setInterval(() => {
        setTimeSpent(Date.now() - startTime)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isStarted, isPaused, startTime])

  // Start step
  const handleStart = useCallback(() => {
    setIsStarted(true)
    setStartTime(Date.now())
    setIsPaused(false)
  }, [])

  // Pause step
  const handlePause = useCallback(() => {
    setIsPaused(true)
  }, [])

  // Resume step
  const handleResume = useCallback(() => {
    setIsPaused(false)
    if (!startTime) {
      setStartTime(Date.now() - timeSpent)
    }
  }, [startTime, timeSpent])

  // Reset step
  const handleReset = useCallback(() => {
    setIsStarted(false)
    setIsPaused(false)
    setUserInputs({})
    setValidation({ isValid: false, errors: [], warnings: [] })
    setAttempts(0)
    setStartTime(null)
    setTimeSpent(0)
  }, [])

  // Handle input change
  const handleInputChange = useCallback((elementId: string, value: unknown) => {
    setUserInputs(prev => ({
      ...prev,
      [elementId]: value
    }))

    // Validate in real-time
    validateInputs({
      ...userInputs,
      [elementId]: value
    })
  }, [userInputs])

  // Validate user inputs
  const validateInputs = useCallback((inputs: Record<string, unknown>) => {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 0
    let maxScore = 0

    interactiveElements.forEach(element => {
      maxScore += 10 // Base score per element
      const value = inputs[element.id]

      // Required field validation
      if (element.required && (!value || value === '')) {
        errors.push(`${element.label} is required`)
        return
      }

      // Type-specific validation
      if (value !== undefined && value !== '') {
        switch (element.type) {
          case 'input':
            if (element.validation?.minLength && 
                typeof value === 'string' && 
                value.length < (element.validation.minLength as number)) {
              errors.push(`${element.label} must be at least ${element.validation.minLength} characters`)
            } else {
              score += 10
            }
            break

          case 'choice':
            if (element.options?.some(opt => opt.value === value)) {
              score += 10
            } else {
              errors.push(`Please select a valid option for ${element.label}`)
            }
            break

          case 'code':
            // Basic code validation
            if (typeof value === 'string' && value.trim().length > 0) {
              score += 10
              if (element.validation?.expectedOutput && 
                  !value.includes(element.validation.expectedOutput as string)) {
                warnings.push(`Your code might not produce the expected output`)
                score -= 2
              }
            }
            break

          default:
            score += 5 // Partial credit for other types
        }
      }
    })

    // Check success criteria
    const criteriaScore = validateSuccessCriteria(inputs)
    score += criteriaScore.score
    maxScore += criteriaScore.maxScore
    errors.push(...criteriaScore.errors)
    warnings.push(...criteriaScore.warnings)

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    const isValid = errors.length === 0 && 
                   (step.step_type === 'tutorial' || finalScore >= 70)

    setValidation({
      isValid,
      errors,
      warnings,
      score: finalScore
    })
  }, [interactiveElements, step.step_type, successCriteria])

  // Validate success criteria
  const validateSuccessCriteria = useCallback((inputs: Record<string, unknown>) => {
    let score = 0
    let maxScore = 0
    const errors: string[] = []
    const warnings: string[] = []

    if (successCriteria.requiredActions) {
      const requiredActions = successCriteria.requiredActions as string[]
      maxScore += requiredActions.length * 20

      requiredActions.forEach(action => {
        if (inputs[action]) {
          score += 20
        } else {
          errors.push(`Required action not completed: ${action}`)
        }
      })
    }

    if (successCriteria.minimumScore && validation.score) {
      const minScore = successCriteria.minimumScore as number
      if (validation.score >= minScore) {
        score += 30
      } else {
        warnings.push(`Score ${validation.score}% is below minimum ${minScore}%`)
      }
      maxScore += 30
    }

    return { score, maxScore, errors, warnings }
  }, [successCriteria, validation.score])

  // Complete step
  const handleComplete = useCallback(() => {
    const result: StepResult = {
      stepId: step.id,
      status: validation.isValid ? 'completed' : 'failed',
      timeSpent: timeSpent,
      userActions: {
        inputs: userInputs,
        attempts: attempts + 1,
        startTime: startTime,
        endTime: Date.now()
      },
      feedback: {
        score: validation.score,
        errors: validation.errors,
        warnings: validation.warnings
      }
    }

    if (!validation.isValid) {
      setAttempts(prev => prev + 1)
      return
    }

    onStepComplete(result)
  }, [step.id, validation, timeSpent, userInputs, attempts, startTime, onStepComplete])

  // Skip step
  const handleSkip = useCallback(() => {
    const result: StepResult = {
      stepId: step.id,
      status: 'skipped',
      timeSpent: timeSpent,
      userActions: {
        skipped: true,
        skipTime: Date.now()
      }
    }

    onStepComplete(result)
  }, [step.id, timeSpent, onStepComplete])

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get step type icon and color
  const getStepTypeInfo = () => {
    switch (step.step_type) {
      case 'tutorial':
        return { icon: Lightbulb, color: 'bg-blue-500', label: 'Tutorial' }
      case 'exercise':
        return { icon: Target, color: 'bg-green-500', label: 'Exercise' }
      case 'setup':
        return { icon: Play, color: 'bg-purple-500', label: 'Setup' }
      case 'validation':
        return { icon: CheckCircle, color: 'bg-orange-500', label: 'Validation' }
      case 'milestone':
        return { icon: CheckCircle, color: 'bg-yellow-500', label: 'Milestone' }
      default:
        return { icon: HelpCircle, color: 'bg-gray-500', label: 'Step' }
    }
  }

  const stepTypeInfo = getStepTypeInfo()
  const StepIcon = stepTypeInfo.icon

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={cn("p-1 rounded-full", stepTypeInfo.color)}>
                <StepIcon className="h-4 w-4 text-white" />
              </div>
              <Badge variant="secondary">{stepTypeInfo.label}</Badge>
              {step.is_required && <Badge variant="destructive">Required</Badge>}
              {sandboxMode && <Badge variant="outline">Sandbox</Badge>}
            </div>
            <CardTitle className="text-xl">{step.title}</CardTitle>
            {step.description && (
              <p className="text-muted-foreground">{step.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{step.estimated_time}min</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onNeedHelp}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timer and controls */}
        {isStarted && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(timeSpent)}</span>
              </div>
              {attempts > 0 && (
                <div className="text-sm text-muted-foreground">
                  Attempt {attempts + 1}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {isPaused ? (
                <Button variant="outline" size="sm" onClick={handleResume}>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handlePause}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {!isStarted ? (
          /* Start screen */
          <div className="text-center py-8">
            <div className="space-y-4">
              <div className="text-lg font-medium">Ready to begin?</div>
              <p className="text-muted-foreground max-w-md mx-auto">
                {step.step_type === 'tutorial' 
                  ? 'This tutorial will guide you through the concepts step by step.'
                  : step.step_type === 'exercise'
                  ? 'Complete the interactive exercise to practice what you\'ve learned.'
                  : 'Follow the instructions to complete this step.'
                }
              </p>
              <div className="flex justify-center space-x-2">
                <Button onClick={handleStart} size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Step
                </Button>
                {allowSkip && (
                  <Button variant="outline" onClick={handleSkip}>
                    Skip Step
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active step content */
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                {/* Step content */}
                <div className="prose prose-sm max-w-none">
                  {stepContent.text && typeof stepContent.text === 'string' ? (
                    <div dangerouslySetInnerHTML={{ __html: stepContent.text }} />
                  ) : null}
                  {stepContent.video && typeof stepContent.video === 'string' ? (
                    <div className="aspect-video">
                      <video 
                        controls 
                        className="w-full h-full rounded-lg"
                        src={stepContent.video}
                      />
                    </div>
                  ) : null}
                  {stepContent.images && Array.isArray(stepContent.images) ? (
                    <div className="grid grid-cols-2 gap-4">
                      {stepContent.images.map((image, index) => 
                        typeof image === 'string' ? (
                          <img 
                            key={index}
                            src={image} 
                            alt={`Step illustration ${index + 1}`}
                            className="rounded-lg border"
                          />
                        ) : null
                      )}
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="practice" className="space-y-4">
                {/* Interactive elements */}
                {hasInteractiveElements ? (
                  <div className="space-y-6">
                    {interactiveElements.map((element) => (
                      <div key={element.id} className="space-y-2">
                        <label className="text-sm font-medium">
                          {element.label}
                          {element.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {element.type === 'input' && (
                          <input
                            type="text"
                            placeholder={element.placeholder}
                            value={(userInputs[element.id] as string) || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        )}
                        
                        {element.type === 'choice' && element.options && (
                          <select
                            value={(userInputs[element.id] as string) || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="">Select an option...</option>
                            {element.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {element.type === 'code' && (
                          <textarea
                            placeholder={element.placeholder || 'Enter your code here...'}
                            value={(userInputs[element.id] as string) || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                            rows={6}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No interactive elements for this step.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="validation" className="space-y-4">
                {/* Validation feedback */}
                <div className="space-y-4">
                  {validation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {validation.errors.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {validation.warnings.map((warning, index) => (
                            <div key={index}>{warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.score !== undefined && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <span className="font-medium">Current Score</span>
                      <Badge variant={validation.score >= 70 ? "default" : "secondary"}>
                        {validation.score}%
                      </Badge>
                    </div>
                  )}
                  
                  {validation.isValid && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Great job! You've successfully completed this step.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {allowSkip && (
                  <Button variant="ghost" onClick={handleSkip} disabled={isProcessing}>
                    Skip Step
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleComplete}
                  disabled={!validation.isValid || isProcessing}
                  className="min-w-[120px]"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : validation.isValid ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Step
                    </>
                  ) : (
                    'Complete Step'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}