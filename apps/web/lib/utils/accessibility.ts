/**
 * Accessibility utilities for authentication components
 * Provides WCAG 2.1 AA compliant features and screen reader support
 */

/**
 * Generates unique IDs for form elements and ARIA relationships
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Announces messages to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Manages focus for keyboard navigation
 */
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ')

  /**
   * Gets all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors))
  }

  /**
   * Traps focus within a container (for modals, forms)
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    firstElement?.focus()

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }

  /**
   * Moves focus to next/previous element
   */
  static moveFocus(direction: 'next' | 'previous', container?: HTMLElement): void {
    const activeElement = document.activeElement as HTMLElement
    const focusContainer = container || document.body
    const focusableElements = this.getFocusableElements(focusContainer)
    
    const currentIndex = focusableElements.indexOf(activeElement)
    let nextIndex: number

    if (direction === 'next') {
      nextIndex = currentIndex + 1 >= focusableElements.length ? 0 : currentIndex + 1
    } else {
      nextIndex = currentIndex - 1 < 0 ? focusableElements.length - 1 : currentIndex - 1
    }

    focusableElements[nextIndex]?.focus()
  }
}

/**
 * High contrast mode detection and support
 */
export class HighContrastSupport {
  /**
   * Detects if high contrast mode is enabled
   */
  static isHighContrastMode(): boolean {
    // Check for Windows high contrast mode
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return true
    }

    // Check for forced colors (Windows high contrast)
    if (window.matchMedia('(forced-colors: active)').matches) {
      return true
    }

    // Fallback detection method
    const testElement = document.createElement('div')
    testElement.style.backgroundColor = 'rgb(31, 31, 31)'
    testElement.style.color = 'rgb(255, 255, 255)'
    document.body.appendChild(testElement)
    
    const computedStyle = window.getComputedStyle(testElement)
    const isHighContrast = computedStyle.backgroundColor !== 'rgb(31, 31, 31)'
    
    document.body.removeChild(testElement)
    return isHighContrast
  }

  /**
   * Applies high contrast styles
   */
  static applyHighContrastStyles(): void {
    if (this.isHighContrastMode()) {
      document.documentElement.classList.add('high-contrast')
    }
  }

  /**
   * Monitors for high contrast mode changes
   */
  static monitorHighContrast(callback: (isHighContrast: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)')
    
    const handleChange = () => {
      const isHighContrast = mediaQuery.matches || forcedColorsQuery.matches
      callback(isHighContrast)
      
      if (isHighContrast) {
        document.documentElement.classList.add('high-contrast')
      } else {
        document.documentElement.classList.remove('high-contrast')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    forcedColorsQuery.addEventListener('change', handleChange)
    
    // Initial check
    handleChange()

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      forcedColorsQuery.removeEventListener('change', handleChange)
    }
  }
}

/**
 * Reduced motion support
 */
export class MotionSupport {
  /**
   * Checks if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * Applies reduced motion styles
   */
  static applyReducedMotion(): void {
    if (this.prefersReducedMotion()) {
      document.documentElement.classList.add('reduce-motion')
    }
  }

  /**
   * Monitors for reduced motion preference changes
   */
  static monitorReducedMotion(callback: (prefersReduced: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = () => {
      const prefersReduced = mediaQuery.matches
      callback(prefersReduced)
      
      if (prefersReduced) {
        document.documentElement.classList.add('reduce-motion')
      } else {
        document.documentElement.classList.remove('reduce-motion')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    // Initial check
    handleChange()

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }
}

/**
 * Touch and mobile accessibility support
 */
export class TouchSupport {
  /**
   * Detects if device supports touch
   */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  /**
   * Gets recommended touch target size (minimum 44px)
   */
  static getMinTouchTargetSize(): number {
    return 44 // WCAG AA minimum
  }

  /**
   * Validates touch target size
   */
  static validateTouchTarget(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    const minSize = this.getMinTouchTargetSize()
    return rect.width >= minSize && rect.height >= minSize
  }

  /**
   * Adds touch-friendly spacing to elements
   */
  static addTouchSpacing(element: HTMLElement): void {
    if (this.isTouchDevice()) {
      element.classList.add('touch-target')
    }
  }
}

/**
 * Screen reader utilities
 */
export class ScreenReaderSupport {
  /**
   * Creates visually hidden text for screen readers
   */
  static createScreenReaderText(text: string): HTMLSpanElement {
    const span = document.createElement('span')
    span.className = 'sr-only'
    span.textContent = text
    return span
  }

  /**
   * Updates screen reader announcements
   */
  static updateLiveRegion(regionId: string, message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    let region = document.getElementById(regionId)
    
    if (!region) {
      region = document.createElement('div')
      region.id = regionId
      region.setAttribute('aria-live', priority)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
    }
    
    region.textContent = message
  }

  /**
   * Describes form validation errors for screen readers
   */
  static describeFormError(fieldId: string, errorMessage: string): string {
    return `${fieldId} field has an error: ${errorMessage}`
  }

  /**
   * Describes form field requirements
   */
  static describeFieldRequirements(requirements: string[]): string {
    if (requirements.length === 0) return ''
    
    const requirementText = requirements.join(', ')
    return `This field requires: ${requirementText}`
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  /**
   * Handles arrow key navigation in lists/grids
   */
  static handleArrowNavigation(
    event: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
  ): number {
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1
        }
        break
      
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0
        }
        break
      
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1
        }
        break
      
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0
        }
        break
      
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      
      case 'End':
        event.preventDefault()
        newIndex = elements.length - 1
        break
    }

    if (newIndex !== currentIndex) {
      elements[newIndex]?.focus()
    }

    return newIndex
  }

  /**
   * Handles Enter and Space key activation
   */
  static handleActivation(event: KeyboardEvent, callback: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  }

  /**
   * Handles Escape key for closing modals/dropdowns
   */
  static handleEscape(event: KeyboardEvent, callback: () => void): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      callback()
    }
  }
}

/**
 * ARIA utilities
 */
export class AriaUtils {
  /**
   * Sets up ARIA relationships between elements
   */
  static linkElements(controlId: string, targetId: string, relationship: 'describedby' | 'labelledby' | 'controls'): void {
    const control = document.getElementById(controlId)
    const target = document.getElementById(targetId)
    
    if (control && target) {
      const attribute = `aria-${relationship}`
      const existingValue = control.getAttribute(attribute)
      
      if (existingValue) {
        const ids = existingValue.split(' ')
        if (!ids.includes(targetId)) {
          control.setAttribute(attribute, `${existingValue} ${targetId}`)
        }
      } else {
        control.setAttribute(attribute, targetId)
      }
    }
  }

  /**
   * Updates ARIA states
   */
  static updateState(elementId: string, state: 'expanded' | 'selected' | 'checked' | 'pressed', value: boolean): void {
    const element = document.getElementById(elementId)
    if (element) {
      element.setAttribute(`aria-${state}`, value.toString())
    }
  }

  /**
   * Sets ARIA properties
   */
  static setProperty(elementId: string, property: string, value: string): void {
    const element = document.getElementById(elementId)
    if (element) {
      element.setAttribute(`aria-${property}`, value)
    }
  }
}