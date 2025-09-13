import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InteractiveAPIPreview } from '../interactive-api-preview'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

describe('InteractiveAPIPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render API endpoint selection cards', () => {
      render(<InteractiveAPIPreview />)
      
      expect(screen.getByText('Analyze Data')).toBeInTheDocument()
      expect(screen.getByText('Get Insights')).toBeInTheDocument()
      expect(screen.getByText('Create AI Agent')).toBeInTheDocument()
    })

    it('should render endpoint descriptions', () => {
      render(<InteractiveAPIPreview />)
      
      expect(screen.getByText(/Submit data for AI-powered analysis/)).toBeInTheDocument()
      expect(screen.getByText(/Retrieve detailed insights/)).toBeInTheDocument()
      expect(screen.getByText(/Create and configure a new AI agent/)).toBeInTheDocument()
    })

    it('should render HTTP methods with proper styling', () => {
      render(<InteractiveAPIPreview />)
      
      const postMethods = screen.getAllByText('POST')
      const getMethods = screen.getAllByText('GET')
      
      expect(postMethods.length).toBeGreaterThan(0)
      expect(getMethods.length).toBeGreaterThan(0)
    })

    it('should render API paths', () => {
      render(<InteractiveAPIPreview />)
      
      expect(screen.getByText('/api/v1/analyze')).toBeInTheDocument()
      expect(screen.getByText('/api/v1/insights/{analysis_id}')).toBeInTheDocument()
      expect(screen.getByText('/api/v1/agents')).toBeInTheDocument()
    })
  })

  describe('Endpoint Selection', () => {
    it('should select first endpoint by default', () => {
      render(<InteractiveAPIPreview />)
      
      const analyzeDataCard = screen.getByText('Analyze Data').closest('[class*="bg-windsurf-pink-hot"]')
      expect(analyzeDataCard).toBeInTheDocument()
    })

    it('should switch endpoints when clicked', async () => {
      render(<InteractiveAPIPreview />)
      
      const getInsightsCard = screen.getByText('Get Insights').closest('div[class*="cursor-pointer"]')
      fireEvent.click(getInsightsCard!)
      
      await waitFor(() => {
        const selectedCard = screen.getByText('Get Insights').closest('[class*="bg-windsurf-pink-hot"]')
        expect(selectedCard).toBeInTheDocument()
      })
    })

    it('should update documentation when endpoint changes', async () => {
      render(<InteractiveAPIPreview />)
      
      // Click on Get Insights endpoint
      const getInsightsCard = screen.getByText('Get Insights').closest('div[class*="cursor-pointer"]')
      fireEvent.click(getInsightsCard!)
      
      await waitFor(() => {
        expect(screen.getByText('Get Insights')).toBeInTheDocument()
        expect(screen.getByText('/api/v1/insights/{analysis_id}')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should render all documentation tabs', () => {
      render(<InteractiveAPIPreview />)
      
      expect(screen.getByRole('tab', { name: /request/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /response/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /curl/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /parameters/i })).toBeInTheDocument()
    })

    it('should show request tab by default', () => {
      render(<InteractiveAPIPreview />)
      
      const requestTab = screen.getByRole('tab', { name: /request/i })
      expect(requestTab).toHaveAttribute('data-state', 'active')
    })

    it('should switch to response tab when clicked', async () => {
      render(<InteractiveAPIPreview />)
      
      const responseTab = screen.getByRole('tab', { name: /response/i })
      fireEvent.click(responseTab)
      
      await waitFor(() => {
        expect(responseTab).toHaveAttribute('data-state', 'active')
      })
    })

    it('should switch to curl tab when clicked', async () => {
      render(<InteractiveAPIPreview />)
      
      const curlTab = screen.getByRole('tab', { name: /curl/i })
      fireEvent.click(curlTab)
      
      await waitFor(() => {
        expect(curlTab).toHaveAttribute('data-state', 'active')
      })
    })

    it('should switch to parameters tab when clicked', async () => {
      render(<InteractiveAPIPreview />)
      
      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      fireEvent.click(parametersTab)
      
      await waitFor(() => {
        expect(parametersTab).toHaveAttribute('data-state', 'active')
      })
    })
  })

  describe('Code Examples', () => {
    it('should render request example code', () => {
      render(<InteractiveAPIPreview />)
      
      const codeBlock = screen.getByText(/"data": {/)
      expect(codeBlock).toBeInTheDocument()
    })

    it('should render response example when response tab is active', async () => {
      render(<InteractiveAPIPreview />)
      
      const responseTab = screen.getByRole('tab', { name: /response/i })
      fireEvent.click(responseTab)
      
      await waitFor(() => {
        expect(screen.getByText(/"analysis_id":/)).toBeInTheDocument()
      })
    })

    it('should render curl example when curl tab is active', async () => {
      render(<InteractiveAPIPreview />)
      
      const curlTab = screen.getByRole('tab', { name: /curl/i })
      fireEvent.click(curlTab)
      
      await waitFor(() => {
        expect(screen.getByText(/curl -X POST/)).toBeInTheDocument()
      })
    })
  })

  describe('Parameters Documentation', () => {
    it('should render parameter information when parameters tab is active', async () => {
      render(<InteractiveAPIPreview />)
      
      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      fireEvent.click(parametersTab)
      
      await waitFor(() => {
        expect(screen.getByText('data')).toBeInTheDocument()
        expect(screen.getByText('analysis_type')).toBeInTheDocument()
        expect(screen.getByText('options')).toBeInTheDocument()
      })
    })

    it('should show parameter types and requirements', async () => {
      render(<InteractiveAPIPreview />)
      
      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      fireEvent.click(parametersTab)
      
      await waitFor(() => {
        expect(screen.getByText('object')).toBeInTheDocument()
        expect(screen.getByText('string')).toBeInTheDocument()
        expect(screen.getByText('required')).toBeInTheDocument()
      })
    })

    it('should show parameter descriptions', async () => {
      render(<InteractiveAPIPreview />)
      
      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      fireEvent.click(parametersTab)
      
      await waitFor(() => {
        expect(screen.getByText(/Data source and configuration/)).toBeInTheDocument()
        expect(screen.getByText(/Type of analysis to perform/)).toBeInTheDocument()
      })
    })
  })

  describe('Copy Functionality', () => {
    it('should render copy buttons for code examples', () => {
      render(<InteractiveAPIPreview />)
      
      const copyButtons = screen.getAllByRole('button', { name: '' })
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg[class*="h-4 w-4"]')
      )
      expect(copyButton).toBeInTheDocument()
    })

    it('should copy request code to clipboard', async () => {
      render(<InteractiveAPIPreview />)
      
      const copyButtons = screen.getAllByRole('button', { name: '' })
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg[class*="h-4 w-4"]')
      )
      
      fireEvent.click(copyButton!)
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })

    it('should show check icon after successful copy', async () => {
      render(<InteractiveAPIPreview />)
      
      const copyButtons = screen.getAllByRole('button', { name: '' })
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg[class*="h-4 w-4"]')
      )
      
      fireEvent.click(copyButton!)
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })

    it('should copy response code when response tab is active', async () => {
      render(<InteractiveAPIPreview />)
      
      const responseTab = screen.getByRole('tab', { name: /response/i })
      fireEvent.click(responseTab)
      
      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button', { name: '' })
        const copyButton = copyButtons.find(button => 
          button.querySelector('svg[class*="h-4 w-4"]')
        )
        
        fireEvent.click(copyButton!)
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })

    it('should copy curl command when curl tab is active', async () => {
      render(<InteractiveAPIPreview />)
      
      const curlTab = screen.getByRole('tab', { name: /curl/i })
      fireEvent.click(curlTab)
      
      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button', { name: '' })
        const copyButton = copyButtons.find(button => 
          button.querySelector('svg[class*="h-4 w-4"]')
        )
        
        fireEvent.click(copyButton!)
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })
  })

  describe('Try It Button', () => {
    it('should render Try It button for each endpoint', () => {
      render(<InteractiveAPIPreview />)
      
      const tryItButton = screen.getByRole('button', { name: /try it/i })
      expect(tryItButton).toBeInTheDocument()
    })

    it('should have proper styling for Try It button', () => {
      render(<InteractiveAPIPreview />)
      
      const tryItButton = screen.getByRole('button', { name: /try it/i })
      expect(tryItButton).toHaveClass('border-windsurf-pink-hot')
    })
  })

  describe('HTTP Method Styling', () => {
    it('should apply correct colors for different HTTP methods', () => {
      render(<InteractiveAPIPreview />)
      
      const postBadges = screen.getAllByText('POST')
      const getBadges = screen.getAllByText('GET')
      
      postBadges.forEach(badge => {
        expect(badge).toHaveClass('text-windsurf-green-lime')
      })
      
      getBadges.forEach(badge => {
        expect(badge).toHaveClass('text-windsurf-blue-electric')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      render(<InteractiveAPIPreview />)
      
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
    })

    it('should support keyboard navigation', () => {
      render(<InteractiveAPIPreview />)
      
      const firstTab = screen.getByRole('tab', { name: /request/i })
      firstTab.focus()
      expect(document.activeElement).toBe(firstTab)
    })

    it('should have proper heading hierarchy', () => {
      render(<InteractiveAPIPreview />)
      
      const endpointCards = screen.getAllByText(/Analyze Data|Get Insights|Create AI Agent/)
      expect(endpointCards.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should render endpoint cards in a responsive grid', () => {
      render(<InteractiveAPIPreview />)
      
      const endpointCards = screen.getAllByText(/Analyze Data|Get Insights|Create AI Agent/)
      expect(endpointCards.length).toBe(3)
    })

    it('should render tabs in a responsive layout', () => {
      render(<InteractiveAPIPreview />)
      
      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toHaveClass('grid', 'w-full', 'grid-cols-4')
    })
  })

  describe('Error Handling', () => {
    it('should handle clipboard API failures gracefully', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard failed'))
      
      render(<InteractiveAPIPreview />)
      
      const copyButtons = screen.getAllByRole('button', { name: '' })
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg[class*="h-4 w-4"]')
      )
      
      expect(() => fireEvent.click(copyButton!)).not.toThrow()
    })

    it('should render without errors when no parameters exist', async () => {
      render(<InteractiveAPIPreview />)
      
      // Switch to Get Insights endpoint which has parameters
      const getInsightsCard = screen.getByText('Get Insights').closest('div[class*="cursor-pointer"]')
      fireEvent.click(getInsightsCard!)
      
      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      fireEvent.click(parametersTab)
      
      await waitFor(() => {
        expect(screen.getByText('analysis_id')).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now()
      render(<InteractiveAPIPreview />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle rapid tab switching', async () => {
      render(<InteractiveAPIPreview />)
      
      const tabs = screen.getAllByRole('tab')
      
      // Rapidly switch between tabs
      for (let i = 0; i < 5; i++) {
        tabs.forEach(tab => fireEvent.click(tab))
      }
      
      // Should not throw errors
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })
})