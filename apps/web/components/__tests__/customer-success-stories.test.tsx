import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import CustomerSuccessStories from '../customer-success-stories'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'

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

describe('CustomerSuccessStories', () => {
  it('renders the section header', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByText('Success Stories')).toBeInTheDocument()
    expect(screen.getByText(/Real Results from/)).toBeInTheDocument()
    expect(screen.getByText(/Real Customers/)).toBeInTheDocument()
  })

  it('displays industry filter buttons', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByText('All Industries')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('shows all success stories by default', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByText('Insight Corp')).toBeInTheDocument()
    expect(screen.getByText('TechFlow Solutions')).toBeInTheDocument()
    expect(screen.getByText('InnovateLab')).toBeInTheDocument()
    expect(screen.getByText('Future Systems Inc')).toBeInTheDocument()
  })

  it('filters stories by industry', () => {
    render(<CustomerSuccessStories />)
    
    // Click on Technology filter
    fireEvent.click(screen.getByText('Technology'))
    
    // Should only show technology companies
    expect(screen.getByText('TechFlow Solutions')).toBeInTheDocument()
    expect(screen.queryByText('Insight Corp')).not.toBeInTheDocument()
    expect(screen.queryByText('InnovateLab')).not.toBeInTheDocument()
    expect(screen.queryByText('Future Systems Inc')).not.toBeInTheDocument()
  })

  it('displays success story details', () => {
    render(<CustomerSuccessStories />)
    
    // Check for challenge and solution sections
    expect(screen.getAllByText('Challenge')).toHaveLength(4)
    expect(screen.getAllByText('Solution')).toHaveLength(4)
    
    // Check for specific content
    expect(screen.getByText(/Data analysts were spending 70%/)).toBeInTheDocument()
    expect(screen.getByText(/Implemented C9N.AI to automate/)).toBeInTheDocument()
  })

  it('shows results metrics for each story', () => {
    render(<CustomerSuccessStories />)
    
    // Check for metrics
    expect(screen.getByText('75%')).toBeInTheDocument() // Time Saved
    expect(screen.getByText('300%')).toBeInTheDocument() // Productivity
    expect(screen.getByText('99.2%')).toBeInTheDocument() // Accuracy
  })

  it('displays testimonial quotes and authors', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByText(/C9N.AI transformed our entire analytics workflow/)).toBeInTheDocument()
    expect(screen.getByText('G. Analytex')).toBeInTheDocument()
    expect(screen.getByText('President & CEO')).toBeInTheDocument()
  })

  it('shows case study links', () => {
    render(<CustomerSuccessStories />)
    
    const caseStudyLinks = screen.getAllByText('Read Case Study')
    expect(caseStudyLinks).toHaveLength(4)
  })

  it('displays the call-to-action section', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByText('Ready to Write Your Success Story?')).toBeInTheDocument()
    expect(screen.getByText('Start Your Journey')).toBeInTheDocument()
  })

  it('highlights active industry filter', () => {
    render(<CustomerSuccessStories />)
    
    const allIndustriesButton = screen.getByText('All Industries')
    expect(allIndustriesButton).toHaveClass('bg-windsurf-purple-deep')
    
    // Click on Analytics filter
    const analyticsButton = screen.getByText('Analytics')
    fireEvent.click(analyticsButton)
    
    expect(analyticsButton).toHaveClass('bg-windsurf-purple-deep')
  })

  it('shows correct industry tags on story cards', () => {
    render(<CustomerSuccessStories />)
    
    // Filter by analytics
    fireEvent.click(screen.getByText('Analytics'))
    
    // Should show analytics industry tag
    expect(screen.getByText('analytics')).toBeInTheDocument()
  })

  it('displays company logos', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByAltText('Insight Corp logo')).toBeInTheDocument()
    expect(screen.getByAltText('TechFlow Solutions logo')).toBeInTheDocument()
    expect(screen.getByAltText('InnovateLab logo')).toBeInTheDocument()
    expect(screen.getByAltText('Future Systems Inc logo')).toBeInTheDocument()
  })

  it('shows author avatars', () => {
    render(<CustomerSuccessStories />)
    
    expect(screen.getByAltText('G. Analytex')).toBeInTheDocument()
    expect(screen.getByAltText('Dr. Sarah Chen')).toBeInTheDocument()
    expect(screen.getByAltText('Marcus Rodriguez')).toBeInTheDocument()
    expect(screen.getByAltText('Dr. Kenji Tanaka')).toBeInTheDocument()
  })

  it('handles empty filter results gracefully', () => {
    render(<CustomerSuccessStories />)
    
    // All filters should return at least one result based on our test data
    // But we can test that the filtering mechanism works
    fireEvent.click(screen.getByText('Research'))
    expect(screen.getByText('InnovateLab')).toBeInTheDocument()
    expect(screen.queryByText('Insight Corp')).not.toBeInTheDocument()
  })
})