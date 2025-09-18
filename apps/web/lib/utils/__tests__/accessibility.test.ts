import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateId,
  announceToScreenReader,
  FocusManager,
  HighContrastSupport,
  MotionSupport,
  TouchSupport,
  ScreenReaderSupport,
  KeyboardNavigation,
  AriaUtils
} from '../accessibility'

// Mock DOM methods
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockQuerySelectorAll = vi.fn()
const mockGetElementById = vi.fn()
const mockCreateElement = vi.fn()
const mockGetComputedStyle = vi.fn()

Object.defineProperty(document, 'body', {
  value: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild
  }
})

Object.defineProperty(document, 'querySelectorAll', {
  value: mockQuerySelectorAll
})

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById
})

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
})

Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle
})

describe('Accessibility Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test')
      const id2 = generateId('test')
      
      expect(id1).toMatch(/^test-/)
      expect(id2).toMatch(/^test-/)
      expect(id1).not.toBe(id2)
    })

    it('should handle different prefixes', () => {
      const emailId = generateId('email')
      const passwordId = generateId('password')
      
      expect(emailId).toMatch(/^email-/)
      expect(passwordId).toMatch(/^password-/)
    })
  })

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      const mockElement = {
        setAttribute: vi.fn(),
        textContent: '',
        className: ''
      }
      mockCreateElement.mockReturnValue(mockElement)
    })

    it('should create announcement element with correct attributes', () => {
      announceToScreenReader('Test message')

      expect(mockCreateElement).toHaveBeenCalledWith('div')
      expect(mockAppendChild).toHaveBeenCalled()
    })

    it('should support different priority levels', () => {
      const mockElement = {
        setAttribute: vi.fn(),
        textContent: '',
        className: ''
      }
      mockCreateElement.mockReturnValue(mockElement)

      announceToScreenReader('Urgent message', 'assertive')

      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive')
    })

    it('should remove announcement after timeout', () => {
      vi.useFakeTimers()
      
      announceToScreenReader('Test message')
      
      vi.advanceTimersByTime(1000)
      
      expect(mockRemoveChild).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('FocusManager', () => {
    describe('getFocusableElements', () => {
      it('should find focusable elements', () => {
        const mockContainer = document.createElement('div')
        const mockElements = [
          document.createElement('button'),
          document.createElement('input')
        ]
        
        mockQuerySelectorAll.mockReturnValue(mockElements)
        
        const result = FocusManager.getFocusableElements(mockContainer)
        
        expect(mockQuerySelectorAll).toHaveBeenCalledWith(
          expect.stringContaining('button:not([disabled])')
        )
        expect(result).toBe(mockElements)
      })
    })

    describe('trapFocus', () => {
      it('should set up focus trap', () => {
        const mockContainer = document.createElement('div')
        const mockButton = document.createElement('button')
        const mockInput = document.createElement('input')
        
        mockButton.focus = vi.fn()
        mockInput.focus = vi.fn()
        
        mockQuerySelectorAll.mockReturnValue([mockButton, mockInput])
        mockContainer.addEventListener = vi.fn()
        
        const cleanup = FocusManager.trapFocus(mockContainer)
        
        expect(mockContainer.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(mockButton.focus).toHaveBeenCalled()
        expect(typeof cleanup).toBe('function')
      })
    })

    describe('moveFocus', () => {
      it('should move focus to next element', () => {
        const mockElements = [
          { focus: vi.fn() },
          { focus: vi.fn() },
          { focus: vi.fn() }
        ]
        
        Object.defineProperty(document, 'activeElement', {
          value: mockElements[0],
          configurable: true
        })
        
        mockQuerySelectorAll.mockReturnValue(mockElements)
        
        FocusManager.moveFocus('next')
        
        expect(mockElements[1].focus).toHaveBeenCalled()
      })

      it('should wrap to first element when at end', () => {
        const mockElements = [
          { focus: vi.fn() },
          { focus: vi.fn() }
        ]
        
        Object.defineProperty(document, 'activeElement', {
          value: mockElements[1],
          configurable: true
        })
        
        mockQuerySelectorAll.mockReturnValue(mockElements)
        
        FocusManager.moveFocus('next')
        
        expect(mockElements[0].focus).toHaveBeenCalled()
      })
    })
  })

  describe('HighContrastSupport', () => {
    describe('isHighContrastMode', () => {
      it('should detect high contrast mode via media query', () => {
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: true })
        })
        
        const result = HighContrastSupport.isHighContrastMode()
        
        expect(result).toBe(true)
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-contrast: high)')
      })

      it('should detect forced colors mode', () => {
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockImplementation(query => ({
            matches: query === '(forced-colors: active)'
          }))
        })
        
        const result = HighContrastSupport.isHighContrastMode()
        
        expect(result).toBe(true)
      })

      it('should use fallback detection method', () => {
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false })
        })
        
        const mockElement = {
          style: {},
          remove: vi.fn()
        }
        
        mockCreateElement.mockReturnValue(mockElement)
        mockGetComputedStyle.mockReturnValue({
          backgroundColor: 'rgb(255, 255, 255)' // Different from set value
        })
        
        const result = HighContrastSupport.isHighContrastMode()
        
        expect(result).toBe(true)
      })
    })

    describe('monitorHighContrast', () => {
      it('should set up media query listeners', () => {
        const mockMediaQuery = {
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
        
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockReturnValue(mockMediaQuery)
        })
        
        const callback = vi.fn()
        const cleanup = HighContrastSupport.monitorHighContrast(callback)
        
        expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
        expect(typeof cleanup).toBe('function')
      })
    })
  })

  describe('MotionSupport', () => {
    describe('prefersReducedMotion', () => {
      it('should detect reduced motion preference', () => {
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: true })
        })
        
        const result = MotionSupport.prefersReducedMotion()
        
        expect(result).toBe(true)
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
      })
    })

    describe('applyReducedMotion', () => {
      it('should add reduce-motion class when preference is set', () => {
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: true })
        })
        
        const mockClassList = {
          add: vi.fn(),
          remove: vi.fn()
        }
        
        Object.defineProperty(document.documentElement, 'classList', {
          value: mockClassList
        })
        
        MotionSupport.applyReducedMotion()
        
        expect(mockClassList.add).toHaveBeenCalledWith('reduce-motion')
      })
    })
  })

  describe('TouchSupport', () => {
    describe('isTouchDevice', () => {
      it('should detect touch support via ontouchstart', () => {
        Object.defineProperty(window, 'ontouchstart', {
          value: true,
          configurable: true
        })
        
        const result = TouchSupport.isTouchDevice()
        
        expect(result).toBe(true)
      })

      it('should detect touch support via maxTouchPoints', () => {
        Object.defineProperty(window, 'ontouchstart', {
          value: undefined,
          configurable: true
        })
        
        Object.defineProperty(navigator, 'maxTouchPoints', {
          value: 5,
          configurable: true
        })
        
        const result = TouchSupport.isTouchDevice()
        
        expect(result).toBe(true)
      })
    })

    describe('validateTouchTarget', () => {
      it('should validate touch target size', () => {
        const mockElement = {
          getBoundingClientRect: vi.fn().mockReturnValue({
            width: 44,
            height: 44
          })
        }
        
        const result = TouchSupport.validateTouchTarget(mockElement as any)
        
        expect(result).toBe(true)
      })

      it('should reject small touch targets', () => {
        const mockElement = {
          getBoundingClientRect: vi.fn().mockReturnValue({
            width: 20,
            height: 20
          })
        }
        
        const result = TouchSupport.validateTouchTarget(mockElement as any)
        
        expect(result).toBe(false)
      })
    })
  })

  describe('ScreenReaderSupport', () => {
    describe('createScreenReaderText', () => {
      it('should create screen reader only element', () => {
        const mockElement = {
          className: '',
          textContent: ''
        }
        
        mockCreateElement.mockReturnValue(mockElement)
        
        const result = ScreenReaderSupport.createScreenReaderText('Test text')
        
        expect(mockCreateElement).toHaveBeenCalledWith('span')
        expect(mockElement.className).toBe('sr-only')
        expect(mockElement.textContent).toBe('Test text')
      })
    })

    describe('updateLiveRegion', () => {
      it('should update existing live region', () => {
        const mockElement = {
          textContent: ''
        }
        
        mockGetElementById.mockReturnValue(mockElement)
        
        ScreenReaderSupport.updateLiveRegion('test-region', 'Test message')
        
        expect(mockElement.textContent).toBe('Test message')
      })

      it('should create new live region if not exists', () => {
        mockGetElementById.mockReturnValue(null)
        
        const mockElement = {
          id: '',
          setAttribute: vi.fn(),
          className: '',
          textContent: ''
        }
        
        mockCreateElement.mockReturnValue(mockElement)
        
        ScreenReaderSupport.updateLiveRegion('test-region', 'Test message')
        
        expect(mockCreateElement).toHaveBeenCalledWith('div')
        expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite')
        expect(mockAppendChild).toHaveBeenCalled()
      })
    })

    describe('describeFormError', () => {
      it('should format error description', () => {
        const result = ScreenReaderSupport.describeFormError('email', 'Invalid format')
        
        expect(result).toBe('email field has an error: Invalid format')
      })
    })

    describe('describeFieldRequirements', () => {
      it('should format requirements description', () => {
        const requirements = ['At least 8 characters', 'One uppercase letter']
        const result = ScreenReaderSupport.describeFieldRequirements(requirements)
        
        expect(result).toBe('This field requires: At least 8 characters, One uppercase letter')
      })

      it('should return empty string for no requirements', () => {
        const result = ScreenReaderSupport.describeFieldRequirements([])
        
        expect(result).toBe('')
      })
    })
  })

  describe('KeyboardNavigation', () => {
    describe('handleArrowNavigation', () => {
      it('should handle vertical arrow navigation', () => {
        const mockElements = [
          { focus: vi.fn() },
          { focus: vi.fn() },
          { focus: vi.fn() }
        ]
        
        const mockEvent = {
          key: 'ArrowDown',
          preventDefault: vi.fn()
        }
        
        const result = KeyboardNavigation.handleArrowNavigation(
          mockEvent as any,
          mockElements as any,
          0,
          'vertical'
        )
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(mockElements[1].focus).toHaveBeenCalled()
        expect(result).toBe(1)
      })

      it('should wrap to beginning at end', () => {
        const mockElements = [
          { focus: vi.fn() },
          { focus: vi.fn() }
        ]
        
        const mockEvent = {
          key: 'ArrowDown',
          preventDefault: vi.fn()
        }
        
        const result = KeyboardNavigation.handleArrowNavigation(
          mockEvent as any,
          mockElements as any,
          1,
          'vertical'
        )
        
        expect(mockElements[0].focus).toHaveBeenCalled()
        expect(result).toBe(0)
      })

      it('should handle Home and End keys', () => {
        const mockElements = [
          { focus: vi.fn() },
          { focus: vi.fn() },
          { focus: vi.fn() }
        ]
        
        const homeEvent = {
          key: 'Home',
          preventDefault: vi.fn()
        }
        
        const endEvent = {
          key: 'End',
          preventDefault: vi.fn()
        }
        
        KeyboardNavigation.handleArrowNavigation(homeEvent as any, mockElements as any, 1)
        expect(mockElements[0].focus).toHaveBeenCalled()
        
        KeyboardNavigation.handleArrowNavigation(endEvent as any, mockElements as any, 1)
        expect(mockElements[2].focus).toHaveBeenCalled()
      })
    })

    describe('handleActivation', () => {
      it('should handle Enter key activation', () => {
        const callback = vi.fn()
        const mockEvent = {
          key: 'Enter',
          preventDefault: vi.fn()
        }
        
        KeyboardNavigation.handleActivation(mockEvent as any, callback)
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(callback).toHaveBeenCalled()
      })

      it('should handle Space key activation', () => {
        const callback = vi.fn()
        const mockEvent = {
          key: ' ',
          preventDefault: vi.fn()
        }
        
        KeyboardNavigation.handleActivation(mockEvent as any, callback)
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(callback).toHaveBeenCalled()
      })
    })

    describe('handleEscape', () => {
      it('should handle Escape key', () => {
        const callback = vi.fn()
        const mockEvent = {
          key: 'Escape',
          preventDefault: vi.fn()
        }
        
        KeyboardNavigation.handleEscape(mockEvent as any, callback)
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(callback).toHaveBeenCalled()
      })
    })
  })

  describe('AriaUtils', () => {
    describe('linkElements', () => {
      it('should link elements with ARIA relationship', () => {
        const mockControl = {
          getAttribute: vi.fn().mockReturnValue(null),
          setAttribute: vi.fn()
        }
        
        const mockTarget = {}
        
        mockGetElementById.mockImplementation(id => {
          if (id === 'control') return mockControl
          if (id === 'target') return mockTarget
          return null
        })
        
        AriaUtils.linkElements('control', 'target', 'describedby')
        
        expect(mockControl.setAttribute).toHaveBeenCalledWith('aria-describedby', 'target')
      })

      it('should append to existing ARIA relationship', () => {
        const mockControl = {
          getAttribute: vi.fn().mockReturnValue('existing-id'),
          setAttribute: vi.fn()
        }
        
        const mockTarget = {}
        
        mockGetElementById.mockImplementation(id => {
          if (id === 'control') return mockControl
          if (id === 'target') return mockTarget
          return null
        })
        
        AriaUtils.linkElements('control', 'target', 'describedby')
        
        expect(mockControl.setAttribute).toHaveBeenCalledWith('aria-describedby', 'existing-id target')
      })
    })

    describe('updateState', () => {
      it('should update ARIA state', () => {
        const mockElement = {
          setAttribute: vi.fn()
        }
        
        mockGetElementById.mockReturnValue(mockElement)
        
        AriaUtils.updateState('element-id', 'expanded', true)
        
        expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-expanded', 'true')
      })
    })

    describe('setProperty', () => {
      it('should set ARIA property', () => {
        const mockElement = {
          setAttribute: vi.fn()
        }
        
        mockGetElementById.mockReturnValue(mockElement)
        
        AriaUtils.setProperty('element-id', 'label', 'Test label')
        
        expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-label', 'Test label')
      })
    })
  })
})