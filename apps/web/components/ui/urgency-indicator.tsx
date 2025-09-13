'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Users, Zap, AlertCircle } from 'lucide-react'
import { UrgencyConfig, ScarcityConfig } from '@/lib/types/cta'
import { trackUrgencyView } from '@/lib/utils/cta-analytics'
import { cn } from '@/lib/utils'

interface UrgencyIndicatorProps {
  config: UrgencyConfig
  className?: string
  userId?: string
}

export function UrgencyIndicator({ config, className, userId }: UrgencyIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    if (config.enabled && config.type === 'countdown' && config.endDate) {
      const updateCountdown = () => {
        const now = new Date().getTime()
        const end = new Date(config.endDate!).getTime()
        const difference = end - now

        if (difference > 0) {
          setTimeRemaining({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000)
          })
        } else {
          setTimeRemaining(null)
        }
      }

      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)

      // Track urgency view
      trackUrgencyView(config.type, 'urgency_indicator', userId)

      return () => clearInterval(interval)
    }
  }, [config, userId])

  if (!config.enabled) return null

  const getIcon = () => {
    switch (config.type) {
      case 'countdown':
        return Clock
      case 'limited-time':
        return AlertCircle
      case 'beta-access':
        return Zap
      default:
        return Clock
    }
  }

  const Icon = getIcon()

  const renderCountdown = () => {
    if (!timeRemaining) return null

    return (
      <div className="flex items-center space-x-2 text-sm font-mono">
        <span className="bg-red-500 text-white px-2 py-1 rounded">
          {timeRemaining.days.toString().padStart(2, '0')}d
        </span>
        <span className="bg-red-500 text-white px-2 py-1 rounded">
          {timeRemaining.hours.toString().padStart(2, '0')}h
        </span>
        <span className="bg-red-500 text-white px-2 py-1 rounded">
          {timeRemaining.minutes.toString().padStart(2, '0')}m
        </span>
        <span className="bg-red-500 text-white px-2 py-1 rounded">
          {timeRemaining.seconds.toString().padStart(2, '0')}s
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-center space-x-2 p-3 rounded-lg',
      'bg-gradient-to-r from-red-500/10 to-orange-500/10',
      'border border-red-500/20 backdrop-blur-sm',
      'animate-pulse',
      className
    )}>
      <Icon className="h-4 w-4 text-red-400" />
      <span className="text-sm font-medium text-red-300">
        {config.message}
      </span>
      {config.type === 'countdown' && renderCountdown()}
      {config.countdownText && (
        <span className="text-xs text-red-400 ml-2">
          {config.countdownText}
        </span>
      )}
    </div>
  )
}

interface ScarcityIndicatorProps {
  config: ScarcityConfig
  className?: string
  userId?: string
}

export function ScarcityIndicator({ config, className, userId }: ScarcityIndicatorProps) {
  useEffect(() => {
    if (config.enabled) {
      trackUrgencyView((config.type as any) || 'limited-time', 'scarcity_indicator', userId)
    }
  }, [config, userId])

  if (!config.enabled) return null

  const getIcon = () => {
    switch (config.type) {
      case 'limited-spots':
        return Users
      case 'beta-slots':
        return Zap
      case 'early-access':
        return AlertCircle
      default:
        return Users
    }
  }

  const Icon = getIcon()

  const getProgressPercentage = () => {
    if (!config.remaining || !config.total) return 0
    return ((config.total - config.remaining) / config.total) * 100
  }

  const progressPercentage = getProgressPercentage()

  return (
    <div className={cn(
      'flex flex-col space-y-2 p-3 rounded-lg',
      'bg-gradient-to-r from-orange-500/10 to-yellow-500/10',
      'border border-orange-500/20 backdrop-blur-sm',
      className
    )}>
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-medium text-orange-300">
          {config.message}
        </span>
      </div>
      
      {config.remaining !== undefined && config.total !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-orange-400">
            <span>{config.remaining} remaining</span>
            <span>{config.total - config.remaining} taken</span>
          </div>
          <div className="w-full bg-orange-900/30 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}