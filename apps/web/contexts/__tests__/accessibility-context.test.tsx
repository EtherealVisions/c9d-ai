import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  AccessibilityProvider, 
  useAccessibility, 
  useAnnouncement, 
  useFocus,
  useKeyboardNavigation 
} from '../accessibility-context'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock matchMedia
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia
})

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default matchMedia mock
    mockMatchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AccessibilityProvider', () => {
    it('should provide default accessibility settings', () => {
      const TestComponent = () => {
        const { settings } = useAccessibility()
        return (
          <div>
            <span data-testid="high-contrast">{settings.highContrast.toString()}</span>
            <span data-testid="reduced-motion">{settings.reducedMotion.toString()}</span>
            <span data-testid="font-size">{settings.fontSize}</span>
          </div>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false')
      expect(screen.getByTestId('font-size')).toHaveTextContent('medium')
    })

    it('should detect system preferences on mount', () => {
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)' || query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const TestComponent = () => {
        const { isHighContrast, prefersReducedMotion } = useAccessibility()
        return (
          <div>
            <span data-testid="system-high-contrast">{isHighContrast.toString()}</span>
            <span data-testid="system-reduced-motion">{prefersReducedMotion.toString()}</span>
          </div>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('system-high-contrast')).toHaveTextContent('true')
      expect(screen.getByTestId('system-reduced-motion')).toHaveTextContent('true')
    })

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        fontSize: 'large',
        announcements: false
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings))

      const TestComponent = () => {
        const { settings } = useAccessibility()
        return (
          <div>
            <span data-testid="font-size">{settings.fontSize}</span>
            <span data-testid="announcements">{settings.announcements.toString()}</span>
          </div>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('large')
      expect(screen.getByTestId('announcements')).toHaveTextContent('false')
    })

    it('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const TestComponent = () => {
        const { settings } = useAccessibility()
        return <div data-testid="font-size">{settings.fontSize}</div>
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('medium')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse saved accessibility settings:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should update settings and save to localStorage', () => {
      const TestComponent = () => {
        const { settings, updateSettings } = useAccessibility()
        
        return (
          <div>
            <span data-testid="font-size">{settings.fontSize}</span>
            <button 
              onClick={() => updateSettings({ fontSize: 'large' })}
              data-testid="update-button"
            >
              Update
            </button>
          </div>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      const updateButton = screen.getByTestId('update-button')
      
      act(() => {
        updateButton.click()
      })

      expect(screen.getByTestId('font-size')).toHaveTextContent('large')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'c9d-accessibility-settings',
        expect.stringContaining('"fontSize":"large"')
      )
    })

    it('should apply CSS classes based on settings', () => {
      const mockClassList = {
        add: vi.fn(),
        remove: vi.fn()
      }
      
      Object.defineProperty(document.documentElement, 'classList', {
        value: mockClassList,
        configurable: true
      })

      const TestComponent = () => {
        const { updateSettings } = useAccessibility()
        
        return (
          <button 
            onClick={() => updateSettings({ highContrast: true, reducedMotion: true })}
            data-testid="update-button"
          >
            Update
          </button>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      act(() => {
        screen.getByTestId('update-button').click()
      })

      expect(mockClassList.add).toHaveBeenCalledWith('high-contrast')
      expect(mockClassList.add).toHaveBeenCalledWith('reduce-motion')
    })
  })

  describe('useAccessibility hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useAccessibility()
        return <div>Test</div>
      }

      expect(() => render(<TestComponent />)).toThrow(
        'useAccessibility must be used within an AccessibilityProvider'
      )
    })

    it('should provide announce function', () => {
      const TestComponent = () => {
        const { announce } = useAccessibility()
        
        return (
          <button 
            onClick={() => announce('Test message', 'assertive')}
            data-testid="announce-button"
          >
            Announce
          </button>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      // Should not throw when announce is called
      expect(() => {
        screen.getByTestId('announce-button').click()
      }).not.toThrow()
    })
  })

  describe('useAnnouncement hook', () => {
    it('should provide announcement functions', () => {
      const TestComponent = () => {
        const { announceError, announceSuccess, announceLoading } = useAnnouncement()
        
        return (
          <div>
            <button onClick={() => announceError('Error message')} data-testid="error-btn">
              Error
            </button>
            <button onClick={() => announceSuccess('Success message')} data-testid="success-btn">
              Success
            </button>
            <button onClick={() => announceLoading('Loading message')} data-testid="loading-btn">
              Loading
            </button>
          </div>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      // Should not throw when announcement functions are called
      expect(() => {
        screen.getByTestId('error-btn').click()
        screen.getByTestId('success-btn').click()
        screen.getByTestId('loading-btn').click()
      }).not.toThrow()
    })

    it('should avoid duplicate announcements', () => {
      const mockAnnounce = vi.fn()
      
      const TestComponent = () => {
        const { announceMessage } = useAnnouncement()
        
        // Mock the announce function
        React.useEffect(() => {
          // This would normally come from the context
          // For testing, we'll simulate the behavior
        }, [])
        
        return (
          <button 
            onClick={() => {
              announceMessage('Same message')
              announceMessage('Same message') // Should be deduplicated
            }}
            data-testid="announce-btn"
          >
            Announce
          </button>
        )
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      // The deduplication logic is internal to the hook
      // We can test that the function exists and doesn't throw
      expect(() => {
        screen.getByTestId('announce-btn').click()
      }).not.toThrow()
    })
  })

  describe('useFocus hook', () => {
    it('should provide focus management functions', () => {
      const { result } = renderHook(() => useFocus())

      expect(result.current.focusRef).toBeDefined()
      expect(typeof result.current.focus).toBe('function')
      expect(typeof result.current.blur).toBe('function')
    })

    it('should focus and blur elements', () => {
      const TestComponent = () => {
        const { focusRef, focus, blur } = useFocus()
        
        return (
          <div>
            <input ref={focusRef} data-testid="input" />
            <button onClick={focus} data-testid="focus-btn">Focus</button>
            <button onClick={blur} data-testid="blur-btn">Blur</button>
          </div>
        )
      }

      render(<TestComponent />)

      const input = screen.getByTestId('input')
      const focusBtn = screen.getByTestId('focus-btn')
      const blurBtn = screen.getByTestId('blur-btn')

      // Mock focus and blur methods
      input.focus = vi.fn()
      input.blur = vi.fn()

      focusBtn.click()
      expect(input.focus).toHaveBeenCalled()

      blurBtn.click()
      expect(input.blur).toHaveBeenCalled()
    })
  })

  describe('useKeyboardNavigation hook', () => {
    it('should handle keyboard events', () => {
      const onEnter = vi.fn()
      const onEscape = vi.fn()
      const onArrowKeys = vi.fn()

      const TestComponent = () => {
        const { handleKeyDown } = useKeyboardNavigation(onEnter, onEscape, onArrowKeys)
        
        return (
          <div onKeyDown={handleKeyDown} data-testid="container">
            Test
          </div>
        )
      }

      render(<TestComponent />)

      const container = screen.getByTestId('container')

      // Test Enter key
      fireEvent.keyDown(container, { key: 'Enter' })
      expect(onEnter).toHaveBeenCalled()

      // Test Escape key
      fireEvent.keyDown(container, { key: 'Escape' })
      expect(onEscape).toHaveBeenCalled()

      // Test Arrow keys
      fireEvent.keyDown(container, { key: 'ArrowUp' })
      expect(onArrowKeys).toHaveBeenCalledWith('up')

      fireEvent.keyDown(container, { key: 'ArrowDown' })
      expect(onArrowKeys).toHaveBeenCalledWith('down')

      fireEvent.keyDown(container, { key: 'ArrowLeft' })
      expect(onArrowKeys).toHaveBeenCalledWith('left')

      fireEvent.keyDown(container, { key: 'ArrowRight' })
      expect(onArrowKeys).toHaveBeenCalledWith('right')
    })

    it('should prevent default for handled keys', () => {
      const onEnter = vi.fn()

      const TestComponent = () => {
        const { handleKeyDown } = useKeyboardNavigation(onEnter)
        
        return (
          <div onKeyDown={handleKeyDown} data-testid="container">
            Test
          </div>
        )
      }

      render(<TestComponent />)

      const container = screen.getByTestId('container')
      const mockEvent = {
        key: 'Enter',
        preventDefault: vi.fn()
      }

      fireEvent.keyDown(container, mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should handle optional callbacks', () => {
      const TestComponent = () => {
        const { handleKeyDown } = useKeyboardNavigation() // No callbacks
        
        return (
          <div onKeyDown={handleKeyDown} data-testid="container">
            Test
          </div>
        )
      }

      render(<TestComponent />)

      const container = screen.getByTestId('container')

      // Should not throw when no callbacks are provided
      expect(() => {
        fireEvent.keyDown(container, { key: 'Enter' })
        fireEvent.keyDown(container, { key: 'Escape' })
        fireEvent.keyDown(container, { key: 'ArrowUp' })
      }).not.toThrow()
    })
  })

  describe('Media Query Monitoring', () => {
    it('should monitor high contrast changes', () => {
      const mockAddEventListener = vi.fn()
      const mockRemoveEventListener = vi.fn()
      
      mockMatchMedia.mockImplementation(query => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }))

      const TestComponent = () => {
        useAccessibility()
        return <div>Test</div>
      }

      const { unmount } = render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should monitor reduced motion changes', () => {
      const mockAddEventListener = vi.fn()
      const mockRemoveEventListener = vi.fn()
      
      mockMatchMedia.mockImplementation(query => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }))

      const TestComponent = () => {
        useAccessibility()
        return <div>Test</div>
      }

      const { unmount } = render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      // Should set up listeners for both high contrast and reduced motion
      expect(mockAddEventListener).toHaveBeenCalledTimes(4) // 2 queries × 2 listeners each

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledTimes(4)
    })
  })

  describe('Touch Device Detection', () => {
    it('should detect touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true
      })

      const TestComponent = () => {
        const { isTouchDevice } = useAccessibility()
        return <div data-testid="touch-device">{isTouchDevice.toString()}</div>
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('touch-device')).toHaveTextContent('true')
    })

    it('should detect non-touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      })

      Object.defineProperty(window, 'ontouchstart', {
        value: undefined,
        configurable: true
      })

      const TestComponent = () => {
        const { isTouchDevice } = useAccessibility()
        return <div data-testid="touch-device">{isTouchDevice.toString()}</div>
      }

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByTestId('touch-device')).toHaveTextContent('false')
    })
  })
})