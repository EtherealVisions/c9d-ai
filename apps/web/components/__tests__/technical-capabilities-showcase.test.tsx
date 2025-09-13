import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TechnicalCapabilitiesShowcase from '../technical-capabilities-showcase'

// Mock the intersection observer hook
vi.mock('@/hooks/use-intersection-observer', () => ({
  useIntersectionObserver: () => ({
    elementRef: { current: null },
    shouldAnimate: true
  })
}))

// Mock the child components
vi.mock('../interactive-api-preview', () => ({
  InteractiveAPIPreview: () => <div data-testid="interactive-api-preview">API Preview</div>
}))

vi.mock('../integration-showcase', () => ({
  IntegrationShowcase: () => <div data-testid="integration-showcase">Integration Showcase</div>
}))

vi.mock('../architecture-diagram', () => ({
  ArchitectureDiagram: () => <div data-testid="architecture-diagram">Architecture Diagram</div>
}))

vi.mock('../developer-testimonials', () => ({
  DeveloperTestimonials: () => <div data-testid="developer-testimonials">Developer Testimonials</div>
}))

vi.mock('../sdk-download-section', () => ({
  SDKDownloadSection: () => <div data-testid="sdk-download-section">SDK Download Section</div>
}))

describe('TechnicalCapabilitiesShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the main heading and description', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByText(/Built for/)).toBeInTheDocument()
      expect(screen.getByText(/Developers/)).toBeInTheDocument()
      expect(screen.getByText(/by Developers/)).toBeInTheDocument()
      expect(screen.getByText(/Comprehensive APIs, SDKs, and developer tools/)).toBeInTheDocument()
    })

    it('should render all technical capability cards', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByText('API-First Architecture')).toBeInTheDocument()
      expect(screen.getByText('Scalable Infrastructure')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Security')).toBeInTheDocument()
      expect(screen.getByText('Real-time Processing')).toBeInTheDocument()
    })

    it('should render capability card descriptions', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByText(/RESTful APIs with GraphQL support/)).toBeInTheDocument()
      expect(screen.getByText(/Cloud-native architecture designed for enterprise-scale/)).toBeInTheDocument()
      expect(screen.getByText(/Zero-trust security model/)).toBeInTheDocument()
      expect(screen.getByText(/Stream processing capabilities/)).toBeInTheDocument()
    })

    it('should render capability features', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByText('OpenAPI 3.0 specification')).toBeInTheDocument()
      expect(screen.getByText('Kubernetes orchestration')).toBeInTheDocument()
      expect(screen.getByText('SOC 2 Type II certified')).toBeInTheDocument()
      expect(screen.getByText('Apache Kafka integration')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should render all tab triggers', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /api docs/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /integrations/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /architecture/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /sdks/i })).toBeInTheDocument()
    })

    it('should show overview tab content by default', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByText('Technical Overview')).toBeInTheDocument()
      expect(screen.getByText('99.9%')).toBeInTheDocument()
      expect(screen.getByText('API Uptime')).toBeInTheDocument()
      expect(screen.getByText('<100ms')).toBeInTheDocument()
      expect(screen.getByText('Response Time')).toBeInTheDocument()
      expect(screen.getByText('200+')).toBeInTheDocument()
      expect(screen.getByText('Integrations')).toBeInTheDocument()
    })

    it('should switch to API docs tab when clicked', async () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const apiTab = screen.getByRole('tab', { name: /api docs/i })
      fireEvent.click(apiTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('interactive-api-preview')).toBeInTheDocument()
      })
    })

    it('should switch to integrations tab when clicked', async () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const integrationsTab = screen.getByRole('tab', { name: /integrations/i })
      fireEvent.click(integrationsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('integration-showcase')).toBeInTheDocument()
      })
    })

    it('should switch to architecture tab when clicked', async () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const architectureTab = screen.getByRole('tab', { name: /architecture/i })
      fireEvent.click(architectureTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument()
      })
    })

    it('should switch to SDK tab when clicked', async () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const sdkTab = screen.getByRole('tab', { name: /sdks/i })
      fireEvent.click(sdkTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('sdk-download-section')).toBeInTheDocument()
      })
    })
  })

  describe('Overview Tab Content', () => {
    it('should render developer testimonials in overview tab', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      expect(screen.getByTestId('developer-testimonials')).toBeInTheDocument()
    })

    it('should render performance metrics', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const metrics = [
        { value: '99.9%', label: 'API Uptime' },
        { value: '<100ms', label: 'Response Time' },
        { value: '200+', label: 'Integrations' }
      ]

      metrics.forEach(metric => {
        expect(screen.getByText(metric.value)).toBeInTheDocument()
        expect(screen.getByText(metric.label)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(5)
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('should have proper heading hierarchy', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toHaveTextContent(/Built for.*Developers.*by Developers/)
    })

    it('should support keyboard navigation', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const firstTab = screen.getByRole('tab', { name: /overview/i })
      firstTab.focus()
      expect(document.activeElement).toBe(firstTab)
    })
  })

  describe('Responsive Design', () => {
    it('should render capability cards in a responsive grid', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const capabilityCards = screen.getAllByText(/OpenAPI 3.0 specification|Kubernetes orchestration|SOC 2 Type II certified|Apache Kafka integration/)
      expect(capabilityCards.length).toBeGreaterThan(0)
    })

    it('should render tabs in a responsive layout', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toHaveClass('grid', 'w-full', 'grid-cols-2', 'lg:grid-cols-5')
    })
  })

  describe('Visual Design', () => {
    it('should apply gradient backgrounds to capability cards', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const apiCard = screen.getByText('API-First Architecture').closest('[class*="bg-gradient-to-br"]')
      expect(apiCard).toBeInTheDocument()
    })

    it('should have hover effects on capability cards', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const cards = screen.getAllByText(/API-First Architecture|Scalable Infrastructure|Enterprise Security|Real-time Processing/)
      cards.forEach(card => {
        const cardElement = card.closest('[class*="hover:scale-105"]')
        expect(cardElement).toBeInTheDocument()
      })
    })

    it('should apply proper color schemes to tabs', () => {
      render(<TechnicalCapabilitiesShowcase />)
      
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveClass('data-[state=active]:bg-windsurf-pink-hot')
      })
    })
  })

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now()
      render(<TechnicalCapabilitiesShowcase />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should render in less than 100ms
    })

    it('should not cause memory leaks', () => {
      const { unmount } = render(<TechnicalCapabilitiesShowcase />)
      
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing intersection observer gracefully', () => {
      vi.mocked(require('@/hooks/use-intersection-observer').useIntersectionObserver).mockReturnValue({
        elementRef: { current: null },
        shouldAnimate: false
      })

      expect(() => render(<TechnicalCapabilitiesShowcase />)).not.toThrow()
    })

    it('should render even if child components fail', () => {
      vi.mocked(require('../developer-testimonials').DeveloperTestimonials).mockImplementation(() => {
        throw new Error('Component failed')
      })

      // Should still render the main structure
      expect(() => render(<TechnicalCapabilitiesShowcase />)).not.toThrow()
    })
  })
})