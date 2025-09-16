'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Trophy, 
  Target,
  Star,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  completedMilestones: Milestone[]
  nextMilestone: Milestone | null
  estimatedTimeRemaining: number
  className?: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  type: 'progress' | 'achievement' | 'completion' | 'time_based'
  criteria: Record<string, unknown>
  reward: {
    points: number
    badge?: string
    title?: string
  }
  earnedAt?: string
  progress?: number
  isUnlocked?: boolean
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  completedMilestones,
  nextMilestone,
  estimatedTimeRemaining,
  className
}: ProgressIndicatorProps) {
  // Calculate progress percentage
  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  
  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  }

  // Get milestone icon
  const getMilestoneIcon = (type: Milestone['type']) => {
    switch (type) {
      case 'progress':
        return Target
      case 'achievement':
        return Trophy
      case 'completion':
        return Award
      case 'time_based':
        return Clock
      default:
        return Star
    }
  }

  // Get milestone color
  const getMilestoneColor = (type: Milestone['type']) => {
    switch (type) {
      case 'progress':
        return 'text-blue-500'
      case 'achievement':
        return 'text-yellow-500'
      case 'completion':
        return 'text-green-500'
      case 'time_based':
        return 'text-purple-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <Card className={cn("w-full", className)} data-testid="progress-indicator">
      <CardContent className="p-6 space-y-6">
        {/* Main progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Overall Progress</h3>
              <p className="text-sm text-muted-foreground" data-testid="step-counter">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold" data-testid="progress-percentage">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Complete
              </div>
            </div>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-3" 
            data-testid="progress-bar"
            data-value={Math.round(progressPercentage)}
            data-current-step={currentStep}
            data-total-steps={totalSteps}
          />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Started</span>
            <span>{formatTime(estimatedTimeRemaining)} remaining</span>
          </div>
        </div>

        <Separator />

        {/* Step indicators */}
        <div className="space-y-3">
          <h4 className="font-medium">Steps</h4>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1
              const isCompleted = stepNumber < currentStep
              const isCurrent = stepNumber === currentStep
              const isUpcoming = stepNumber > currentStep

              return (
                <div
                  key={stepNumber}
                  className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors",
                    {
                      "bg-green-500 text-white": isCompleted,
                      "bg-blue-500 text-white ring-2 ring-blue-200": isCurrent,
                      "bg-gray-200 text-gray-500": isUpcoming
                    }
                  )}
                  title={`Step ${stepNumber}`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Circle className="h-4 w-4 fill-current" />
                  ) : (
                    stepNumber
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Milestones section */}
        {(completedMilestones.length > 0 || nextMilestone) && (
          <>
            <Separator />
            <div className="space-y-4" role="region" aria-label="Milestones">
              <h4 className="font-medium">Milestones</h4>
              
              {/* Completed milestones */}
              {completedMilestones.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">Earned</h5>
                  <ul className="grid gap-2" role="list">
                    {completedMilestones.slice(-3).map((milestone) => {
                      const Icon = getMilestoneIcon(milestone.type)
                      const colorClass = getMilestoneColor(milestone.type)
                      
                      return (
                        <li
                          key={milestone.id}
                          className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50"
                          role="listitem"
                        >
                          <div className={cn("p-1 rounded-full bg-background", colorClass)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium truncate">
                                {milestone.name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                +{milestone.reward.points}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {milestone.description}
                            </p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        </li>
                      )
                    })}
                  </ul>
                  
                  {completedMilestones.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{completedMilestones.length - 3} more milestones earned
                    </p>
                  )}
                </div>
              )}

              {/* Next milestone */}
              {nextMilestone && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">Next Goal</h5>
                  <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30">
                    <div className="flex items-start space-x-3">
                      <div className="p-1 rounded-full bg-muted">
                        {React.createElement(getMilestoneIcon(nextMilestone.type), {
                          className: cn("h-4 w-4", getMilestoneColor(nextMilestone.type))
                        })}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {nextMilestone.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {nextMilestone.reward.points} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nextMilestone.description}
                        </p>
                        
                        {/* Progress towards next milestone */}
                        {nextMilestone.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {Math.round(nextMilestone.progress)}%
                              </span>
                            </div>
                            <Progress 
                              value={nextMilestone.progress} 
                              className="h-1.5" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Achievement summary */}
        {completedMilestones.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center" role="region" aria-label="Achievement Summary">
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-500">
                  {completedMilestones.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Milestones
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-blue-500">
                  {completedMilestones.reduce((total, m) => total + m.reward.points, 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Points
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-purple-500">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Complete
                </div>
              </div>
            </div>
          </>
        )}

        {/* Time estimate */}
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Estimated completion: {formatTime(estimatedTimeRemaining)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}