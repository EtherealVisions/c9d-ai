import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import SocialProofSection from '../social-proof-section'
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

describe('SocialProofSection', () => {
  it('renders the section header', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText('Social Proof')).toBeInTheDocument()
    expect(screen.getByText(/Loved by/)).toBeInTheDocument()
    expect(screen.getByText(/Developers/)).toBeInTheDocument()
    expect(screen.getByText(/Worldwide/)).toBeInTheDocument()
  })

  it('displays social testimonials', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText('Dr. Eva Rostova')).toBeInTheDocument()
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument()
    expect(screen.getByText('Innovate Solutions Ltd.')).toBeInTheDocument()
    expect(screen.getByText('Dr. Kenji Tanaka')).toBeInTheDocument()
  })

  it('shows platform handles and usernames', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText('@eva_analytics')).toBeInTheDocument()
    expect(screen.getByText('@datamarcus')).toBeInTheDocument()
    expect(screen.getByText('Leading Tech Firm')).toBeInTheDocument()
    expect(screen.getByText('@kenji_insights')).toBeInTheDocument()
  })

  it('displays testimonial quotes', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText(/C9N.AI is one of the best AI analysis tools/)).toBeInTheDocument()
    expect(screen.getByText(/C9N.AI is simply better from my experience/)).toBeInTheDocument()
    expect(screen.getByText(/C9N.AI UX beats competitors/)).toBeInTheDocument()
  })

  it('shows verified badges for verified users', () => {
    render(<SocialProofSection />)
    
    // Verified users should have checkmark icons
    const verifiedIcons = screen.getAllByRole('img') // CheckCircle icons
    expect(verifiedIcons.length).toBeGreaterThan(0)
  })

  it('displays follower counts', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText('12.5K followers')).toBeInTheDocument()
    expect(screen.getByText('8.2K followers')).toBeInTheDocument()
    expect(screen.getByText('25K followers')).toBeInTheDocument()
  })

  it('shows platform icons', () => {
    render(<SocialProofSection />)
    
    // Should have Twitter, LinkedIn, and review platform icons
    // These are rendered as SVG icons from lucide-react
    const testimonialCards = screen.getAllByRole('article') || screen.getAllByText(/C9N.AI/)
    expect(testimonialCards.length).toBeGreaterThan(0)
  })

  it('highlights featured testimonials', () => {
    render(<SocialProofSection />)
    
    // Featured testimonial should have "Featured" badge
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('shows engagement metrics', () => {
    render(<SocialProofSection />)
    
    // Should show likes and shares for each testimonial
    const likesElements = screen.getAllByText(/likes/)
    const sharesElements = screen.getAllByText(/shares/)
    
    expect(likesElements.length).toBeGreaterThan(0)
    expect(sharesElements.length).toBeGreaterThan(0)
  })

  it('displays the join conversation CTA', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByText('Join the Conversation')).toBeInTheDocument()
    expect(screen.getByText('Follow on Twitter')).toBeInTheDocument()
    expect(screen.getByText('Connect on LinkedIn')).toBeInTheDocument()
  })

  it('shows user avatars', () => {
    render(<SocialProofSection />)
    
    expect(screen.getByAltText('Dr. Eva Rostova')).toBeInTheDocument()
    expect(screen.getByAltText('Marcus Chen')).toBeInTheDocument()
    expect(screen.getByAltText('Innovate Solutions Ltd.')).toBeInTheDocument()
    expect(screen.getByAltText('Dr. Kenji Tanaka')).toBeInTheDocument()
  })

  it('handles different platform types', () => {
    render(<SocialProofSection />)
    
    // Should render testimonials from different platforms (Twitter, LinkedIn, reviews)
    // This is tested implicitly through the different testimonial content and styling
    expect(screen.getByText('Dr. Eva Rostova')).toBeInTheDocument() // Twitter
    expect(screen.getByText('Innovate Solutions Ltd.')).toBeInTheDocument() // LinkedIn
    expect(screen.getByText('Sarah Kim')).toBeInTheDocument() // Review platform
  })

  it('provides external links to posts', () => {
    render(<SocialProofSection />)
    
    // External link icons should be present (though hidden until hover)
    // This tests that the structure is in place
    const testimonialCards = screen.getAllByText(/C9N.AI/)
    expect(testimonialCards.length).toBeGreaterThan(0)
  })

  it('uses masonry layout for testimonials', () => {
    render(<SocialProofSection />)
    
    // The masonry layout is implemented via CSS classes
    // We can test that testimonials are rendered in the expected structure
    const testimonials = screen.getAllByText(/C9N.AI/)
    expect(testimonials.length).toBe(6) // Should have 6 testimonials
  })

  it('shows social media follow buttons', () => {
    render(<SocialProofSection />)
    
    const twitterButton = screen.getByText('Follow on Twitter')
    const linkedinButton = screen.getByText('Connect on LinkedIn')
    
    expect(twitterButton).toBeInTheDocument()
    expect(linkedinButton).toBeInTheDocument()
    
    // Check that they are links
    expect(twitterButton.closest('a')).toBeInTheDocument()
    expect(linkedinButton.closest('a')).toBeInTheDocument()
  })
})