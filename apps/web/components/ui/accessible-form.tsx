'use client'

import React, { forwardRef, useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAccessibility, useAnnouncement } from '@/contexts/accessibility-context'
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react'

// Accessible Label Component
interface AccessibleLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  children: React.ReactNode
}

export const AccessibleLabel = forwardRef<HTMLLabelElement, AccessibleLabelProps>(
  ({ required, children, className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-foreground mb-2',
          'focus-within:text-primary',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
    )
  }
)
AccessibleLabel.displayName = 'AccessibleLabel'

// Accessible Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  showPasswordToggle?: boolean
  required?: boolean
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    label, 
    error, 
    success, 
    hint, 
    showPasswordToggle, 
    required, 
    type = 'text',
    className,
    id,
    ...props 
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const successId = `${inputId}-success`
    const hintId = `${inputId}-hint`
    
    const [showPassword, setShowPassword] = useState(false)
    const { isTouchDevice } = useAccessibility()
    const { announceError, announceSuccess } = useAnnouncement()

    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type

    // Announce errors and success messages
    React.useEffect(() => {
      if (error) {
        announceError(error)
      }
    }, [error, announceError])

    React.useEffect(() => {
      if (success) {
        announceSuccess(success)
      }
    }, [success, announceSuccess])

    // Build aria-describedby
    const describedBy = [
      hint && hintId,
      error && errorId,
      success && successId
    ].filter(Boolean).join(' ')

    return (
      <div className="space-y-2">
        {label && (
          <AccessibleLabel htmlFor={inputId} required={required}>
            {label}
          </AccessibleLabel>
        )}
        
        {hint && (
          <div 
            id={hintId}
            className="text-sm text-muted-foreground flex items-start gap-2"
            role="note"
          >
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{hint}</span>
          </div>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
              'text-sm ring-offset-background file:border-0 file:bg-transparent',
              'file:text-sm file:font-medium placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              // Touch device enhancements
              isTouchDevice && 'min-h-[44px] text-base', // Prevent zoom on iOS
              // Error state
              error && 'border-destructive focus-visible:ring-destructive',
              // Success state
              success && 'border-green-500 focus-visible:ring-green-500',
              // Password field padding
              showPasswordToggle && 'pr-10',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy || undefined}
            aria-required={required}
            {...props}
          />

          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              className={cn(
                'absolute right-0 top-0 h-full px-3 py-2',
                'text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'focus-visible:ring-offset-2 rounded-md',
                // Touch device enhancements
                isTouchDevice && 'min-w-[44px] min-h-[44px]'
              )}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {error && (
          <div 
            id={errorId}
            className="text-sm text-destructive flex items-start gap-2"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div 
            id={successId}
            className="text-sm text-green-600 flex items-start gap-2"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
      </div>
    )
  }
)
AccessibleInput.displayName = 'AccessibleInput'

// Accessible Button Component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  loadingText?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    variant = 'default', 
    size = 'default', 
    loading, 
    loadingText = 'Loading...',
    children,
    disabled,
    className,
    ...props 
  }, ref) => {
    const { isTouchDevice } = useAccessibility()

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium',
          'ring-offset-background transition-colors focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Touch device enhancements
          isTouchDevice && 'min-h-[44px] min-w-[44px]',
          // Variants
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline': variant === 'link'
          },
          // Sizes
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10': size === 'icon'
          },
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-describedby={loading ? 'loading-description' : undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <div 
              className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
              aria-hidden="true"
            />
            {loadingText}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
AccessibleButton.displayName = 'AccessibleButton'

// Accessible Checkbox Component
interface AccessibleCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
  error?: string
}

export const AccessibleCheckbox = forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const generatedId = useId()
    const checkboxId = id || generatedId
    const descriptionId = `${checkboxId}-description`
    const errorId = `${checkboxId}-error`
    
    const { isTouchDevice } = useAccessibility()

    const describedBy = [
      description && descriptionId,
      error && errorId
    ].filter(Boolean).join(' ')

    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <div className="relative">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              className={cn(
                'h-4 w-4 rounded border-gray-300 text-primary',
                'focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                // Touch device enhancements
                isTouchDevice && 'h-5 w-5',
                // Error state
                error && 'border-destructive',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={describedBy || undefined}
              {...props}
            />
          </div>
          
          <div className="flex-1">
            <label 
              htmlFor={checkboxId}
              className={cn(
                'text-sm font-medium leading-none cursor-pointer',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                // Touch device enhancements
                isTouchDevice && 'min-h-[44px] flex items-center'
              )}
            >
              {label}
            </label>
            
            {description && (
              <p 
                id={descriptionId}
                className="text-sm text-muted-foreground mt-1"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div 
            id={errorId}
            className="text-sm text-destructive flex items-start gap-2"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }
)
AccessibleCheckbox.displayName = 'AccessibleCheckbox'

// Accessible Form Group Component
interface AccessibleFormGroupProps {
  children: React.ReactNode
  className?: string
}

export function AccessibleFormGroup({ children, className }: AccessibleFormGroupProps) {
  return (
    <div className={cn('space-y-4', className)} role="group">
      {children}
    </div>
  )
}

// Skip Link Component
interface SkipLinkProps {
  href: string
  children: React.ReactNode
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'absolute -top-40 left-6 z-50 bg-primary text-primary-foreground',
        'px-4 py-2 rounded-md font-medium transition-all duration-200',
        'focus:top-6 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      {children}
    </a>
  )
}

// Live Region Component for Announcements
interface LiveRegionProps {
  children?: React.ReactNode
  priority?: 'polite' | 'assertive'
  atomic?: boolean
}

export function LiveRegion({ children, priority = 'polite', atomic = true }: LiveRegionProps) {
  return (
    <div
      className="sr-only"
      aria-live={priority}
      aria-atomic={atomic}
      role="status"
    >
      {children}
    </div>
  )
}