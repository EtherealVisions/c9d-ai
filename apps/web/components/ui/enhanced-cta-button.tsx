'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonCTAConfig } from '@/lib/types/hero'
import { trackAnalyticsEvent } from '@/lib/utils/analytics'
import Link from 'next/link'

interface EnhancedCTAButtonProps {
  config: ButtonCTAConfig
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  children?: React.ReactNode
}

export function EnhancedCTAButton({ 
  config, 
  size = 'lg', 
  className = '',
  children 
}: EnhancedCTAButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (config.tracking) {
      trackAnalyticsEvent(config.tracking)
    }
  }

  const getVariantStyles = () => {
    switch (config.variant) {
      case 'primary':
        return 'bg-windsurf-pink-hot text-white hover:bg-opacity-90 shadow-lg hover:shadow-xl hover:shadow-windsurf-pink-hot/25'
      case 'secondary':
        return 'bg-windsurf-blue-electric text-white hover:bg-opacity-90 shadow-lg hover:shadow-xl hover:shadow-windsurf-blue-electric/25'
      case 'outline':
        return 'border-2 border-windsurf-pink-hot text-windsurf-pink-hot bg-transparent hover:bg-windsurf-pink-hot hover:text-white'
      default:
        return 'bg-windsurf-pink-hot text-white hover:bg-opacity-90'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-4 text-sm'
      case 'md':
        return 'py-2.5 px-6 text-base'
      case 'lg':
        return 'py-3 px-8 text-lg'
      case 'xl':
        return 'py-4 px-10 text-xl'
      default:
        return 'py-3 px-8 text-lg'
    }
  }

  const buttonContent = (
    <>
      {config.icon && (
        <config.icon className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
      )}
      {children || config.text}
    </>
  )

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'sm'
      case 'md': return 'default'
      case 'lg': return 'lg'
      case 'xl': return 'lg'
      default: return 'default'
    }
  }

  return (
    <Button
      size={getButtonSize()}
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        font-semibold transition-all duration-300 transform 
        hover:scale-105 active:scale-95
        ${isHovered ? 'animate-pulse' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      asChild
    >
      <Link href={config.href || '#'}>
        {buttonContent}
      </Link>
    </Button>
  )
}