import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccessibilityProvider } from '@/contexts/accessibility-context'
import { 
  AccessibleInput, 
  AccessibleButton, 
  AccessibleCheckbox, 
  SkipLink,
  LiveRegion
} from '@/components/ui/accessible-form'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const renderWithAccessibility = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  )
}

describe('Core Accessibility Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AccessibleInput', () => {
    it('should render with proper ARIA attributes', () => {
      renderWithAccessibility(
        <AccessibleInput
          id="test-input"
          label="Test Input"
          required
          hint="This is a hint"
        />
      )

      const input = screen.getByLabelText(/test input/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(input).toHaveAttribute('aria-describedby')
      
      const label = screen.getByText(/test input/i)
      expect(label).toBeInTheDocument()
      expect(label).toHaveTextContent('*') // Required indicator
      
      const hint = screen.getByText(/this is a hint/i)
      expect(hint).toBeInTheDocument()
    })

    it('should handle error states correctly', () => {
      renderWithAccessibility(
        <AccessibleInput
          id="test-input"
          label="Test Input"
          error="This field is required"
        />
      )

      const input = screen.getByLabelText(/test input/i)
      expect(input).toHaveAttribute('aria-invalid', 'true')
      
      const error = screen.getByRole('alert')
      expect(error).toBeInTheDocument()
      expect(error).toHaveTextContent('This field is required')
    })

    it('should support password toggle functionality', () => {
      renderWithAccessibility(
        <AccessibleInput
          id="password-input"
          type="password"
          label="Password"
          showPasswordToggle
        />
      )

      const input = screen.getByLabelText(/password/i)
      expect(input).toHaveAttribute('type', 'password')
      
      const toggleButton = screen.getByLabelText(/show password/i)
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('AccessibleButton', () => {
    it('should render with proper accessibility attributes', () => {
      renderWithAccessibility(
        <AccessibleButton>
          Test Button
        </AccessibleButton>
      )

      const button = screen.getByRole('button', { name: /test button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-busy', 'false')
    })

    it('should handle loading state correctly', () => {
      renderWithAccessibility(
        <AccessibleButton loading loadingText="Loading...">
          Submit
        </AccessibleButton>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toBeDisabled()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('AccessibleCheckbox', () => {
    it('should render with proper labeling and description', () => {
      renderWithAccessibility(
        <AccessibleCheckbox
          id="test-checkbox"
          label="Test Checkbox"
          description="This is a description"
        />
      )

      const checkbox = screen.getByLabelText(/test checkbox/i)
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toHaveAttribute('type', 'checkbox')
      
      const description = screen.getByText(/this is a description/i)
      expect(description).toBeInTheDocument()
    })

    it('should handle error states', () => {
      renderWithAccessibility(
        <AccessibleCheckbox
          id="test-checkbox"
          label="Test Checkbox"
          error="Please check this box"
        />
      )

      const checkbox = screen.getByLabelText(/test checkbox/i)
      expect(checkbox).toHaveAttribute('aria-invalid', 'true')
      
      const error = screen.getByRole('alert')
      expect(error).toBeInTheDocument()
      expect(error).toHaveTextContent('Please check this box')
    })
  })

  describe('SkipLink', () => {
    it('should render with proper accessibility attributes', () => {
      renderWithAccessibility(
        <SkipLink href="#main-content">
          Skip to main content
        </SkipLink>
      )

      const skipLink = screen.getByText(/skip to main content/i)
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })
  })

  describe('LiveRegion', () => {
    it('should render with proper ARIA attributes', () => {
      renderWithAccessibility(
        <LiveRegion priority="assertive">
          Important announcement
        </LiveRegion>
      )

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
      expect(liveRegion).toHaveTextContent('Important announcement')
    })
  })

  describe('Accessibility Context Integration', () => {
    it('should provide accessibility context', () => {
      const TestComponent = () => {
        return (
          <div data-testid="test-component">
            <AccessibleInput
              id="context-test"
              label="Context Test"
            />
          </div>
        )
      }

      renderWithAccessibility(<TestComponent />)
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      expect(screen.getByLabelText(/context test/i)).toBeInTheDocument()
    })
  })

  describe('WCAG Compliance', () => {
    it('should meet minimum touch target requirements', () => {
      renderWithAccessibility(
        <AccessibleButton>
          Touch Target Test
        </AccessibleButton>
      )

      const button = screen.getByRole('button')
      // The button should have minimum touch target classes applied
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })

    it('should provide proper form labeling', () => {
      renderWithAccessibility(
        <form>
          <AccessibleInput
            id="form-test"
            label="Form Test Input"
            required
          />
        </form>
      )

      const input = screen.getByLabelText(/form test input/i)
      const form = screen.getByRole('form')
      
      expect(input).toBeInTheDocument()
      expect(form).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should support keyboard navigation attributes', () => {
      renderWithAccessibility(
        <div>
          <AccessibleInput
            id="nav-test-1"
            label="First Input"
          />
          <AccessibleInput
            id="nav-test-2"
            label="Second Input"
          />
          <AccessibleButton>
            Submit
          </AccessibleButton>
        </div>
      )

      const firstInput = screen.getByLabelText(/first input/i)
      const secondInput = screen.getByLabelText(/second input/i)
      const button = screen.getByRole('button')

      // All elements should be focusable
      expect(firstInput).not.toHaveAttribute('tabindex', '-1')
      expect(secondInput).not.toHaveAttribute('tabindex', '-1')
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })
  })
})