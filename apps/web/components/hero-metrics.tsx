'use client'

import React from 'react'
import { HeroMetric } from '@/lib/types/hero'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { CheckCircleIcon, UsersIcon, TrendingUpIcon, StarIcon } from 'lucide-react'

interface HeroMetricsProps {
  metrics: HeroMetric[]
  className?: string
}

const defaultMetrics: HeroMetric[] = [
  {
    id: 'users',
    value: 10000,
    label: 'Active Users',
    description: 'Trusted by professionals worldwide',
    icon: UsersIcon,
    animateCounter: true
  },
  {
    id: 'accuracy',
    value: 99,
    label: 'Accuracy Rate',
    description: 'AI-powered precision',
    icon: CheckCircleIcon,
    animateCounter: true
  },
  {
    id: 'growth',
    value: 300,
    label: 'Faster Analysis',
    description: 'Compared to traditional methods',
    icon: TrendingUpIcon,
    animateCounter: true
  },
  {
    id: 'rating',
    value: 4.9,
    label: 'User Rating',
    description: 'Based on 1000+ reviews',
    icon: StarIcon,
    animateCounter: true
  }
]

export function HeroMetrics({ metrics = defaultMetrics, className = '' }: HeroMetricsProps) {
  return (
    <div className={`mt-12 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="text-center group hover:scale-105 transition-transform duration-300"
          >
            <div className="flex items-center justify-center mb-2">
              {metric.icon && (
                <metric.icon className="h-6 w-6 text-c9n-teal mr-2" />
              )}
              <div className="text-2xl md:text-3xl font-bold text-white">
                {metric.animateCounter && typeof metric.value === 'number' ? (
                  <AnimatedCounter
                    value={metric.value}
                    suffix={metric.id === 'accuracy' ? '%' : metric.id === 'growth' ? '%' : metric.id === 'rating' ? '' : '+'}
                    className="bg-clip-text text-transparent bg-yellow-lime-gradient"
                  />
                ) : (
                  <span className="bg-clip-text text-transparent bg-yellow-lime-gradient">
                    {metric.value}
                    {metric.id === 'accuracy' ? '%' : metric.id === 'growth' ? '%' : metric.id === 'rating' ? '' : '+'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-windsurf-gray-light">
              {metric.label}
            </div>
            {metric.description && (
              <div className="text-xs text-windsurf-gray-light/70 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {metric.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}