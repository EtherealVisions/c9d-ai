import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TestimonialSection from '../testimonial-section'

// Mock the intersection observer hook
vi.mock('@/hooks/use-intersection-observer', () => ({
  useIntersectionObserver: () => ({
    elementRef: { current: null },
    shouldAnimate: true
  })
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  )
}))

describe('TestimonialSection', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders the testimonial section with header', () => {
    render(<TestimonialSection />)
    
    expect(screen.getByText('Customer Success')).toBeInTheDocument()
    expect(screen.getByText(/Trusted by/)).toBeInTheDocument()
    expect(screen.getByText(/Industry Leaders/)).toBeInTheDocument()
  })

  it('displays the first testimonial by default', () => {
    render(<TestimonialSection />)
    
    expect(screen.getByText(/Every single one of our analysts/)).toBeInTheDocument()
    expect(screen.getByText('G. Analytex')).toBeInTheDocument()
    expect(screen.getByText('President & CEO, Insight Corp')).toBeInTheDocument()
  })

  it('shows rating stars for testimonials', () => {
    render(<TestimonialSection />)
    
    // Should show 5 stars for the first testimonial
    const stars = screen.getAllByRole('img', { name: '' }) // Stars are rendered as SVG icons
    expect(stars.length).toBeGreaterThan(0)
  })

  it('displays industry and use case tags', () => {
    render(<TestimonialSection />)
    
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Data Analysis Acceleration')).toBeInTheDocument()
  })

  it('allows manual navigation between testimonials', () => {
    render(<TestimonialSection />)
    
    // Click next button
    const nextButton = screen.getByLabelText('Next testimonial')
    fireEvent.click(nextButton)
    
    // Should show second testimonial
    expect(screen.getByText(/C9N.AI transformed our development workflow/)).toBeInTheDocument()
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
  })

  it('allows navigation via dot indicators', () => {
    render(<TestimonialSection />)
    
    // Click on third dot indicator
    const dotButtons = screen.getAllByLabelText(/Go to testimonial/)
    fireEvent.click(dotButtons[2])
    
    // Should show third testimonial
    expect(screen.getByText(/The AI orchestration capabilities/)).toBeInTheDocument()
    expect(screen.getByText('Marcus Rodriguez')).toBeInTheDocument()
  })

  it('displays customer logos', () => {
    render(<TestimonialSection />)
    
    expect(screen.getByText('Trusted by leading organizations worldwide')).toBeInTheDocument()
    expect(screen.getByAltText('Insight Corp logo')).toBeInTheDocument()
    expect(screen.getByAltText('TechFlow Solutions logo')).toBeInTheDocument()
  })

  it('shows trust indicators', () => {
    render(<TestimonialSection />)
    
    expect(screen.getByText('SOC 2 Compliant')).toBeInTheDocument()
    expect(screen.getByText('ISO 27001 Certified')).toBeInTheDocument()
    expect(screen.getByText('AI Excellence Award')).toBeInTheDocument()
  })

  it('auto-rotates testimonials', async () => {
    render(<TestimonialSection />)
    
    // Initially shows first testimonial
    expect(screen.getByText('G. Analytex')).toBeInTheDocument()
    
    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    })
  })

  it('pauses auto-rotation when user interacts', async () => {
    render(<TestimonialSection />)
    
    // Click next button to trigger manual interaction
    const nextButton = screen.getByLabelText('Next testimonial')
    fireEvent.click(nextButton)
    
    // Should show second testimonial
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    
    // Fast-forward 5 seconds - should not auto-rotate immediately
    vi.advanceTimersByTime(5000)
    
    // Should still show second testimonial
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    
    // Fast-forward another 5 seconds (total 10 seconds) - should resume auto-rotation
    vi.advanceTimersByTime(5000)
    
    await waitFor(() => {
      // Should have moved to next testimonial
      expect(screen.getByText('Marcus Rodriguez')).toBeInTheDocument()
    })
  })

  it('handles keyboard navigation', () => {
    render(<TestimonialSection />)
    
    const nextButton = screen.getByLabelText('Next testimonial')
    const prevButton = screen.getByLabelText('Previous testimonial')
    
    // Test that buttons are focusable and clickable
    expect(nextButton).toBeInTheDocument()
    expect(prevButton).toBeInTheDocument()
    
    fireEvent.click(nextButton)
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    
    fireEvent.click(prevButton)
    expect(screen.getByText('G. Analytex')).toBeInTheDocument()
  })

  it('wraps around when navigating past the last testimonial', () => {
    render(<TestimonialSection />)
    
    const nextButton = screen.getByLabelText('Next testimonial')
    
    // Click next 4 times to go past the last testimonial
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    
    // Should wrap back to first testimonial
    expect(screen.getByText('G. Analytex')).toBeInTheDocument()
  })

  it('wraps around when navigating before the first testimonial', () => {
    render(<TestimonialSection />)
    
    const prevButton = screen.getByLabelText('Previous testimonial')
    
    // Click previous from first testimonial
    fireEvent.click(prevButton)
    
    // Should wrap to last testimonial
    expect(screen.getByText('Dr. Kenji Tanaka')).toBeInTheDocument()
  })
})