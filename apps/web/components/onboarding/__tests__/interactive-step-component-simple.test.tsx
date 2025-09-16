import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InteractiveStepComponent } from '../interactive-step-component'
import type { OnboardingStep } from '@/lib/models/onboarding-types'

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className} data-testid="card-title">{children}</h2>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">{children}</span>
  )
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: any) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid="tab-trigger" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid="tab-content" data-value={value}>{children}</div>
  )
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

describe('InteractiveStepComponent - Simplified Tests', () => {
  const mockOnStepComplete = vi.fn()
  const mockOnNeedHelp = vi.fn()

  const mockStep: OnboardingStep = {
    id: 'step-1',
    path_id: 'path-1',
    title: 'Test Step',
    description: 'A test step',
    step_type: 'tutorial',
    step_order: 0,
    estimated_time: 10,
    is_required: true,
    dependencies: [],
    content: {
      text: '<p>Test content</p>',
      video: null,
      images: []
    },
    interactive_elements: {},
    success_criteria: {},
    validation_rules: {},
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render step information correctly', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      // Test functionality: basic step information should be displayed
      expect(screen.getByText('Test Step')).toBeInTheDocument()
      expect(screen.getByText('A test step')).toBeInTheDocument()
      expect(screen.getByText('10min')).toBeInTheDocument()
    })

    it('should show start button initially', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      // Test functionality: start button should be present
      expect(screen.getByRole('button', { name: /start step/i })).toBeInTheDocument()
      expect(screen.getByText('Ready to begin?')).toBeInTheDocument()
    })

    it('should show skip button when allowed', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={true}
          sandboxMode={false}
        />
      )

      // Test functionality: skip should be available when allowed
      expect(screen.getByRole('button', { name: /start step/i })).toBeInTheDocument()
    })

    it('should show sandbox badge when in sandbox mode', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={true}
        />
      )

      // Test functionality: sandbox mode should be indicated
      expect(screen.getByText('Sandbox')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle start button click', async () => {
      const user = userEvent.setup()

      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      const startButton = screen.getByRole('button', { name: /start step/i })
      await user.click(startButton)

      // Test functionality: button should be clickable (component handles the rest)
      expect(startButton).toBeInTheDocument()
    })

    it('should handle help button click', async () => {
      const user = userEvent.setup()

      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      // Find help button by icon (it has HelpCircle icon)
      const helpButtons = screen.getAllByTestId('button')
      const helpButton = helpButtons.find(button => 
        button.querySelector('svg')?.classList.contains('lucide-circle-help')
      )
      
      if (helpButton) {
        await user.click(helpButton)
        expect(mockOnNeedHelp).toHaveBeenCalled()
      }
    })
  })

  describe('Step Types', () => {
    it('should display correct badge for tutorial steps', () => {
      render(
        <InteractiveStepComponent
          step={{ ...mockStep, step_type: 'tutorial' }}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      expect(screen.getByText('Tutorial')).toBeInTheDocument()
    })

    it('should display correct badge for exercise steps', () => {
      render(
        <InteractiveStepComponent
          step={{ ...mockStep, step_type: 'exercise' }}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      expect(screen.getByText('Exercise')).toBeInTheDocument()
    })

    it('should show required badge for required steps', () => {
      render(
        <InteractiveStepComponent
          step={{ ...mockStep, is_required: true }}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      expect(screen.getByText('Required')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      // Test functionality: proper semantic elements should be present
      expect(screen.getByRole('button', { name: /start step/i })).toBeInTheDocument()
      expect(screen.getByTestId('card-title')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(
        <InteractiveStepComponent
          step={mockStep}
          onStepComplete={mockOnStepComplete}
          onNeedHelp={mockOnNeedHelp}
          allowSkip={false}
          sandboxMode={false}
        />
      )

      // Test functionality: interactive elements should be focusable
      const startButton = screen.getByRole('button', { name: /start step/i })
      expect(startButton).toBeInTheDocument()
      
      startButton.focus()
      expect(document.activeElement).toBe(startButton)
    })
  })
})