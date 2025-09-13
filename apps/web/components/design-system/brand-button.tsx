/**
 * Brand Button Component
 * 
 * A comprehensive button component that follows brand guidelines
 * and provides consistent styling across the application.
 */

'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { BrandAnimation } from './brand-animation'
import { BrandGradient } from './brand-gradient'
import { 
  ComponentVariant, 
  ComponentSize, 
  ComponentState,
  BrandStyleGenerator 
} from '@/lib/design-system/brand-guidelines'

export interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ComponentVariant
  /** Button size */
  size?: ComponentSize
  /** Button state */
  state?: ComponentState
  /** Whether to use gradient background */
  gradient?: boolean
  /** Whether to show glow effect */
  glow?: boolean
  /** Animation type */
  animation?: 'none' | 'pulse' | 'glow' | 'float' | 'hover'
  /** Whether button is loading */
  loading?: boolean
  /** Icon to display before text */
  leftIcon?: React.ReactNode
  /** Icon to display after text */
  rightIcon?: React.ReactNode
  /** Whether button should take full width */
  fullWidth?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child content */
  children: React.ReactNode
}

const sizeClasses: Record<ComponentSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
  '2xl': 'px-10 py-5 text-2xl',
}

const variantClasses: Record<ComponentVariant, string> = {
  primary: 'bg-purple-pink-gradient text-white border-transparent',
  secondary: 'bg-blue-teal-gradient text-white border-transparent',
  accent: 'bg-yellow-lime-gradient text-c9n-blue-dark border-transparent',
  neutral: 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600',
}

const glowClasses: Record<ComponentVariant, string> = {
  primary: 'shadow-lg shadow-windsurf-pink-hot/25 hover:shadow-windsurf-pink-hot/40',
  secondary: 'shadow-lg shadow-windsurf-blue-electric/25 hover:shadow-windsurf-blue-electric/40',
  accent: 'shadow-lg shadow-windsurf-yellow-bright/25 hover:shadow-windsurf-yellow-bright/40',
  neutral: 'shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40',
}

export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    state = 'default',
    gradient = true,
    glow = false,
    animation = 'hover',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading || state === 'disabled'
    
    const buttonClasses = cn(
      // Base styles
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-c9n-blue-dark',
      
      // Size classes
      sizeClasses[size],
      
      // Variant classes
      gradient ? variantClasses[variant] : 'bg-transparent border',
      
      // Glow effects
      glow && glowClasses[variant],
      
      // State classes
      {
        'opacity-50 cursor-not-allowed': isDisabled,
        'hover:scale-105 active:scale-95': !isDisabled && animation === 'hover',
        'transform transition-transform': animation !== 'none',
        'w-full': fullWidth,
      },
      
      // Focus ring colors
      {
        'focus:ring-windsurf-pink-hot/50': variant === 'primary',
        'focus:ring-windsurf-blue-electric/50': variant === 'secondary',
        'focus:ring-windsurf-yellow-bright/50': variant === 'accent',
        'focus:ring-gray-500/50': variant === 'neutral',
      },
      
      className
    )

    const buttonContent = (
      <>
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </>
    )

    const button = (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    )

    // Wrap with animation if specified
    if (animation === 'pulse' || animation === 'glow' || animation === 'float') {
      return (
        <BrandAnimation
          type={animation === 'float' ? 'float' : 'glow'}
          trigger="auto"
          repeat={true}
        >
          {button}
        </BrandAnimation>
      )
    }

    return button
  }
)

BrandButton.displayName = 'BrandButton'

// Specialized button variants
export interface CTAButtonProps extends Omit<BrandButtonProps, 'variant'> {
  /** CTA button style */
  ctaStyle?: 'primary' | 'secondary' | 'accent'
}

export function CTAButton({ 
  ctaStyle = 'primary', 
  glow = true, 
  animation = 'hover',
  ...props 
}: CTAButtonProps) {
  return (
    <BrandButton
      variant={ctaStyle}
      glow={glow}
      animation={animation}
      {...props}
    />
  )
}

export interface GhostButtonProps extends Omit<BrandButtonProps, 'variant' | 'gradient'> {
  /** Ghost button color */
  color?: 'primary' | 'secondary' | 'accent' | 'neutral'
}

export function GhostButton({ 
  color = 'primary', 
  className,
  ...props 
}: GhostButtonProps) {
  const ghostClasses = cn(
    'bg-transparent border-2 hover:bg-opacity-10',
    {
      'border-windsurf-pink-hot text-windsurf-pink-hot hover:bg-windsurf-pink-hot': color === 'primary',
      'border-windsurf-blue-electric text-windsurf-blue-electric hover:bg-windsurf-blue-electric': color === 'secondary',
      'border-windsurf-yellow-bright text-windsurf-yellow-bright hover:bg-windsurf-yellow-bright': color === 'accent',
      'border-gray-400 text-gray-400 hover:bg-gray-400': color === 'neutral',
    },
    className
  )

  return (
    <BrandButton
      variant="neutral"
      gradient={false}
      className={ghostClasses}
      {...props}
    />
  )
}

export interface IconButtonProps extends Omit<BrandButtonProps, 'children'> {
  /** Icon to display */
  icon: React.ReactNode
  /** Accessible label */
  'aria-label': string
}

export function IconButton({ 
  icon, 
  size = 'md',
  className,
  ...props 
}: IconButtonProps) {
  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  }

  const buttonSizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4',
    '2xl': 'p-5',
  }

  return (
    <BrandButton
      size={size}
      className={cn(
        'rounded-full aspect-square',
        buttonSizes[size],
        className
      )}
      {...props}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </BrandButton>
  )
}

// Button group component
export interface ButtonGroupProps {
  /** Button group orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Button group size */
  size?: ComponentSize
  /** Additional CSS classes */
  className?: string
  /** Child buttons */
  children: React.ReactNode
}

export function ButtonGroup({
  orientation = 'horizontal',
  size = 'md',
  className,
  children,
}: ButtonGroupProps) {
  const groupClasses = cn(
    'inline-flex',
    {
      'flex-row': orientation === 'horizontal',
      'flex-col': orientation === 'vertical',
    },
    className
  )

  return (
    <div className={groupClasses} role="group">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0
          const isLast = index === React.Children.count(children) - 1
          
          return React.cloneElement(child, {
            ...(child.props as any),
            size,
            className: cn(
              (child.props as any).className,
              {
                // Horizontal group styling
                'rounded-r-none border-r-0': orientation === 'horizontal' && !isLast,
                'rounded-l-none': orientation === 'horizontal' && !isFirst,
                'rounded-none': orientation === 'horizontal' && !isFirst && !isLast,
                
                // Vertical group styling
                'rounded-b-none border-b-0': orientation === 'vertical' && !isLast,
                'rounded-t-none': orientation === 'vertical' && !isFirst,
              }
            ),
          })
        }
        return child
      })}
    </div>
  )
}