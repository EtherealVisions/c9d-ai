/**
 * Brand Typography System
 * 
 * Provides consistent typography components following brand guidelines
 * with proper hierarchy and accessibility support.
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { GradientText } from './brand-gradient'
import { typography, brandColors } from '@/lib/design-system/tokens'

// Typography variant types
export type TypographyVariant = 
  | 'display-hero'
  | 'display-title' 
  | 'display-subtitle'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'body-large'
  | 'body-base'
  | 'body-small'
  | 'caption-large'
  | 'caption-small'
  | 'label-large'
  | 'label-small'

export type TypographyColor = 
  | 'white'
  | 'gray-light'
  | 'gray-medium'
  | 'gray-dark'
  | 'accent-teal'
  | 'accent-pink'
  | 'gradient-primary'
  | 'gradient-secondary'
  | 'gradient-accent'

export type TypographyAlign = 'left' | 'center' | 'right' | 'justify'

export interface BrandTypographyProps {
  /** Typography variant */
  variant: TypographyVariant
  /** Text color */
  color?: TypographyColor
  /** Text alignment */
  align?: TypographyAlign
  /** HTML element to render */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
  /** Additional CSS classes */
  className?: string
  /** Child content */
  children: React.ReactNode
  /** Custom styles */
  style?: React.CSSProperties
}

// Typography variant configurations
const variantConfig: Record<TypographyVariant, {
  defaultElement: keyof React.JSX.IntrinsicElements
  classes: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing?: string
}> = {
  'display-hero': {
    defaultElement: 'h1',
    classes: 'font-bold tracking-tight',
    fontSize: 'text-6xl md:text-7xl lg:text-8xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-none',
    letterSpacing: 'tracking-tight',
  },
  'display-title': {
    defaultElement: 'h1',
    classes: 'font-bold tracking-tight',
    fontSize: 'text-4xl md:text-5xl lg:text-6xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
  },
  'display-subtitle': {
    defaultElement: 'h2',
    classes: 'font-semibold',
    fontSize: 'text-2xl md:text-3xl lg:text-4xl',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-tight',
  },
  'heading-1': {
    defaultElement: 'h1',
    classes: 'font-bold tracking-tight',
    fontSize: 'text-3xl md:text-4xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
  },
  'heading-2': {
    defaultElement: 'h2',
    classes: 'font-semibold tracking-tight',
    fontSize: 'text-2xl md:text-3xl',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-tight',
    letterSpacing: 'tracking-tight',
  },
  'heading-3': {
    defaultElement: 'h3',
    classes: 'font-semibold',
    fontSize: 'text-xl md:text-2xl',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-snug',
  },
  'heading-4': {
    defaultElement: 'h4',
    classes: 'font-semibold',
    fontSize: 'text-lg md:text-xl',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-snug',
  },
  'heading-5': {
    defaultElement: 'h5',
    classes: 'font-medium',
    fontSize: 'text-base md:text-lg',
    fontWeight: 'font-medium',
    lineHeight: 'leading-normal',
  },
  'heading-6': {
    defaultElement: 'h6',
    classes: 'font-medium',
    fontSize: 'text-sm md:text-base',
    fontWeight: 'font-medium',
    lineHeight: 'leading-normal',
  },
  'body-large': {
    defaultElement: 'p',
    classes: 'font-normal',
    fontSize: 'text-lg',
    fontWeight: 'font-normal',
    lineHeight: 'leading-relaxed',
  },
  'body-base': {
    defaultElement: 'p',
    classes: 'font-normal',
    fontSize: 'text-base',
    fontWeight: 'font-normal',
    lineHeight: 'leading-relaxed',
  },
  'body-small': {
    defaultElement: 'p',
    classes: 'font-normal',
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    lineHeight: 'leading-relaxed',
  },
  'caption-large': {
    defaultElement: 'span',
    classes: 'font-normal',
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    lineHeight: 'leading-normal',
  },
  'caption-small': {
    defaultElement: 'span',
    classes: 'font-normal',
    fontSize: 'text-xs',
    fontWeight: 'font-normal',
    lineHeight: 'leading-normal',
  },
  'label-large': {
    defaultElement: 'span',
    classes: 'font-medium',
    fontSize: 'text-sm',
    fontWeight: 'font-medium',
    lineHeight: 'leading-normal',
  },
  'label-small': {
    defaultElement: 'span',
    classes: 'font-medium',
    fontSize: 'text-xs',
    fontWeight: 'font-medium',
    lineHeight: 'leading-normal',
  },
}

// Color configurations
const colorConfig: Record<TypographyColor, string> = {
  'white': 'text-white',
  'gray-light': 'text-windsurf-gray-light',
  'gray-medium': 'text-windsurf-gray-medium',
  'gray-dark': 'text-gray-600',
  'accent-teal': 'text-c9n-teal',
  'accent-pink': 'text-windsurf-pink-hot',
  'gradient-primary': '', // Handled by GradientText
  'gradient-secondary': '', // Handled by GradientText
  'gradient-accent': '', // Handled by GradientText
}

// Alignment configurations
const alignConfig: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
}

export function BrandTypography({
  variant,
  color = 'white',
  align = 'left',
  as,
  className,
  children,
  style,
}: BrandTypographyProps) {
  const config = variantConfig[variant]
  const Component = as || config.defaultElement
  
  // Handle gradient text colors
  if (color.startsWith('gradient-')) {
    const gradientVariant = color.replace('gradient-', '') as 'primary' | 'secondary' | 'accent'
    
    return (
      <GradientText
        as={Component as any}
        variant={gradientVariant}
        className={cn(
          config.classes,
          config.fontSize,
          config.fontWeight,
          config.lineHeight,
          config.letterSpacing,
          alignConfig[align],
          className
        )}
        style={style}
      >
        {children}
      </GradientText>
    )
  }

  const typographyClasses = cn(
    config.classes,
    config.fontSize,
    config.fontWeight,
    config.lineHeight,
    config.letterSpacing,
    colorConfig[color],
    alignConfig[align],
    className
  )

  return (
    <Component className={typographyClasses} style={style}>
      {children}
    </Component>
  )
}

// Specialized typography components
export interface HeroTitleProps {
  children: React.ReactNode
  gradient?: boolean
  className?: string
}

export function HeroTitle({ children, gradient = true, className }: HeroTitleProps) {
  return (
    <BrandTypography
      variant="display-hero"
      color={gradient ? 'gradient-primary' : 'white'}
      align="center"
      className={className}
    >
      {children}
    </BrandTypography>
  )
}

export interface SectionTitleProps {
  children: React.ReactNode
  level?: 1 | 2 | 3
  gradient?: boolean
  className?: string
}

export function SectionTitle({ 
  children, 
  level = 2, 
  gradient = false, 
  className 
}: SectionTitleProps) {
  const variantMap = {
    1: 'heading-1' as const,
    2: 'heading-2' as const,
    3: 'heading-3' as const,
  }

  return (
    <BrandTypography
      variant={variantMap[level]}
      color={gradient ? 'gradient-primary' : 'white'}
      className={className}
    >
      {children}
    </BrandTypography>
  )
}

export interface BodyTextProps {
  children: React.ReactNode
  size?: 'small' | 'base' | 'large'
  color?: 'white' | 'gray-light' | 'gray-medium'
  className?: string
}

export function BodyText({ 
  children, 
  size = 'base', 
  color = 'gray-light', 
  className 
}: BodyTextProps) {
  const variantMap = {
    small: 'body-small' as const,
    base: 'body-base' as const,
    large: 'body-large' as const,
  }

  return (
    <BrandTypography
      variant={variantMap[size]}
      color={color}
      className={className}
    >
      {children}
    </BrandTypography>
  )
}

export interface CaptionTextProps {
  children: React.ReactNode
  size?: 'small' | 'large'
  color?: 'gray-light' | 'gray-medium' | 'accent-teal'
  className?: string
}

export function CaptionText({ 
  children, 
  size = 'small', 
  color = 'gray-medium', 
  className 
}: CaptionTextProps) {
  const variantMap = {
    small: 'caption-small' as const,
    large: 'caption-large' as const,
  }

  return (
    <BrandTypography
      variant={variantMap[size]}
      color={color}
      className={className}
    >
      {children}
    </BrandTypography>
  )
}

// Typography scale showcase component (for design system documentation)
export function TypographyScale() {
  const variants: TypographyVariant[] = [
    'display-hero',
    'display-title',
    'display-subtitle',
    'heading-1',
    'heading-2',
    'heading-3',
    'heading-4',
    'heading-5',
    'heading-6',
    'body-large',
    'body-base',
    'body-small',
    'caption-large',
    'caption-small',
    'label-large',
    'label-small',
  ]

  return (
    <div className="space-y-8 p-8 bg-c9n-blue-dark">
      <BrandTypography variant="heading-1" color="gradient-primary">
        Typography Scale
      </BrandTypography>
      
      {variants.map((variant) => (
        <div key={variant} className="space-y-2">
          <CaptionText color="accent-teal">
            {variant}
          </CaptionText>
          <BrandTypography variant={variant}>
            The quick brown fox jumps over the lazy dog
          </BrandTypography>
        </div>
      ))}
    </div>
  )
}