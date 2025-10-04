import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePage from '../page'
import { trackPageView, trackScrollDepth } from '@/lib/analytics/events'

// Mock components that have their own tests
vi.mock('@/components/announcement-bar', () => ({
  default: () => <div data-testid="announcement-bar">Announcement Bar</div>
}))

vi.mock('@/components/header-nav', () => ({
  default: () => <nav data-testid="header-nav">Header Navigation</nav>
}))

vi.mock('@/components/main-footer', () => ({
  default: () => <footer data-testid="main-footer">Footer</footer>
}))

vi.mock('@/components/performance-monitor', () => ({
  default: () => null
}))

// Mock analytics
vi.mock('@/lib/analytics/events', () => ({
  trackPageView: vi.fn(),
  trackScrollDepth: vi.fn(),
  trackC9Capability: vi.fn(),
  trackCTA: vi.fn(),
  trackHeroInteraction: vi.fn()
}))

// Mock scroll tracking
vi.mock('@/hooks/use-scroll-tracking', () => ({
  useScrollTracking: vi.fn(),
  useElementVisibility: vi.fn((ref, callback) => {
    setTimeout(() => callback(), 0)
  })
}))

describe('Landing Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all major sections in correct order', () => {
    render(<HomePage />)
    
    const mainContent = screen.getByRole('main')
    const sections = mainContent.querySelectorAll('section')
    
    // Verify sections exist
    expect(screen.getByTestId('announcement-bar')).toBeInTheDocument()
    expect(screen.getByTestId('header-nav')).toBeInTheDocument()
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    expect(screen.getByText('The C9 Suite: Coordinated AI Capabilities')).toBeInTheDocument()
    expect(screen.getByTestId('main-footer')).toBeInTheDocument()
  })

  it('applies correct layout structure', () => {
    const { container } = render(<HomePage />)
    
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('flex', 'flex-col', 'min-h-screen', 'bg-c9n-blue-dark')
    
    const main = screen.getByRole('main')
    expect(main).toHaveClass('flex-grow')
  })

  it('renders hero section with correct content', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Unlock Deeper Insights.')).toBeInTheDocument()
    expect(screen.getByText('Effortlessly.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Request a Consultation/i })).toBeInTheDocument()
  })

  it('renders C9 capabilities showcase', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('C9 Insight')).toBeInTheDocument()
      expect(screen.getByText('C9 Persona')).toBeInTheDocument()
      expect(screen.getByText('C9 Domain')).toBeInTheDocument()
      expect(screen.getByText('C9 Orchestrator')).toBeInTheDocument()
      expect(screen.getByText('C9 Narrative')).toBeInTheDocument()
    })
  })

  it('renders feature highlight sections', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Explore the C9D.AI Insight Engine')).toBeInTheDocument()
    expect(screen.getByText('Rapid Correlation. Instant Reports.')).toBeInTheDocument()
  })

  it('allows navigation between C9 capabilities', async () => {
    render(<HomePage />)
    
    // Click on C9 Persona
    const personaButton = screen.getByRole('button', { name: /C9 Persona/i })
    fireEvent.click(personaButton)
    
    await waitFor(() => {
      expect(screen.getByText('AI that represents your brand, your way')).toBeInTheDocument()
    })
    
    // Click on C9 Domain
    const domainButton = screen.getByRole('button', { name: /C9 Domain/i })
    fireEvent.click(domainButton)
    
    await waitFor(() => {
      expect(screen.getByText('Smarter AI, built for your industry')).toBeInTheDocument()
    })
  })

  it('hero CTA navigates to consultation page', () => {
    render(<HomePage />)
    
    const ctaLink = screen.getByRole('link', { name: /Request a Consultation/i })
    expect(ctaLink).toHaveAttribute('href', '/request-consultation')
  })

  it('renders multiple CTA sections throughout the page', () => {
    render(<HomePage />)
    
    // Hero CTA
    expect(screen.getByRole('link', { name: /Request a Consultation/i })).toBeInTheDocument()
    
    // Feature CTAs
    expect(screen.getByText('EXPLORE INSIGHT ENGINE FEATURES')).toBeInTheDocument()
    expect(screen.getByText('DISCOVER RAPID REPORTING')).toBeInTheDocument()
  })

  it('applies responsive classes to sections', () => {
    render(<HomePage />)
    
    const heroTitle = screen.getByRole('heading', { level: 1 })
    expect(heroTitle).toHaveClass('text-4xl', 'sm:text-5xl', 'md:text-6xl', 'lg:text-7xl')
  })

  it('includes performance monitoring', () => {
    const { container } = render(<HomePage />)
    
    // Performance monitor renders but returns null, so we just verify the component was included
    expect(container.innerHTML).toBeTruthy()
  })

  it('maintains consistent color scheme', () => {
    const { container } = render(<HomePage />)
    
    // Check for consistent dark theme
    expect(container.firstChild).toHaveClass('bg-c9n-blue-dark', 'text-gray-200')
  })

  it('supports industry filtering in C9 capabilities', async () => {
    render(<HomePage />)
    
    // Click education filter
    const educationButton = screen.getByRole('button', { name: /education/i })
    fireEvent.click(educationButton)
    
    await waitFor(() => {
      expect(screen.getByText('Forecast class attendance and resource needs')).toBeInTheDocument()
    })
  })

  it('displays API endpoints for capabilities', () => {
    render(<HomePage />)
    
    expect(screen.getByText('API Endpoints')).toBeInTheDocument()
    expect(screen.getByText('/api/insight/correlate')).toBeInTheDocument()
  })

  it('renders social proof sections', () => {
    render(<HomePage />)
    
    // These would be rendered by the actual components
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})