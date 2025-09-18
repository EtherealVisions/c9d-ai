'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  HighContrastSupport, 
  MotionSupport, 
  TouchSupport,
  announceToScreenReader 
} from '@/lib/utils/accessibility'

interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
  isTouchDevice: boolean
  fontSize: 'small' | 'medium' | 'large'
  announcements: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (updates: Partial<AccessibilitySettings>) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  isHighContrast: boolean
  prefersReducedMotion: boolean
  isTouchDevice: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    isTouchDevice: false,
    fontSize: 'medium',
    announcements: true
  })

  const [isHighContrast, setIsHighContrast] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Initialize accessibility settings
    const initializeAccessibility = () => {
      // Detect system preferences
      const highContrast = HighContrastSupport.isHighContrastMode()
      const reducedMotion = MotionSupport.prefersReducedMotion()
      const touchDevice = TouchSupport.isTouchDevice()

      setIsHighContrast(highContrast)
      setPrefersReducedMotion(reducedMotion)
      setIsTouchDevice(touchDevice)

      setSettings(prev => ({
        ...prev,
        highContrast,
        reducedMotion,
        isTouchDevice: touchDevice
      }))

      // Apply initial styles
      if (highContrast) {
        HighContrastSupport.applyHighContrastStyles()
      }
      if (reducedMotion) {
        MotionSupport.applyReducedMotion()
      }

      // Load saved preferences
      const savedSettings = localStorage.getItem('c9d-accessibility-settings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings(prev => ({ ...prev, ...parsed }))
        } catch (error) {
          console.warn('Failed to parse saved accessibility settings:', error)
        }
      }
    }

    initializeAccessibility()

    // Monitor for system preference changes
    const cleanupHighContrast = HighContrastSupport.monitorHighContrast((isHigh) => {
      setIsHighContrast(isHigh)
      setSettings(prev => ({ ...prev, highContrast: isHigh }))
    })

    const cleanupReducedMotion = MotionSupport.monitorReducedMotion((isReduced) => {
      setPrefersReducedMotion(isReduced)
      setSettings(prev => ({ ...prev, reducedMotion: isReduced }))
    })

    return () => {
      cleanupHighContrast()
      cleanupReducedMotion()
    }
  }, [])

  // Apply settings when they change
  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('c9d-accessibility-settings', JSON.stringify(settings))

    // Apply font size
    document.documentElement.setAttribute('data-font-size', settings.fontSize)

    // Apply high contrast if manually enabled
    if (settings.highContrast && !isHighContrast) {
      document.documentElement.classList.add('high-contrast')
    } else if (!settings.highContrast && !isHighContrast) {
      document.documentElement.classList.remove('high-contrast')
    }

    // Apply reduced motion if manually enabled
    if (settings.reducedMotion && !prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else if (!settings.reducedMotion && !prefersReducedMotion) {
      document.documentElement.classList.remove('reduce-motion')
    }

    // Apply touch device styles
    if (settings.isTouchDevice) {
      document.documentElement.classList.add('touch-device')
    } else {
      document.documentElement.classList.remove('touch-device')
    }
  }, [settings, isHighContrast, prefersReducedMotion])

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.announcements) {
      announceToScreenReader(message, priority)
    }
  }

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    announce,
    isHighContrast,
    prefersReducedMotion,
    isTouchDevice
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

/**
 * Hook for managing focus
 */
export function useFocus() {
  const focusRef = React.useRef<HTMLElement>(null)

  const focus = () => {
    if (focusRef.current) {
      focusRef.current.focus()
    }
  }

  const blur = () => {
    if (focusRef.current) {
      focusRef.current.blur()
    }
  }

  return { focusRef, focus, blur }
}

/**
 * Hook for managing ARIA announcements
 */
export function useAnnouncement() {
  const { announce } = useAccessibility()
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('')

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Avoid duplicate announcements
    if (message !== lastAnnouncement) {
      announce(message, priority)
      setLastAnnouncement(message)
    }
  }

  const announceError = (error: string) => {
    announceMessage(`Error: ${error}`, 'assertive')
  }

  const announceSuccess = (message: string) => {
    announceMessage(`Success: ${message}`, 'polite')
  }

  const announceLoading = (message: string = 'Loading') => {
    announceMessage(message, 'polite')
  }

  return {
    announceMessage,
    announceError,
    announceSuccess,
    announceLoading
  }
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault()
          onEnter()
        }
        break
      
      case 'Escape':
        if (onEscape) {
          event.preventDefault()
          onEscape()
        }
        break
      
      case 'ArrowUp':
        if (onArrowKeys) {
          event.preventDefault()
          onArrowKeys('up')
        }
        break
      
      case 'ArrowDown':
        if (onArrowKeys) {
          event.preventDefault()
          onArrowKeys('down')
        }
        break
      
      case 'ArrowLeft':
        if (onArrowKeys) {
          event.preventDefault()
          onArrowKeys('left')
        }
        break
      
      case 'ArrowRight':
        if (onArrowKeys) {
          event.preventDefault()
          onArrowKeys('right')
        }
        break
    }
  }

  return { handleKeyDown }
}