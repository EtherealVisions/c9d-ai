import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import C9CapabilitiesShowcase from '../c9-capabilities-showcase'
import { trackC9Capability, trackCTA } from '@/lib/analytics/events'

// Mock analytics
vi.mock('@/lib/analytics/events', () => ({
  trackC9Capability: vi.fn(),
  trackCTA: vi.fn()
}))

// Mock scroll tracking hook
vi.mock('@/hooks/use-scroll-tracking', () => ({
  useElementVisibility: vi.fn((ref, callback) => {
    // Simulate immediate visibility
    setTimeout(() => callback(), 0)
  })
}))

describe('C9CapabilitiesShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all five C9 capabilities', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('The C9 Suite: Coordinated AI Capabilities')).toBeInTheDocument()
    expect(screen.getByText('C9 Insight')).toBeInTheDocument()
    expect(screen.getByText('C9 Persona')).toBeInTheDocument()
    expect(screen.getByText('C9 Domain')).toBeInTheDocument()
    expect(screen.getByText('C9 Orchestrator')).toBeInTheDocument()
    expect(screen.getByText('C9 Narrative')).toBeInTheDocument()
  })

  it('displays the default capability (Insight) on load', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('Coordinating patterns across time, space, and data')).toBeInTheDocument()
    expect(screen.getByText('Turn raw data into foresight with APIs for correlation, forecasting, and anomaly detection')).toBeInTheDocument()
  })

  it('switches capabilities when clicked', async () => {
    render(<C9CapabilitiesShowcase />)
    
    const personaButton = screen.getByRole('button', { name: /C9 Persona/i })
    fireEvent.click(personaButton)
    
    await waitFor(() => {
      expect(screen.getByText('AI that represents your brand, your way')).toBeInTheDocument()
      expect(screen.getByText('Create branded AI entities that embody your organization with configurable tone and knowledge')).toBeInTheDocument()
    })
  })

  it('tracks capability view when switched', async () => {
    render(<C9CapabilitiesShowcase />)
    
    const domainButton = screen.getByRole('button', { name: /C9 Domain/i })
    fireEvent.click(domainButton)
    
    await waitFor(() => {
      expect(trackC9Capability).toHaveBeenCalledWith('domain', 'view')
    })
  })

  it('displays key features for selected capability', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('Entity & temporal correlation APIs')).toBeInTheDocument()
    expect(screen.getByText('Contextual forecasting & predictive models')).toBeInTheDocument()
    expect(screen.getByText('Time-series anomaly detection')).toBeInTheDocument()
  })

  it('shows API endpoints for capabilities', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('API Endpoints')).toBeInTheDocument()
    expect(screen.getByText('Correlation API')).toBeInTheDocument()
    expect(screen.getByText('/api/insight/correlate')).toBeInTheDocument()
  })

  it('filters use cases by industry', async () => {
    render(<C9CapabilitiesShowcase />)
    
    // Click education filter
    const educationButton = screen.getByRole('button', { name: /education/i })
    fireEvent.click(educationButton)
    
    await waitFor(() => {
      expect(screen.getByText('Forecast class attendance and resource needs')).toBeInTheDocument()
      expect(trackC9Capability).toHaveBeenCalledWith('insight', 'filter_industry', { industry: 'education' })
    })
  })

  it('shows all use cases when "All Industries" is clicked', async () => {
    render(<C9CapabilitiesShowcase />)
    
    // First filter by education
    const educationButton = screen.getByRole('button', { name: /education/i })
    fireEvent.click(educationButton)
    
    // Then click all industries
    const allButton = screen.getByRole('button', { name: /All Industries/i })
    fireEvent.click(allButton)
    
    await waitFor(() => {
      expect(screen.getByText('Forecast class attendance and resource needs')).toBeInTheDocument()
      expect(screen.getByText('Predict network demand and delivery bottlenecks')).toBeInTheDocument()
    })
  })

  it('tracks CTA clicks', async () => {
    render(<C9CapabilitiesShowcase />)
    
    const ctaButton = screen.getByRole('link', { name: /Explore Insight API/i })
    fireEvent.click(ctaButton)
    
    await waitFor(() => {
      expect(trackCTA).toHaveBeenCalledWith(
        'capability',
        'click',
        'Explore Insight API',
        '/api/insight',
        { capability: 'insight' }
      )
    })
  })

  it('displays capability comparison matrix', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('Coordinated Intelligence Across All Capabilities')).toBeInTheDocument()
    expect(screen.getByText('Core Function')).toBeInTheDocument()
    expect(screen.getByText('Integration')).toBeInTheDocument()
    expect(screen.getByText('Deployment')).toBeInTheDocument()
  })

  it('tracks section visibility on mount', async () => {
    render(<C9CapabilitiesShowcase />)
    
    await waitFor(() => {
      expect(trackC9Capability).toHaveBeenCalledWith('insight', 'view')
    })
  })

  it('applies correct styling to selected capability', () => {
    render(<C9CapabilitiesShowcase />)
    
    const insightButton = screen.getByRole('button', { name: /C9 Insight/i })
    expect(insightButton).toHaveClass('border-windsurf-pink-hot')
    
    const personaButton = screen.getByRole('button', { name: /C9 Persona/i })
    expect(personaButton).toHaveClass('border-windsurf-gray-dark')
  })

  it('shows industry-specific badges in use cases', () => {
    render(<C9CapabilitiesShowcase />)
    
    expect(screen.getByText('education')).toBeInTheDocument()
    expect(screen.getByText('telecom')).toBeInTheDocument()
  })

  it('handles empty use cases gracefully', async () => {
    render(<C9CapabilitiesShowcase />)
    
    // Switch to Orchestrator
    const orchestratorButton = screen.getByRole('button', { name: /C9 Orchestrator/i })
    fireEvent.click(orchestratorButton)
    
    // Filter by healthcare (which has no use cases for Orchestrator)
    const healthcareButton = screen.getByRole('button', { name: /healthcare/i })
    fireEvent.click(healthcareButton)
    
    await waitFor(() => {
      expect(screen.getByText('No use cases available for the selected industry.')).toBeInTheDocument()
    })
  })
})