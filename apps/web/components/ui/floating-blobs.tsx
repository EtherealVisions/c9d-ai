'use client'

import React, { useMemo } from 'react'
import { AnimationConfig } from '@/lib/types/hero'

interface FloatingBlobsProps {
  config: AnimationConfig
  className?: string
}

export function FloatingBlobs({ config, className = '' }: FloatingBlobsProps) {
  const blobs = useMemo(() => {
    if (!config.enableFloatingBlobs) return []

    const colorSchemes = {
      'purple-pink': [
        'bg-windsurf-purple-vibrant/25',
        'bg-windsurf-pink-hot/20',
        'bg-windsurf-purple-deep/30'
      ],
      'blue-teal': [
        'bg-windsurf-blue-electric/20',
        'bg-c9n-teal/25',
        'bg-windsurf-blue-electric/15'
      ],
      'yellow-lime': [
        'bg-windsurf-yellow-bright/20',
        'bg-windsurf-green-lime/25',
        'bg-windsurf-yellow-bright/15'
      ],
      'mixed': [
        'bg-windsurf-pink-hot/25',
        'bg-windsurf-blue-electric/20',
        'bg-windsurf-yellow-bright/20',
        'bg-c9n-teal/25',
        'bg-windsurf-green-lime/20'
      ]
    }

    const colorScheme = config.colorScheme as keyof typeof colorSchemes || 'mixed'
    const colors = colorSchemes[colorScheme]
    const animationSpeeds = {
      slow: ['animate-gentle-float-1', 'animate-gentle-float-2', 'animate-gentle-float-3'],
      medium: ['animate-gentle-float-2', 'animate-gentle-float-3', 'animate-gentle-float-1'],
      fast: ['animate-gentle-float-3', 'animate-gentle-float-1', 'animate-gentle-float-2']
    }

    const animationSpeed = config.animationSpeed as keyof typeof animationSpeeds || 'medium'
    const animations = animationSpeeds[animationSpeed]
    const positions = [
      { top: '-25%', left: '-15%', size: 'w-[28rem] h-[28rem] sm:w-[32rem] sm:h-[32rem]' },
      { top: '-20%', right: '-20%', size: 'w-[32rem] h-[32rem] sm:w-[36rem] sm:h-[36rem]' },
      { bottom: '5%', right: '10%', size: 'w-[24rem] h-[24rem] sm:w-[28rem] sm:h-[28rem]' },
      { bottom: '-20%', left: '15%', size: 'w-[20rem] h-[20rem] sm:w-[24rem] sm:h-[24rem]' },
      { top: '30%', left: '-10%', size: 'w-[16rem] h-[16rem] sm:w-[20rem] sm:h-[20rem]' }
    ]

    return Array.from({ length: Math.min(config.blobCount || 3, 5) }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      animation: animations[i % animations.length],
      position: positions[i],
      blur: i % 2 === 0 ? 'blur-2xl' : 'blur-3xl',
      opacity: 0.3 + (i * 0.1)
    }))
  }, [config])

  if (!config.enableFloatingBlobs) return null

  return (
    <div className={`absolute inset-0 pointer-events-none z-0 ${className}`}>
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className={`
            absolute ${blob.position.size} ${blob.color} 
            rounded-full filter ${blob.blur} ${blob.animation}
          `}
          style={{
            ...blob.position,
            opacity: blob.opacity,
            willChange: 'transform'
          }}
        />
      ))}
    </div>
  )
}