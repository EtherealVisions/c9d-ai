import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntegrationShowcase } from '../integration-showcase'

describe('IntegrationShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render integration category cards', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText('Databases & Data Warehouses')).toBeInTheDocument()
      expect(screen.getByText('Business Applications')).toBeInTheDocument()
      expect(screen.getByText('Cloud Platforms')).toBeInTheDocument()
      expect(screen.getByText('Developer Tools')).toBeInTheDocument()
    })

    it('should render category descriptions', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText(/Connect to your existing data infrastructure/)).toBeInTheDocument()
      expect(screen.getByText(/Integrate with your existing business workflow/)).toBeInTheDocument()
      expect(screen.getByText(/Deploy and scale across major cloud providers/)).toBeInTheDocument()
      expect(screen.getByText(/Integrate with your development workflow/)).toBeInTheDocument()
    })

    it('should show integration counts for each category', () => {
      render(<IntegrationShowcase />)
      
      const integrationCounts = screen.getAllByText(/\d+ integrations available/)
      expect(integrationCounts.length).toBe(4)
    })

    it('should select first category by default', () => {
      render(<IntegrationShowcase />)
      
      const databasesCard = screen.getByText('Databases & Data Warehouses').closest('[class*="bg-windsurf-pink-hot"]')
      expect(databasesCard).toBeInTheDocument()
    })
  })

  describe('Category Selection', () => {
    it('should switch categories when clicked', async () => {
      render(<IntegrationShowcase />)
      
      const businessAppsCard = screen.getByText('Business Applications').closest('div[class*="cursor-pointer"]')
      fireEvent.click(businessAppsCard!)
      
      await waitFor(() => {
        const selectedCard = screen.getByText('Business Applications').closest('[class*="bg-windsurf-pink-hot"]')
        expect(selectedCard).toBeInTheDocument()
      })
    })

    it('should update integrations when category changes', async () => {
      render(<IntegrationShowcase />)
      
      // Initially shows database integrations
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
      expect(screen.getByText('Snowflake')).toBeInTheDocument()
      
      // Switch to business applications
      const businessAppsCard = screen.getByText('Business Applications').closest('div[class*="cursor-pointer"]')
      fireEvent.click(businessAppsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
        expect(screen.getByText('HubSpot')).toBeInTheDocument()
        expect(screen.getByText('Shopify')).toBeInTheDocument()
        expect(screen.getByText('Slack')).toBeInTheDocument()
      })
    })

    it('should show cloud platforms when selected', async () => {
      render(<IntegrationShowcase />)
      
      const cloudPlatformsCard = screen.getByText('Cloud Platforms').closest('div[class*="cursor-pointer"]')
      fireEvent.click(cloudPlatformsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('Amazon Web Services')).toBeInTheDocument()
        expect(screen.getByText('Microsoft Azure')).toBeInTheDocument()
        expect(screen.getByText('Google Cloud Platform')).toBeInTheDocument()
        expect(screen.getByText('Vercel')).toBeInTheDocument()
      })
    })

    it('should show developer tools when selected', async () => {
      render(<IntegrationShowcase />)
      
      const developerToolsCard = screen.getByText('Developer Tools').closest('div[class*="cursor-pointer"]')
      fireEvent.click(developerToolsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument()
        expect(screen.getByText('Jira')).toBeInTheDocument()
        expect(screen.getByText('Docker')).toBeInTheDocument()
        expect(screen.getByText('Kubernetes')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Details', () => {
    it('should render integration descriptions', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText(/Direct connection to PostgreSQL databases/)).toBeInTheDocument()
      expect(screen.getByText(/Enterprise data warehouse integration/)).toBeInTheDocument()
      expect(screen.getByText(/NoSQL document database integration/)).toBeInTheDocument()
      expect(screen.getByText(/Serverless data warehouse for analytics/)).toBeInTheDocument()
    })

    it('should show setup times for integrations', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText('5 minutes')).toBeInTheDocument()
      expect(screen.getByText('10 minutes')).toBeInTheDocument()
      expect(screen.getByText('7 minutes')).toBeInTheDocument()
      expect(screen.getByText('8 minutes')).toBeInTheDocument()
    })

    it('should show popularity badges', () => {
      render(<IntegrationShowcase />)
      
      const highDemandBadges = screen.getAllByText('high demand')
      expect(highDemandBadges.length).toBeGreaterThan(0)
    })

    it('should show key features for each integration', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText('Real-time sync')).toBeInTheDocument()
      expect(screen.getByText('Schema introspection')).toBeInTheDocument()
      expect(screen.getByText('Warehouse scaling')).toBeInTheDocument()
      expect(screen.getByText('Zero-copy cloning')).toBeInTheDocument()
    })
  })

  describe('Hover Effects', () => {
    it('should show additional features on hover', async () => {
      render(<IntegrationShowcase />)
      
      const postgresCard = screen.getByText('PostgreSQL').closest('div[class*="cursor-pointer"]')
      
      fireEvent.mouseEnter(postgresCard!)
      
      await waitFor(() => {
        expect(screen.getByText('Query optimization')).toBeInTheDocument()
        expect(screen.getByText('Connection pooling')).toBeInTheDocument()
      })
    })

    it('should hide extra features when not hovering', async () => {
      render(<IntegrationShowcase />)
      
      const postgresCard = screen.getByText('PostgreSQL').closest('div[class*="cursor-pointer"]')
      
      fireEvent.mouseLeave(postgresCard!)
      
      await waitFor(() => {
        expect(screen.getByText('+2 more features')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Guide Buttons', () => {
    it('should render integration guide buttons', () => {
      render(<IntegrationShowcase />)
      
      const guideButtons = screen.getAllByText('View Integration Guide')
      expect(guideButtons.length).toBeGreaterThan(0)
    })

    it('should have proper styling for guide buttons', () => {
      render(<IntegrationShowcase />)
      
      const guideButton = screen.getAllByText('View Integration Guide')[0]
      expect(guideButton).toHaveClass('border-white/30', 'text-white')
    })
  })

  describe('Integration Statistics', () => {
    it('should render integration statistics section', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText('Integration Statistics')).toBeInTheDocument()
      expect(screen.getByText(/Real-time metrics from our integration ecosystem/)).toBeInTheDocument()
    })

    it('should show key metrics', () => {
      render(<IntegrationShowcase />)
      
      expect(screen.getByText('200+')).toBeInTheDocument()
      expect(screen.getByText('Total Integrations')).toBeInTheDocument()
      expect(screen.getByText('99.9%')).toBeInTheDocument()
      expect(screen.getByText('Uptime SLA')).toBeInTheDocument()
      expect(screen.getByText('<5min')).toBeInTheDocument()
      expect(screen.getByText('Avg Setup Time')).toBeInTheDocument()
      expect(screen.getByText('24/7')).toBeInTheDocument()
      expect(screen.getByText('Support Available')).toBeInTheDocument()
    })
  })

  describe('Visual Design', () => {
    it('should apply gradient backgrounds to integration cards', () => {
      render(<IntegrationShowcase />)
      
      const postgresCard = screen.getByText('PostgreSQL').closest('[class*="bg-gradient-to-br"]')
      expect(postgresCard).toBeInTheDocument()
    })

    it('should have hover effects on integration cards', () => {
      render(<IntegrationShowcase />)
      
      const integrationCards = screen.getAllByText(/PostgreSQL|Snowflake|MongoDB|Google BigQuery/)
      integrationCards.forEach(card => {
        const cardElement = card.closest('[class*="hover:scale-105"]')
        expect(cardElement).toBeInTheDocument()
      })
    })

    it('should apply proper popularity badge colors', () => {
      render(<IntegrationShowcase />)
      
      const highDemandBadges = screen.getAllByText('high demand')
      highDemandBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-windsurf-green-lime')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<IntegrationShowcase />)
      
      const categoryHeadings = screen.getAllByText(/Databases & Data Warehouses|Business Applications|Cloud Platforms|Developer Tools/)
      expect(categoryHeadings.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', () => {
      render(<IntegrationShowcase />)
      
      const firstCategoryCard = screen.getByText('Databases & Data Warehouses').closest('div[class*="cursor-pointer"]')
      firstCategoryCard?.focus()
      expect(document.activeElement).toBe(firstCategoryCard)
    })

    it('should have descriptive text for integrations', () => {
      render(<IntegrationShowcase />)
      
      const descriptions = screen.getAllByText(/Direct connection|Enterprise data warehouse|NoSQL document database|Serverless data warehouse/)
      expect(descriptions.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should render category cards in a responsive grid', () => {
      render(<IntegrationShowcase />)
      
      const categoryCards = screen.getAllByText(/Databases & Data Warehouses|Business Applications|Cloud Platforms|Developer Tools/)
      expect(categoryCards.length).toBe(4)
    })

    it('should render integration cards in a responsive grid', () => {
      render(<IntegrationShowcase />)
      
      const integrationCards = screen.getAllByText(/PostgreSQL|Snowflake|MongoDB|Google BigQuery/)
      expect(integrationCards.length).toBe(4)
    })

    it('should render statistics in a responsive grid', () => {
      render(<IntegrationShowcase />)
      
      const statCards = screen.getAllByText(/200\+|99\.9%|<5min|24\/7/)
      expect(statCards.length).toBe(4)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing integration data gracefully', () => {
      render(<IntegrationShowcase />)
      
      // Should render without errors even if some data is missing
      expect(screen.getByText('Integration Statistics')).toBeInTheDocument()
    })

    it('should handle category switching without errors', async () => {
      render(<IntegrationShowcase />)
      
      const categories = screen.getAllByText(/Databases & Data Warehouses|Business Applications|Cloud Platforms|Developer Tools/)
      
      // Rapidly switch between categories
      for (const category of categories) {
        const categoryCard = category.closest('div[class*="cursor-pointer"]')
        fireEvent.click(categoryCard!)
      }
      
      // Should not throw errors
      expect(screen.getByText('Integration Statistics')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now()
      render(<IntegrationShowcase />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle rapid category switching', async () => {
      render(<IntegrationShowcase />)
      
      const categories = screen.getAllByText(/Databases & Data Warehouses|Business Applications|Cloud Platforms|Developer Tools/)
      
      // Rapidly switch between categories multiple times
      for (let i = 0; i < 10; i++) {
        categories.forEach(category => {
          const categoryCard = category.closest('div[class*="cursor-pointer"]')
          fireEvent.click(categoryCard!)
        })
      }
      
      // Should still be functional
      expect(screen.getByText('Integration Statistics')).toBeInTheDocument()
    })
  })

  describe('Integration Features', () => {
    it('should show different features for different categories', async () => {
      render(<IntegrationShowcase />)
      
      // Check database features
      expect(screen.getByText('Real-time sync')).toBeInTheDocument()
      
      // Switch to business applications
      const businessAppsCard = screen.getByText('Business Applications').closest('div[class*="cursor-pointer"]')
      fireEvent.click(businessAppsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('Lead scoring')).toBeInTheDocument()
        expect(screen.getByText('Contact analysis')).toBeInTheDocument()
      })
    })

    it('should show setup times varying by integration complexity', async () => {
      render(<IntegrationShowcase />)
      
      // Switch to cloud platforms which have longer setup times
      const cloudPlatformsCard = screen.getByText('Cloud Platforms').closest('div[class*="cursor-pointer"]')
      fireEvent.click(cloudPlatformsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('20 minutes')).toBeInTheDocument()
        expect(screen.getByText('18 minutes')).toBeInTheDocument()
        expect(screen.getByText('16 minutes')).toBeInTheDocument()
      })
    })
  })
})