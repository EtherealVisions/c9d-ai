import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HeroSection from '../hero-section'
import { trackHeroInteraction, trackCTA } from '@/lib/analytics/events'

// Mock analytics
vi.mock('@/lib/analytics/events', () => ({
  trackHeroInteraction: vi.fn(),
  trackCTA: vi.fn()
}))

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero content correctly', () => {
    render(<HeroSection />)
    
    expect(screen.getByText('Unlock Deeper Insights.')).toBeInTheDocument()
    expect(screen.getByText('Effortlessly.')).toBeInTheDocument()
    expect(screen.getByText(/C9D.AI leverages advanced AI/)).toBeInTheDocument()
    expect(screen.getByText('Better analysis, better coordination, clearer insights.')).toBeInTheDocument()
  })

  it('renders CTA button with correct text and icon', () => {
    render(<HeroSection />)
    
    const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
    expect(ctaButton).toBeInTheDocument()
    expect(ctaButton).toHaveAttribute('href', '/request-consultation')
  })

  it('tracks CTA click', () => {
    render(<HeroSection />)
    
    const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
    fireEvent.click(ctaButton)
    
    expect(trackHeroInteraction).toHaveBeenCalledWith('cta_click')
    expect(trackCTA).toHaveBeenCalledWith(
      'hero',
      'click',
      'Request a Consultation',
      '/request-consultation'
    )
  })

  it('renders animated background blobs', () => {
    render(<HeroSection />)
    
    const blobs = screen.getByTestId('hero-section').querySelectorAll('.animate-gentle-float-1, .animate-gentle-float-2, .animate-gentle-float-3')
    expect(blobs.length).toBeGreaterThan(0)
  })

  it('applies correct styling classes', () => {
    render(<HeroSection />)
    
    const section = screen.getByTestId('hero-section')
    expect(section).toHaveClass('relative', 'bg-c9n-blue-dark')
    
    const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
    expect(ctaButton.parentElement).toHaveClass('bg-windsurf-pink-hot')
  })

  it('renders gradient text for "Effortlessly"', () => {
    const { container } = render(<HeroSection />)
    
    const gradientText = container.querySelector('.bg-yellow-lime-gradient')
    expect(gradientText).toBeInTheDocument()
    expect(gradientText).toHaveTextContent('Effortlessly.')
  })

  it('is responsive with proper classes', () => {
    render(<HeroSection />)
    
    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveClass('text-4xl', 'sm:text-5xl', 'md:text-6xl', 'lg:text-7xl')
  })

  it('renders check icon with success message', () => {
    render(<HeroSection />)
    
    expect(screen.getByText('Better analysis, better coordination, clearer insights.')).toBeInTheDocument()
    // Check for the CheckCircleIcon presence
    const successMessage = screen.getByText('Better analysis, better coordination, clearer insights.').parentElement
    expect(successMessage?.querySelector('svg')).toBeInTheDocument()
  })

  it('has proper z-index layering for blobs and content', () => {
    const { container } = render(<HeroSection />)
    
    const blobContainer = container.querySelector('.z-0')
    expect(blobContainer).toBeInTheDocument()
    
    const contentContainer = container.querySelector('.z-10')
    expect(contentContainer).toBeInTheDocument()
  })

  it('applies hover effects to CTA button', () => {
    render(<HeroSection />)
    
    const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
    expect(ctaButton.parentElement).toHaveClass('hover:bg-opacity-90', 'hover:shadow-xl', 'hover:scale-105')
  })
})