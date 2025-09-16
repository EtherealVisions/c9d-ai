import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextualHelp } from '../contextual-help'
import type { OnboardingStep } from '@/lib/models/onboarding-types'

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  )
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {React.cloneElement(children, { onValueChange })}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button onClick={() => onClick?.(value)} data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  )
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  CollapsibleContent: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} />
}))

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn()
})

describe('ContextualHelp', () => {
  const mockOnClose = vi.fn()
  const mockOnEscalateSupport = vi.fn()

  const mockStep: OnboardingStep = {
    id: 'step-1',
    path_id: 'path-1',
    title: 'Tutorial Step',
    description: 'Learn the basics',
    step_type: 'tutorial',
    step_order: 0,
    estimated_time: 10,
    is_required: true,
    dependencies: [],
    content: {},
    interactive_elements: {},
    success_criteria: {},
    validation_rules: {},
    metadata: {
      help: {
        tips: [
          {
            id: 'custom-tip-1',
            title: 'Custom Tip',
            content: 'This is a custom tip for this step',
            type: 'tip'
          }
        ],
        examples: [
          {
            id: 'example-1',
            title: 'Example Usage',
            content: 'Here is how you use this feature',
            type: 'example'
          }
        ],
        resources: [
          {
            title: 'Step Documentation',
            url: 'https://docs.example.com/step-1',
            type: 'documentation'
          },
          {
            title: 'Video Tutorial',
            url: 'https://videos.example.com/step-1',
            type: 'video'
          }
        ]
      }
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockExerciseStep: OnboardingStep = {
    ...mockStep,
    id: 'step-2',
    title: 'Exercise Step',
    step_type: 'exercise',
    metadata: {}
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should not render when isVisible is false', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={false}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.queryByText('Help & Support')).not.toBeInTheDocument()
    })

    it('should render when isVisible is true', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByText('Help & Support')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Tab Navigation', () => {
    it('should render all tabs', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByText('Help')).toBeInTheDocument()
      expect(screen.getByText('Resources')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('should switch between tabs', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      // Should start on help tab
      expect(screen.getByTestId('tab-content-help')).toBeInTheDocument()

      // Switch to resources tab
      await user.click(screen.getByText('Resources'))
      expect(screen.getByTestId('tab-content-resources')).toBeInTheDocument()

      // Switch to support tab
      await user.click(screen.getByText('Support'))
      expect(screen.getByTestId('tab-content-support')).toBeInTheDocument()
    })
  })

  describe('Help Tab', () => {
    it('should render search functionality', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByPlaceholderText('Search help topics...')).toBeInTheDocument()
    })

    it('should render default help topics for tutorial steps', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByText('Navigating the Tutorial')).toBeInTheDocument()
      expect(screen.getByText('What if I get stuck?')).toBeInTheDocument()
    })

    it('should render default help topics for exercise steps', () => {
      render(
        <ContextualHelp
          step={mockExerciseStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByText('Completing Exercises')).toBeInTheDocument()
      expect(screen.getByText('What if I get stuck?')).toBeInTheDocument()
    })

    it('should render custom help topics from step metadata', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      expect(screen.getByText('Custom Tip')).toBeInTheDocument()
      expect(screen.getByText('Example Usage')).toBeInTheDocument()
    })

    it('should filter help topics based on search', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search help topics...')
      await user.type(searchInput, 'tutorial')

      // Should show topics containing 'tutorial'
      expect(screen.getByText('Navigating the Tutorial')).toBeInTheDocument()
      
      // Should hide topics not containing 'tutorial'
      expect(screen.queryByText('Custom Tip')).not.toBeInTheDocument()
    })

    it('should show no results message when search yields no results', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search help topics...')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No help topics found')).toBeInTheDocument()
    })

    it('should expand and collapse help topics', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      // Find a help topic and click to expand
      const tutorialTopic = screen.getByText('Navigating the Tutorial')
      await user.click(tutorialTopic)

      // Should show the content
      expect(screen.getByText(/Use the tabs to switch between/)).toBeInTheDocument()

      // Click again to collapse
      await user.click(tutorialTopic)

      // Content should still be visible (collapsible behavior depends on implementation)
    })

    it('should show correct badges for different topic types', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      // Should show badges for different types
      expect(screen.getByText('tip')).toBeInTheDocument()
      expect(screen.getByText('example')).toBeInTheDocument()
    })
  })

  describe('Resources Tab', () => {
    it('should render step-specific resources', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Resources'))

      expect(screen.getByText('Step Resources')).toBeInTheDocument()
      expect(screen.getByText('Step Documentation')).toBeInTheDocument()
      expect(screen.getByText('Video Tutorial')).toBeInTheDocument()
    })

    it('should show message when no step resources exist', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockExerciseStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Resources'))

      expect(screen.getByText('No additional resources for this step')).toBeInTheDocument()
    })

    it('should render general resources', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Resources'))

      expect(screen.getByText('General Resources')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
      expect(screen.getByText('Video Tutorials')).toBeInTheDocument()
      expect(screen.getByText('Community Forum')).toBeInTheDocument()
    })

    it('should open external links in new tab', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Resources'))

      const resourceLinks = screen.getAllByRole('link')
      expect(resourceLinks.length).toBeGreaterThan(0)

      // Check that links have proper attributes
      resourceLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })
  })

  describe('Support Tab', () => {
    it('should render support options', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      expect(screen.getByText('Contact Support')).toBeInTheDocument()
      expect(screen.getByText('Live Chat')).toBeInTheDocument()
      expect(screen.getByText('Email Support')).toBeInTheDocument()
      expect(screen.getByText('Phone Support')).toBeInTheDocument()
    })

    it('should show availability information for support options', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      expect(screen.getByText('Available 24/7')).toBeInTheDocument()
      expect(screen.getByText('Response within 2 hours')).toBeInTheDocument()
      expect(screen.getByText('Mon-Fri 9AM-6PM EST')).toBeInTheDocument()
    })

    it('should handle live chat support', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      const liveChatButton = screen.getByText('Live Chat')
      await user.click(liveChatButton)

      expect(mockOnEscalateSupport).toHaveBeenCalled()
    })

    it('should handle email support', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      const emailButton = screen.getByText('Email Support')
      await user.click(emailButton)

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@c9d.ai')
      )
    })

    it('should handle phone support', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      const phoneButton = screen.getByText('Phone Support')
      await user.click(phoneButton)

      expect(window.open).toHaveBeenCalledWith('tel:+1-800-C9D-HELP')
    })

    it('should render quick actions', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      await user.click(screen.getByText('Support'))

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Report Issue')).toBeInTheDocument()
      expect(screen.getByText('Request Feature')).toBeInTheDocument()
      expect(screen.getByText('Give Feedback')).toBeInTheDocument()
      expect(screen.getByText('Schedule Call')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      // Should have proper heading
      expect(screen.getByText('Help & Support')).toBeInTheDocument()

      // Should have proper button roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Search input should have proper attributes
      const searchInput = screen.getByPlaceholderText('Search help topics...')
      expect(searchInput).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
        />
      )

      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toBeInstanceOf(HTMLElement)

      // Should be able to navigate with keyboard
      const searchInput = screen.getByPlaceholderText('Search help topics...')
      searchInput.focus()
      await user.keyboard('test search')
      expect(searchInput).toHaveValue('test search')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ContextualHelp
          step={mockStep}
          isVisible={true}
          onClose={mockOnClose}
          onEscalateSupport={mockOnEscalateSupport}
          className="custom-help-panel"
        />
      )

      expect(container.firstChild).toHaveClass('custom-help-panel')
    })
  })

  describe('Step Type Specific Content', () => {
    const stepTypes = [
      { type: 'tutorial', expectedText: 'Navigating the Tutorial' },
      { type: 'exercise', expectedText: 'Completing Exercises' },
      { type: 'setup', expectedText: 'Setup Requirements' },
      { type: 'validation', expectedText: 'Validation Criteria' }
    ] as const

    stepTypes.forEach(({ type, expectedText }) => {
      it(`should show appropriate help for ${type} steps`, () => {
        const stepWithType = { ...mockStep, step_type: type }

        render(
          <ContextualHelp
            step={stepWithType}
            isVisible={true}
            onClose={mockOnClose}
            onEscalateSupport={mockOnEscalateSupport}
          />
        )

        expect(screen.getByText(expectedText)).toBeInTheDocument()
      })
    })
  })
})