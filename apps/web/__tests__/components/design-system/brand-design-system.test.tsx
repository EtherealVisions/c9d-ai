/**
 * Brand Design System Tests
 * 
 * Comprehensive tests for all design system components to ensure
 * brand consistency and proper functionality.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  BrandGradient, 
  GradientText, 
  GradientBorder,
  GradientOverlay 
} from '@/components/design-system/brand-gradient'
import { 
  BrandAnimation, 
  FloatingBlob, 
  ScrollAnimation,
  StaggeredAnimation,
  PulseGlow 
} from '@/components/design-system/brand-animation'
import { 
  BrandTypography, 
  HeroTitle, 
  SectionTitle, 
  BodyText, 
  CaptionText 
} from '@/components/design-system/brand-typography'
import { 
  BrandAsset, 
  BrandLogo, 
  BrandIcon, 
  BrandAvatar 
} from '@/components/design-system/brand-assets'
import { 
  BrandButton, 
  CTAButton, 
  GhostButton, 
  IconButton, 
  ButtonGroup 
} from '@/components/design-system/brand-button'
import { 
  BrandValidator,
  BrandStyleGenerator 
} from '@/lib/design-system/brand-guidelines'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, className, onClick, onError, ...props }: any) => (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onClick={onClick}
      onError={onError}
      {...props}
    />
  ),
}))

// Mock IntersectionObserver for scroll animations
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

describe('Brand Gradient Components', () => {
  describe('BrandGradient', () => {
    it('should render with primary gradient variant', () => {
      render(
        <BrandGradient variant="primary" data-testid="brand-gradient">
          Test Content
        </BrandGradient>
      )
      
      const gradient = screen.getByTestId('brand-gradient')
      expect(gradient).toBeInTheDocument()
      expect(gradient).toHaveTextContent('Test Content')
    })

    it('should apply animated gradient when specified', () => {
      render(
        <BrandGradient variant="primary" animated={true} data-testid="animated-gradient">
          Animated Content
        </BrandGradient>
      )
      
      const gradient = screen.getByTestId('animated-gradient')
      expect(gradient).toHaveClass('animate-gradient-wave')
    })

    it('should render as text gradient when asText is true', () => {
      render(
        <BrandGradient variant="primary" asText={true} data-testid="text-gradient">
          Gradient Text
        </BrandGradient>
      )
      
      const gradient = screen.getByTestId('text-gradient')
      expect(gradient).toHaveClass('bg-clip-text', 'text-transparent')
    })
  })

  describe('GradientText', () => {
    it('should render gradient text with correct heading tag', () => {
      render(
        <GradientText as="h1" variant="primary">
          Gradient Heading
        </GradientText>
      )
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Gradient Heading')
      expect(heading).toHaveClass('bg-clip-text', 'text-transparent')
    })
  })

  describe('GradientBorder', () => {
    it('should render with gradient border effect', () => {
      render(
        <GradientBorder variant="primary" data-testid="gradient-border">
          <div>Bordered Content</div>
        </GradientBorder>
      )
      
      const border = screen.getByTestId('gradient-border')
      expect(border).toBeInTheDocument()
      expect(border).toHaveClass('relative', 'overflow-hidden')
    })
  })
})

describe('Brand Animation Components', () => {
  beforeEach(() => {
    // Mock matchMedia for reduced motion detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  describe('BrandAnimation', () => {
    it('should render with fade animation', () => {
      render(
        <BrandAnimation type="fade" data-testid="fade-animation">
          Animated Content
        </BrandAnimation>
      )
      
      const animation = screen.getByTestId('fade-animation')
      expect(animation).toBeInTheDocument()
      expect(animation).toHaveTextContent('Animated Content')
    })

    it('should handle hover trigger', async () => {
      render(
        <BrandAnimation type="scale" trigger="hover" data-testid="hover-animation">
          Hover Content
        </BrandAnimation>
      )
      
      const animation = screen.getByTestId('hover-animation')
      
      fireEvent.mouseEnter(animation)
      await waitFor(() => {
        expect(animation).toHaveClass('animate-scale-in')
      })
    })

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <BrandAnimation type="float" respectReducedMotion={true} data-testid="reduced-motion">
          Reduced Motion Content
        </BrandAnimation>
      )
      
      const animation = screen.getByTestId('reduced-motion')
      expect(animation).toHaveClass('transition-opacity')
    })
  })

  describe('FloatingBlob', () => {
    it('should render floating blob with correct variant', () => {
      render(<FloatingBlob variant="primary" data-testid="floating-blob" />)
      
      const blob = screen.getByTestId('floating-blob')
      expect(blob).toBeInTheDocument()
      expect(blob).toHaveClass('bg-purple-pink-gradient')
    })
  })

  describe('PulseGlow', () => {
    it('should render with pulse glow animation', () => {
      render(
        <PulseGlow variant="primary" data-testid="pulse-glow">
          Glowing Content
        </PulseGlow>
      )
      
      const glow = screen.getByTestId('pulse-glow')
      expect(glow).toBeInTheDocument()
      expect(glow).toHaveClass('animate-pulse-glow')
    })
  })
})

describe('Brand Typography Components', () => {
  describe('BrandTypography', () => {
    it('should render with correct variant styles', () => {
      render(
        <BrandTypography variant="heading-1" color="white">
          Test Heading
        </BrandTypography>
      )
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Test Heading')
      expect(heading).toHaveClass('font-bold', 'text-white')
    })

    it('should render gradient text for gradient colors', () => {
      render(
        <BrandTypography variant="heading-2" color="gradient-primary">
          Gradient Heading
        </BrandTypography>
      )
      
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('bg-clip-text', 'text-transparent')
    })
  })

  describe('HeroTitle', () => {
    it('should render hero title with gradient by default', () => {
      render(<HeroTitle>Hero Title</HeroTitle>)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Hero Title')
      expect(title).toHaveClass('bg-clip-text', 'text-transparent')
    })

    it('should render without gradient when specified', () => {
      render(<HeroTitle gradient={false}>Plain Hero Title</HeroTitle>)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('text-white')
      expect(title).not.toHaveClass('bg-clip-text')
    })
  })

  describe('SectionTitle', () => {
    it('should render with correct heading level', () => {
      render(<SectionTitle level={3}>Section Title</SectionTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Section Title')
    })
  })

  describe('BodyText', () => {
    it('should render with correct size and color', () => {
      render(<BodyText size="large" color="gray-light">Body content</BodyText>)
      
      const text = screen.getByText('Body content')
      expect(text).toBeInTheDocument()
      expect(text).toHaveClass('text-lg', 'text-windsurf-gray-light')
    })
  })
})

describe('Brand Asset Components', () => {
  describe('BrandAsset', () => {
    it('should render asset with correct attributes', () => {
      render(
        <BrandAsset 
          type="logo" 
          variant="primary" 
          size="md" 
          alt="Test Logo"
        />
      )
      
      const asset = screen.getByAltText('Test Logo')
      expect(asset).toBeInTheDocument()
      expect(asset).toHaveAttribute('src', '/assets/logos/c9d-logo-primary.svg')
    })

    it('should handle image loading errors', async () => {
      render(
        <BrandAsset 
          type="logo" 
          variant="primary" 
          size="md" 
          alt="Test Logo"
        />
      )
      
      const asset = screen.getByAltText('Test Logo')
      fireEvent.error(asset)
      
      await waitFor(() => {
        expect(screen.getByText('Asset not found')).toBeInTheDocument()
      })
    })
  })

  describe('BrandLogo', () => {
    it('should render logo with text by default', () => {
      render(<BrandLogo variant="primary" size="lg" />)
      
      const logo = screen.getByAltText('C9d.ai Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/assets/logos/c9d-logo-primary-with-text.svg')
    })

    it('should render logo without text when specified', () => {
      render(<BrandLogo variant="primary" size="lg" showText={false} />)
      
      const logo = screen.getByAltText('C9d.ai Logo')
      expect(logo).toHaveAttribute('src', '/assets/logos/c9d-logo-primary.svg')
    })
  })

  describe('BrandAvatar', () => {
    it('should render initials when no src provided', () => {
      render(<BrandAvatar name="John Doe" size="md" />)
      
      const avatar = screen.getByText('JD')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('rounded-full')
    })

    it('should render image when src provided', () => {
      render(<BrandAvatar src="/test-avatar.jpg" name="John Doe" size="md" />)
      
      const avatar = screen.getByAltText('John Doe avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', '/test-avatar.jpg')
    })
  })
})

describe('Brand Button Components', () => {
  describe('BrandButton', () => {
    it('should render with primary variant by default', () => {
      render(<BrandButton>Click me</BrandButton>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-purple-pink-gradient')
    })

    it('should handle click events', () => {
      const handleClick = vi.fn()
      render(<BrandButton onClick={handleClick}>Click me</BrandButton>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should show loading state', () => {
      render(<BrandButton loading={true}>Loading</BrandButton>)
      
      const button = screen.getByRole('button', { name: 'Loading' })
      expect(button).toBeDisabled()
      expect(button.querySelector('svg')).toBeInTheDocument() // Loading spinner
    })

    it('should render with icons', () => {
      const leftIcon = <span data-testid="left-icon">←</span>
      const rightIcon = <span data-testid="right-icon">→</span>
      
      render(
        <BrandButton leftIcon={leftIcon} rightIcon={rightIcon}>
          With Icons
        </BrandButton>
      )
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should apply full width when specified', () => {
      render(<BrandButton fullWidth={true}>Full Width</BrandButton>)
      
      const button = screen.getByRole('button', { name: 'Full Width' })
      expect(button).toHaveClass('w-full')
    })
  })

  describe('CTAButton', () => {
    it('should render with glow effect by default', () => {
      render(<CTAButton>Call to Action</CTAButton>)
      
      const button = screen.getByRole('button', { name: 'Call to Action' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('shadow-lg')
    })
  })

  describe('GhostButton', () => {
    it('should render with transparent background', () => {
      render(<GhostButton>Ghost Button</GhostButton>)
      
      const button = screen.getByRole('button', { name: 'Ghost Button' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-transparent', 'border-2')
    })
  })

  describe('IconButton', () => {
    it('should render with icon and aria-label', () => {
      const icon = <span data-testid="icon">★</span>
      
      render(
        <IconButton icon={icon} aria-label="Favorite">
          {/* No children for icon button */}
        </IconButton>
      )
      
      const button = screen.getByRole('button', { name: 'Favorite' })
      expect(button).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(button).toHaveClass('rounded-full', 'aspect-square')
    })
  })

  describe('ButtonGroup', () => {
    it('should render buttons in horizontal group', () => {
      render(
        <ButtonGroup orientation="horizontal">
          <BrandButton>First</BrandButton>
          <BrandButton>Second</BrandButton>
          <BrandButton>Third</BrandButton>
        </ButtonGroup>
      )
      
      const group = screen.getByRole('group')
      expect(group).toBeInTheDocument()
      expect(group).toHaveClass('flex-row')
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })

    it('should render buttons in vertical group', () => {
      render(
        <ButtonGroup orientation="vertical">
          <BrandButton>First</BrandButton>
          <BrandButton>Second</BrandButton>
        </ButtonGroup>
      )
      
      const group = screen.getByRole('group')
      expect(group).toHaveClass('flex-col')
    })
  })
})

describe('Brand Guidelines Validation', () => {
  describe('BrandValidator', () => {
    it('should validate color contrast', () => {
      const result = BrandValidator.validateColorContrast('#FFFFFF', '#000000', 'AA')
      
      expect(result).toHaveProperty('background', '#FFFFFF')
      expect(result).toHaveProperty('foreground', '#000000')
      expect(result).toHaveProperty('wcagLevel', 'AA')
      expect(result).toHaveProperty('valid')
    })

    it('should validate spacing values', () => {
      expect(BrandValidator.validateSpacing('1rem')).toBe(true)
      expect(BrandValidator.validateSpacing('invalid')).toBe(false)
    })

    it('should validate typography settings', () => {
      const isValid = BrandValidator.validateTypography('text-lg', 'font-bold', 'leading-normal')
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('BrandStyleGenerator', () => {
    it('should generate button styles', () => {
      const styles = BrandStyleGenerator.generateButtonStyles({
        variant: 'primary',
        size: 'md',
        gradient: true,
        glow: true,
        animation: 'pulse',
        children: 'Test',
      })
      
      expect(styles).toHaveProperty('borderRadius')
      expect(styles).toHaveProperty('fontWeight')
      expect(styles).toHaveProperty('transition')
    })

    it('should generate card styles', () => {
      const styles = BrandStyleGenerator.generateCardStyles({
        variant: 'elevated',
        size: 'lg',
        gradient: false,
        glow: false,
        children: 'Test',
      })
      
      expect(styles).toHaveProperty('backgroundColor')
      expect(styles).toHaveProperty('borderRadius')
      expect(styles).toHaveProperty('boxShadow')
    })
  })
})

describe('Design System Integration', () => {
  it('should work together in complex layouts', () => {
    render(
      <div data-testid="complex-layout">
        <BrandAnimation type="fade">
          <HeroTitle>Welcome to C9d.ai</HeroTitle>
        </BrandAnimation>
        
        <BrandGradient variant="primary">
          <SectionTitle level={2}>Features</SectionTitle>
          <BodyText>Discover our amazing features</BodyText>
        </BrandGradient>
        
        <ButtonGroup>
          <CTAButton>Get Started</CTAButton>
          <GhostButton>Learn More</GhostButton>
        </ButtonGroup>
      </div>
    )
    
    const layout = screen.getByTestId('complex-layout')
    expect(layout).toBeInTheDocument()
    
    expect(screen.getByText('Welcome to C9d.ai')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Discover our amazing features')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument()
  })

  it('should maintain accessibility standards', () => {
    render(
      <div>
        <BrandButton aria-label="Primary action">Action</BrandButton>
        <BrandTypography variant="heading-1" as="h1">
          Accessible Heading
        </BrandTypography>
        <BrandAsset type="logo" alt="Company logo" size="md" />
      </div>
    )
    
    const button = screen.getByRole('button', { name: 'Primary action' })
    const heading = screen.getByRole('heading', { level: 1 })
    const logo = screen.getByAltText('Company logo')
    
    expect(button).toBeInTheDocument()
    expect(heading).toBeInTheDocument()
    expect(logo).toBeInTheDocument()
  })
})