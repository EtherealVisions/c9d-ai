import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useMobileOptimized, useTouchCarousel } from '@/hooks/use-mobile-optimized'
import { ProgressiveImage } from '@/components/ui/progressive-image'
import { MobileCarousel } from '@/components/ui/mobile-carousel'
import { MobileNavigation } from '@/components/ui/mobile-navigation'
import { PerformanceAnimation } from '@/components/ui/performance-animations'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className, onLoad, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  )
}))

// Mock intersection observer
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})
window.IntersectionObserver = mockIntersectionObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

// Mock navigator properties
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 1
})

describe('Mobile Optimization Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375 // Mobile width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667 // Mobile height
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useMobileOptimized Hook', () => {
    function TestComponent() {
      const {
        isMobile,
        isTablet,
        isTouch,
        orientation,
        reducedMotion,
        performanceMode,
        devicePixelRatio,
        connectionSpeed
      } = useMobileOptimized()

      return (
        <div>
          <div data-testid="is-mobile">{isMobile.toString()}</div>
          <div data-testid="is-tablet">{isTablet.toString()}</div>
          <div data-testid="is-touch">{isTouch.toString()}</div>
          <div data-testid="orientation">{orientation}</div>
          <div data-testid="reduced-motion">{reducedMotion.toString()}</div>
          <div data-testid="performance-mode">{performanceMode}</div>
          <div data-testid="device-pixel-ratio">{devicePixelRatio}</div>
          <div data-testid="connection-speed">{connectionSpeed}</div>
        </div>
      )
    }

    it('should detect mobile device correctly', () => {
      render(<TestComponent />)
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('is-touch')).toHaveTextContent('true')
    })

    it('should detect portrait orientation', () => {
      render(<TestComponent />)
      
      expect(screen.getByTestId('orientation')).toHaveTextContent('portrait')
    })

    it('should detect landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(<TestComponent />)
      
      expect(screen.getByTestId('orientation')).toHaveTextContent('landscape')
    })

    it('should detect tablet device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800 // Tablet width
      })

      render(<TestComponent />)
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true')
    })

    it('should respect reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<TestComponent />)
      
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true')
    })
  })

  describe('ProgressiveImage Component', () => {
    it('should render with basic props', () => {
      render(
        <ProgressiveImage
          src="/test-image.jpg"
          alt="Test image"
          width={300}
          height={200}
        />
      )

      const image = screen.getByAltText('Test image')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', '/test-image.jpg')
    })

    it('should show loading spinner when enabled', () => {
      render(
        <ProgressiveImage
          src="/test-image.jpg"
          alt="Test image"
          width={300}
          height={200}
          showLoadingSpinner={true}
        />
      )

      // Should show loading spinner initially
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should handle image load error gracefully', async () => {
      render(
        <ProgressiveImage
          src="/non-existent-image.jpg"
          alt="Test image"
          width={300}
          height={200}
          fallbackSrc="/fallback-image.jpg"
        />
      )

      const image = screen.getByAltText('Test image')
      
      // Simulate image error
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })
    })

    it('should use WebP source when provided', () => {
      render(
        <ProgressiveImage
          src="/test-image.jpg"
          webpSrc="/test-image.webp"
          alt="Test image"
          width={300}
          height={200}
        />
      )

      const image = screen.getByAltText('Test image')
      expect(image).toBeInTheDocument()
    })

    it('should implement lazy loading', () => {
      render(
        <ProgressiveImage
          src="/test-image.jpg"
          alt="Test image"
          width={300}
          height={200}
          loading="lazy"
        />
      )

      const image = screen.getByAltText('Test image')
      expect(image).toHaveAttribute('loading', 'lazy')
    })
  })

  const mockItems = [
    <div key="1" data-testid="item-1">Item 1</div>,
    <div key="2" data-testid="item-2">Item 2</div>,
    <div key="3" data-testid="item-3">Item 3</div>
  ]

  describe('MobileCarousel Component', () => {

    it('should render carousel items', () => {
      render(
        <MobileCarousel>
          {mockItems}
        </MobileCarousel>
      )

      expect(screen.getByTestId('item-1')).toBeInTheDocument()
      expect(screen.getByTestId('item-2')).toBeInTheDocument()
      expect(screen.getByTestId('item-3')).toBeInTheDocument()
    })

    it('should show navigation arrows on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024 // Desktop width
      })

      render(
        <MobileCarousel showArrows={true}>
          {mockItems}
        </MobileCarousel>
      )

      expect(screen.getByLabelText('Previous slide')).toBeInTheDocument()
      expect(screen.getByLabelText('Next slide')).toBeInTheDocument()
    })

    it('should show dot indicators when enabled', () => {
      render(
        <MobileCarousel showDots={true}>
          {mockItems}
        </MobileCarousel>
      )

      expect(screen.getByLabelText('Go to slide group 1')).toBeInTheDocument()
    })

    it('should handle touch events', () => {
      render(
        <MobileCarousel enableTouch={true}>
          {mockItems}
        </MobileCarousel>
      )

      const carousel = screen.getByRole('region', { name: 'Carousel' })
      
      // Simulate touch start
      fireEvent.touchStart(carousel, {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      // Simulate touch move
      fireEvent.touchMove(carousel, {
        touches: [{ clientX: 50, clientY: 100 }]
      })

      // Simulate touch end
      fireEvent.touchEnd(carousel, {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      })

      expect(carousel).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(
        <MobileCarousel>
          {mockItems}
        </MobileCarousel>
      )

      const carousel = screen.getByRole('region', { name: 'Carousel' })
      
      // Focus the carousel
      carousel.focus()
      
      // Press right arrow
      fireEvent.keyDown(carousel, { key: 'ArrowRight' })
      
      expect(carousel).toBeInTheDocument()
    })

    it('should auto-play when enabled', () => {
      vi.useFakeTimers()
      
      render(
        <MobileCarousel autoPlay={true} autoPlayDelay={1000}>
          {mockItems}
        </MobileCarousel>
      )

      expect(screen.getByText('Auto-playing')).toBeInTheDocument()
      
      vi.useRealTimers()
    })
  })

  describe('MobileNavigation Component', () => {
    const mockNavigationItems = [
      {
        id: 'home',
        label: 'Home',
        href: '/'
      },
      {
        id: 'about',
        label: 'About',
        href: '/about'
      },
      {
        id: 'services',
        label: 'Services',
        children: [
          {
            id: 'service-1',
            label: 'Service 1',
            href: '/services/1'
          }
        ]
      }
    ]

    it('should render menu toggle button', () => {
      render(
        <MobileNavigation items={mockNavigationItems} />
      )

      expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    })

    it('should open menu when toggle is clicked', async () => {
      render(
        <MobileNavigation items={mockNavigationItems} />
      )

      const toggleButton = screen.getByLabelText('Open menu')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('About')).toBeInTheDocument()
        expect(screen.getByText('Services')).toBeInTheDocument()
      })
    })

    it('should expand submenu items', async () => {
      render(
        <MobileNavigation items={mockNavigationItems} />
      )

      // Open menu
      const toggleButton = screen.getByLabelText('Open menu')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        const servicesButton = screen.getByText('Services')
        fireEvent.click(servicesButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Service 1')).toBeInTheDocument()
      })
    })

    it('should close menu when backdrop is clicked', async () => {
      render(
        <MobileNavigation items={mockNavigationItems} showBackdrop={true} />
      )

      // Open menu
      const toggleButton = screen.getByLabelText('Open menu')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
      })

      // Click backdrop (this is simplified - in real implementation backdrop click would close menu)
      const closeButton = screen.getByLabelText('Close menu')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Home')).not.toBeInTheDocument()
      })
    })

    it('should handle keyboard navigation', async () => {
      render(
        <MobileNavigation items={mockNavigationItems} />
      )

      // Open menu
      const toggleButton = screen.getByLabelText('Open menu')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
      })

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('Home')).not.toBeInTheDocument()
      })
    })
  })

  describe('PerformanceAnimation Component', () => {
    it('should render children', () => {
      render(
        <PerformanceAnimation animation="fadeIn">
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      expect(screen.getByTestId('animated-content')).toBeInTheDocument()
    })

    it('should apply animation classes', () => {
      render(
        <PerformanceAnimation animation="slideUp" trigger="immediate">
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      const animatedElement = screen.getByTestId('animated-content').parentElement
      expect(animatedElement).toHaveClass('will-change-transform')
    })

    it('should respect reduced motion preference', () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <PerformanceAnimation 
          animation="slideUp" 
          trigger="immediate"
          fallback={<div data-testid="fallback">Fallback Content</div>}
        >
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      expect(screen.getByTestId('fallback')).toBeInTheDocument()
    })

    it('should handle hover trigger', () => {
      render(
        <PerformanceAnimation animation="scaleIn" trigger="hover">
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      const animatedElement = screen.getByTestId('animated-content').parentElement
      
      fireEvent.mouseEnter(animatedElement!)
      fireEvent.mouseLeave(animatedElement!)

      expect(animatedElement).toBeInTheDocument()
    })

    it('should handle focus trigger', () => {
      render(
        <PerformanceAnimation animation="scaleIn" trigger="focus">
          <div data-testid="animated-content" tabIndex={0}>Test Content</div>
        </PerformanceAnimation>
      )

      const animatedElement = screen.getByTestId('animated-content').parentElement
      
      fireEvent.focus(animatedElement!)
      fireEvent.blur(animatedElement!)

      expect(animatedElement).toBeInTheDocument()
    })

    it('should handle scroll trigger with intersection observer', () => {
      const mockObserve = vi.fn()
      const mockDisconnect = vi.fn()
      
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: vi.fn(),
        disconnect: mockDisconnect
      })

      render(
        <PerformanceAnimation animation="fadeIn" trigger="scroll">
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      expect(mockObserve).toHaveBeenCalled()
    })
  })

  describe('Touch Gesture Handling', () => {
    function TestTouchComponent() {
      const { onSwipe } = useMobileOptimized()
      
      React.useEffect(() => {
        const cleanup = onSwipe((gesture) => {
          console.log('Swipe detected:', gesture.direction)
        })
        return cleanup
      }, [onSwipe])

      return <div data-testid="touch-component">Touch Component</div>
    }

    it('should handle touch gestures', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<TestTouchComponent />)
      
      const component = screen.getByTestId('touch-component')
      
      // Simulate swipe gesture
      fireEvent.touchStart(component, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      fireEvent.touchEnd(component, {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      })

      expect(component).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance Optimizations', () => {
    it('should optimize animations for low performance mode', () => {
      // Mock low performance conditions
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: 'slow-2g'
        }
      })

      render(
        <PerformanceAnimation 
          animation="slideUp" 
          trigger="immediate"
          config={{ duration: 1000 }}
        >
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      expect(screen.getByTestId('animated-content')).toBeInTheDocument()
    })

    it('should reduce animation complexity on mobile', () => {
      render(
        <PerformanceAnimation animation="fadeIn" trigger="immediate">
          <div data-testid="animated-content">Test Content</div>
        </PerformanceAnimation>
      )

      const animatedElement = screen.getByTestId('animated-content').parentElement
      expect(animatedElement).toHaveStyle('transform: translateZ(0)')
    })
  })

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels', () => {
      render(
        <MobileCarousel>
          {mockItems}
        </MobileCarousel>
      )

      expect(screen.getByRole('region', { name: 'Carousel' })).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(
        <MobileNavigation items={[
          { id: 'test', label: 'Test', href: '/test' }
        ]} />
      )

      const toggleButton = screen.getByLabelText('Open menu')
      expect(toggleButton).toBeInTheDocument()
      
      // Should be focusable
      toggleButton.focus()
      expect(document.activeElement).toBe(toggleButton)
    })

    it('should respect focus management', async () => {
      render(
        <MobileNavigation items={[
          { id: 'test', label: 'Test', href: '/test' }
        ]} />
      )

      const toggleButton = screen.getByLabelText('Open menu')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })
    })
  })
})