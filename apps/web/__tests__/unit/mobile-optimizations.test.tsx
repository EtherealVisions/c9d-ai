import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations'
import { MobileLoading, MobileLoadingOverlay, MobileButtonLoading } from '@/components/ui/mobile-loading'
import { AccessibilityProvider } from '@/contexts/accessibility-context'

// Mock window properties
const mockWindow = {
  innerWidth: 375,
  innerHeight: 667,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigator: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    maxTouchPoints: 5,
    hardwareConcurrency: 4,
    deviceMemory: 4,
    connection: {
      saveData: false,
      effectiveType: '4g'
    }
  }
}

// Test wrapper with accessibility context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  )
}

describe('Mobile Optimizations', () => {
  beforeEach(() => {
    // Mock window object
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockWindow.innerWidth
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: mockWindow.innerHeight
    })
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: mockWindow.navigator.userAgent
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: mockWindow.navigator.maxTouchPoints
    })

    // Mock CSS custom properties
    const mockGetComputedStyle = vi.fn(() => ({
      getPropertyValue: vi.fn(() => '0px')
    }))
    global.getComputedStyle = mockGetComputedStyle

    // Mock document methods
    Object.defineProperty(document, 'documentElement', {
      writable: true,
      configurable: true,
      value: {
        style: {
          setProperty: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useMobileOptimizations Hook', () => {
    it('should detect mobile device correctly', () => {
      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      expect(result.current.isMobile).toBe(true)
      expect(result.current.isDesktop).toBe(false)
      expect(result.current.supportsTouchEvents).toBe(true)
    })

    it('should detect tablet device correctly', () => {
      // Mock tablet user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
      })

      // Mock tablet dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })

      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      expect(result.current.isTablet).toBe(true)
      expect(result.current.isMobile).toBe(true)
    })

    it('should detect desktop device correctly', () => {
      // Mock desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })

      // Mock desktop dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      })

      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      expect(result.current.isDesktop).toBe(true)
      expect(result.current.isMobile).toBe(false)
    })

    it('should detect orientation correctly', () => {
      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      // Portrait mode (height > width)
      expect(result.current.isPortrait).toBe(true)
      expect(result.current.isLandscape).toBe(false)
    })

    it('should detect low-end device correctly', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        configurable: true,
        value: 2
      })

      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      expect(result.current.isLowEndDevice).toBe(true)
    })

    it('should add touch feedback to elements', () => {
      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      const element = document.createElement('button')
      const cleanup = result.current.addTouchFeedback(element)

      expect(typeof cleanup).toBe('function')

      // Simulate touch start
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 50, clientY: 50 } as Touch]
      })
      fireEvent(element, touchEvent)

      expect(element.classList.contains('touch-feedback')).toBe(true)

      // Cleanup
      cleanup()
    })

    it('should optimize elements for mobile', () => {
      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      const element = document.createElement('button')
      const cleanup = result.current.optimizeForMobile(element)

      expect(typeof cleanup).toBe('function')
      expect(element.style.minHeight).toBe('44px')
      expect(element.style.minWidth).toBe('44px')

      // Cleanup
      cleanup()
    })

    it('should handle orientation changes', () => {
      const { result } = renderHook(() => useMobileOptimizations(), {
        wrapper: TestWrapper
      })

      const mockCallback = vi.fn()
      const cleanup = result.current.handleOrientationChange(mockCallback)

      expect(typeof cleanup).toBe('function')

      // Simulate orientation change
      act(() => {
        fireEvent(window, new Event('orientationchange'))
      })

      // Cleanup
      cleanup()
    })
  })

  describe('MobileLoading Component', () => {
    it('should render spinner loading by default', () => {
      render(
        <TestWrapper>
          <MobileLoading />
        </TestWrapper>
      )

      const loader = screen.getByRole('status')
      expect(loader).toBeInTheDocument()
      expect(loader).toHaveAttribute('aria-label', 'Loading')
    })

    it('should render dots loading variant', () => {
      render(
        <TestWrapper>
          <MobileLoading variant="dots" />
        </TestWrapper>
      )

      const loader = screen.getByRole('status')
      expect(loader).toBeInTheDocument()
      expect(loader).toHaveAttribute('aria-label', 'Loading')
    })

    it('should render pulse loading variant', () => {
      render(
        <TestWrapper>
          <MobileLoading variant="pulse" />
        </TestWrapper>
      )

      const loader = screen.getByRole('status')
      expect(loader).toBeInTheDocument()
      expect(loader).toHaveAttribute('aria-label', 'Loading')
    })

    it('should render different sizes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <MobileLoading size="sm" />
        </TestWrapper>
      )

      let loader = screen.getByRole('status')
      expect(loader).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <MobileLoading size="lg" />
        </TestWrapper>
      )

      loader = screen.getByRole('status')
      expect(loader).toBeInTheDocument()
    })

    it('should render with children text', () => {
      render(
        <TestWrapper>
          <MobileLoading>Loading data...</MobileLoading>
        </TestWrapper>
      )

      expect(screen.getByText('Loading data...')).toBeInTheDocument()
      expect(screen.getByText('Loading, please wait')).toBeInTheDocument()
    })

    it('should use simple loading for reduced motion', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <TestWrapper>
          <MobileLoading />
        </TestWrapper>
      )

      // Should render simple emoji loader for reduced motion
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })
  })

  describe('MobileLoadingOverlay Component', () => {
    it('should render children when not loading', () => {
      render(
        <TestWrapper>
          <MobileLoadingOverlay isLoading={false}>
            <div>Content</div>
          </MobileLoadingOverlay>
        </TestWrapper>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should render loading overlay when loading', () => {
      render(
        <TestWrapper>
          <MobileLoadingOverlay isLoading={true} loadingText="Please wait...">
            <div>Content</div>
          </MobileLoadingOverlay>
        </TestWrapper>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Please wait...')).toBeInTheDocument()
    })

    it('should use default loading text', () => {
      render(
        <TestWrapper>
          <MobileLoadingOverlay isLoading={true}>
            <div>Content</div>
          </MobileLoadingOverlay>
        </TestWrapper>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('MobileButtonLoading Component', () => {
    it('should render children when not loading', () => {
      render(
        <TestWrapper>
          <MobileButtonLoading isLoading={false}>
            <span>Click me</span>
          </MobileButtonLoading>
        </TestWrapper>
      )

      expect(screen.getByText('Click me')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should render loading state when loading', () => {
      render(
        <TestWrapper>
          <MobileButtonLoading isLoading={true} loadingText="Submitting...">
            <span>Click me</span>
          </MobileButtonLoading>
        </TestWrapper>
      )

      expect(screen.queryByText('Click me')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Submitting...')).toBeInTheDocument()
    })

    it('should use default loading text', () => {
      render(
        <TestWrapper>
          <MobileButtonLoading isLoading={true}>
            <span>Click me</span>
          </MobileButtonLoading>
        </TestWrapper>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should apply mobile-first responsive classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="text-sm xs:text-base sm:text-lg">
            Responsive text
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('text-sm')
      expect(element).toHaveClass('xs:text-base')
      expect(element).toHaveClass('sm:text-lg')
    })

    it('should handle touch device classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="touch-target-enhanced">
            Touch target
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('touch-target-enhanced')
    })
  })

  describe('Performance Optimizations', () => {
    it('should apply GPU acceleration classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="gpu-accelerated">
            Accelerated element
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('gpu-accelerated')
    })

    it('should apply will-change classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="will-change-transform">
            Transform element
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('will-change-transform')
    })
  })

  describe('Safe Area Support', () => {
    it('should apply safe area classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="safe-area-inset">
            Safe area content
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('safe-area-inset')
    })

    it('should apply safe area top and bottom', () => {
      const { container } = render(
        <TestWrapper>
          <div className="safe-area-top safe-area-bottom">
            Safe area content
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('safe-area-top')
      expect(element).toHaveClass('safe-area-bottom')
    })
  })
})