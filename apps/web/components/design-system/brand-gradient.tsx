/**
 * Brand Gradient Component
 * 
 * Provides consistent gradient backgrounds and text effects
 * following brand guidelines.
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { brandGradients } from '@/lib/design-system/tokens'

export interface BrandGradientProps {
  /** Gradient variant to use */
  variant: 'primary' | 'secondary' | 'accent' | 'hero' | 'feature' | 'rainbow'
  /** Gradient direction */
  direction?: 'horizontal' | 'vertical' | 'diagonal' | 'radial'
  /** Whether to animate the gradient */
  animated?: boolean
  /** Whether to apply gradient to text instead of background */
  asText?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children?: React.ReactNode
  /** Custom style overrides */
  style?: React.CSSProperties
}

const gradientMap = {
  primary: {
    horizontal: brandGradients.primary.purplePink,
    vertical: brandGradients.primary.purplePinkVertical,
    diagonal: brandGradients.primary.purplePink,
    radial: brandGradients.primary.purplePinkRadial,
  },
  secondary: {
    horizontal: brandGradients.secondary.blueTeal,
    vertical: brandGradients.secondary.blueTealVertical,
    diagonal: brandGradients.secondary.blueTeal,
    radial: brandGradients.secondary.blueTealRadial,
  },
  accent: {
    horizontal: brandGradients.accent.yellowLime,
    vertical: brandGradients.accent.yellowLimeVertical,
    diagonal: brandGradients.accent.yellowLime,
    radial: brandGradients.accent.yellowLimeRadial,
  },
  hero: {
    horizontal: brandGradients.complex.hero,
    vertical: brandGradients.complex.hero,
    diagonal: brandGradients.complex.hero,
    radial: brandGradients.complex.hero,
  },
  feature: {
    horizontal: brandGradients.complex.feature,
    vertical: brandGradients.complex.feature,
    diagonal: brandGradients.complex.feature,
    radial: brandGradients.complex.feature,
  },
  rainbow: {
    horizontal: brandGradients.complex.rainbow,
    vertical: brandGradients.complex.rainbow,
    diagonal: brandGradients.complex.rainbow,
    radial: brandGradients.complex.rainbow,
  },
}

export function BrandGradient({
  variant,
  direction = 'diagonal',
  animated = false,
  asText = false,
  className,
  children,
  style,
  ...props
}: BrandGradientProps & React.HTMLAttributes<HTMLDivElement | HTMLSpanElement>) {
  const gradientStyle = gradientMap[variant][direction]
  
  const baseClasses = cn(
    {
      // Background gradient classes (when not text)
      'bg-gradient-to-r': !asText && direction === 'horizontal',
      'bg-gradient-to-b': !asText && direction === 'vertical',
      'bg-gradient-to-br': !asText && direction === 'diagonal',
      'bg-radial-gradient': !asText && direction === 'radial',
      
      // Text gradient classes
      'bg-clip-text text-transparent': asText,
      
      // Animation classes
      'animate-gradient-wave': animated,
      'bg-200%': animated,
    },
    // Add text gradient direction classes separately to avoid duplicates
    asText && direction === 'horizontal' && 'bg-gradient-to-r',
    asText && direction === 'vertical' && 'bg-gradient-to-b',
    asText && direction === 'diagonal' && 'bg-gradient-to-br',
    className
  )

  const combinedStyle: React.CSSProperties = {
    backgroundImage: gradientStyle,
    ...style,
  }

  if (asText) {
    return (
      <span 
        className={baseClasses}
        style={combinedStyle}
        {...props}
      >
        {children}
      </span>
    )
  }

  return (
    <div 
      className={baseClasses}
      style={combinedStyle}
      {...props}
    >
      {children}
    </div>
  )
}

// Specialized gradient text component
export interface GradientTextProps extends Omit<BrandGradientProps, 'asText'> {
  /** HTML tag to render */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function GradientText({
  as: Component = 'span',
  variant,
  direction = 'diagonal',
  animated = false,
  className,
  children,
  style,
}: GradientTextProps) {
  const gradientStyle = gradientMap[variant][direction]
  
  const textClasses = cn(
    'bg-clip-text text-transparent font-bold',
    {
      'animate-gradient-wave bg-200%': animated,
    },
    className
  )

  const combinedStyle: React.CSSProperties = {
    backgroundImage: gradientStyle,
    ...style,
  }

  return (
    <Component 
      className={textClasses}
      style={combinedStyle}
    >
      {children}
    </Component>
  )
}

// Gradient border component
export interface GradientBorderProps {
  /** Gradient variant */
  variant: 'primary' | 'secondary' | 'accent'
  /** Border width */
  width?: 1 | 2 | 3 | 4
  /** Border radius */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether to animate the gradient */
  animated?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children: React.ReactNode
}

export function GradientBorder({
  variant,
  width = 2,
  radius = 'lg',
  animated = false,
  className,
  children,
  ...props
}: GradientBorderProps & React.HTMLAttributes<HTMLDivElement>) {
  const gradientStyle = gradientMap[variant].diagonal
  
  const borderClasses = cn(
    'relative overflow-hidden',
    {
      'rounded-sm': radius === 'sm',
      'rounded-md': radius === 'md',
      'rounded-lg': radius === 'lg',
      'rounded-xl': radius === 'xl',
      'rounded-full': radius === 'full',
    },
    className
  )

  const innerClasses = cn(
    'relative z-10 h-full w-full bg-c9n-blue-dark',
    {
      'rounded-sm': radius === 'sm',
      'rounded-md': radius === 'md',
      'rounded-lg': radius === 'lg',
      'rounded-xl': radius === 'xl',
      'rounded-full': radius === 'full',
      'm-0.5': width === 1,
      'm-1': width === 2,
      'm-1.5': width === 3,
      'm-2': width === 4,
    }
  )

  const gradientBgClasses = cn(
    'absolute inset-0',
    {
      'animate-gradient-wave bg-200%': animated,
    }
  )

  return (
    <div className={borderClasses} {...props}>
      <div 
        className={gradientBgClasses}
        style={{ backgroundImage: gradientStyle }}
      />
      <div className={innerClasses}>
        {children}
      </div>
    </div>
  )
}

// Gradient overlay component for images/videos
export interface GradientOverlayProps {
  /** Gradient variant */
  variant: 'primary' | 'secondary' | 'accent' | 'hero'
  /** Overlay opacity */
  opacity?: 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9
  /** Gradient direction */
  direction?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Additional CSS classes */
  className?: string
}

export function GradientOverlay({
  variant,
  opacity = 0.5,
  direction = 'center',
  className,
}: GradientOverlayProps) {
  const gradientStyle = gradientMap[variant].diagonal
  
  const overlayClasses = cn(
    'absolute inset-0 pointer-events-none',
    {
      'bg-gradient-to-t': direction === 'top',
      'bg-gradient-to-b': direction === 'bottom',
      'bg-gradient-to-l': direction === 'left',
      'bg-gradient-to-r': direction === 'right',
      'bg-radial-gradient': direction === 'center',
    },
    className
  )

  return (
    <div 
      className={overlayClasses}
      style={{ 
        backgroundImage: gradientStyle,
        opacity,
      }}
    />
  )
}