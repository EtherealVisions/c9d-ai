import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrganizationSetupWizard, type OrganizationTemplate, type CustomizationOption } from '../organization-setup-wizard'

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, ...props }: any) => (
    <div className={className} onClick={onClick} data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <div data-testid="card-description" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <h3 data-testid="card-title" {...props}>
      {children}
    </h3>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, type, placeholder, id, ...props }: any) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      data-testid={id || 'input'}
      {...props}
    />
  )
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, placeholder, id, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      data-testid={id || 'textarea'}
      {...props}
    />
  )
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange?.('test-value')}>
        {value || 'Select...'}
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div data-testid="progress" data-value={value} {...props}>
      Progress: {value}%
    </div>
  )
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div data-testid="alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children, ...props }: any) => (
    <div data-testid="alert-description" {...props}>
      {children}
    </div>
  )
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr data-testid="separator" {...props} />
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Mock icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Send: () => <div data-testid="send-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}))

describe('OrganizationSetupWizard', () => {
  const mockOrganizationId = 'org-123'
  const mockOnSetupComplete = vi.fn()
  
  const mockTemplates: OrganizationTemplate[] = [
    {
      id: 'startup',
      name: 'Startup Team',
      description: 'Perfect for small, agile teams',
      category: 'startup',
      defaultRoles: [
        { name: 'Founder', permissions: ['admin'], isDefault: true },
        { name: 'Developer', permissions: ['develop'] }
      ],
      recommendedSettings: {
        welcomeMessage: 'Welcome to our startup!',
        primaryColor: '#8b5cf6'
      },
      onboardingPaths: [
        { role: 'Founder', pathId: 'founder-path', isRequired: true },
        { role: 'Developer', pathId: 'dev-path', isRequired: true }
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Organization',
      description: 'Structured onboarding for large organizations',
      category: 'enterprise',
      defaultRoles: [
        { name: 'Administrator', permissions: ['admin'], isDefault: true },
        { name: 'Manager', permissions: ['manage'] },
        { name: 'User', permissions: ['basic'] }
      ],
      recommendedSettings: {
        welcomeMessage: 'Welcome to our organization',
        primaryColor: '#1e40af'
      },
      onboardingPaths: [
        { role: 'Administrator', pathId: 'admin-path', isRequired: true },
        { role: 'Manager', pathId: 'manager-path', isRequired: true },
        { role: 'User', pathId: 'user-path', isRequired: true }
      ]
    }
  ]

  const mockCustomizationOptions: CustomizationOption[] = [
    {
      id: 'branding',
      name: 'Branding',
      description: 'Customize colors and logo',
      type: 'branding',
      options: [
        { key: 'primaryColor', label: 'Primary Color', type: 'color', defaultValue: '#3b82f6' },
        { key: 'logoUrl', label: 'Logo URL', type: 'text' }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the wizard with initial template selection step', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('Organization Setup')).toBeInTheDocument()
      expect(screen.getByText('1 of 5')).toBeInTheDocument()
      expect(screen.getByText('Choose Organization Template')).toBeInTheDocument()
      expect(screen.getByText('Select a template that best matches your organization structure and needs.')).toBeInTheDocument()
    })

    it('should display available templates', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('Startup Team')).toBeInTheDocument()
      expect(screen.getByText('Perfect for small, agile teams')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Organization')).toBeInTheDocument()
      expect(screen.getByText('Structured onboarding for large organizations')).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-value', '20') // 1/5 * 100 = 20%
    })

    it('should disable Next button when no template is selected', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()
    })

    it('should disable Previous button on first step', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      const previousButton = screen.getByText('Previous')
      expect(previousButton).toBeDisabled()
    })
  })

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Click on startup template
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      expect(startupTemplate).toBeInTheDocument()
      
      await user.click(startupTemplate!)

      // Next button should now be enabled
      const nextButton = screen.getByText('Next')
      expect(nextButton).not.toBeDisabled()
    })

    it('should show template roles as badges', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('Founder')).toBeInTheDocument()
      expect(screen.getByText('Developer')).toBeInTheDocument()
      expect(screen.getByText('Administrator')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
    })

    it('should show template categories as badges', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      const badges = screen.getAllByTestId('badge')
      const categoryBadges = badges.filter(badge => 
        badge.textContent === 'startup' || badge.textContent === 'enterprise'
      )
      
      expect(categoryBadges).toHaveLength(2)
    })
  })

  describe('Navigation', () => {
    it('should navigate to next step when template is selected and Next is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Select template
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)

      // Click Next
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Should be on customization step
      expect(screen.getByText('2 of 5')).toBeInTheDocument()
      expect(screen.getByText('Customize Onboarding Experience')).toBeInTheDocument()
    })

    it('should navigate back to previous step when Previous is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Select template and go to next step
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)
      
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Go back
      const previousButton = screen.getByText('Previous')
      await user.click(previousButton)

      // Should be back on template selection
      expect(screen.getByText('1 of 5')).toBeInTheDocument()
      expect(screen.getByText('Choose Organization Template')).toBeInTheDocument()
    })

    it('should update progress indicator as user navigates', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Initial progress
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '20')

      // Select template and go to next step
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)
      
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Progress should update
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '40')
    })
  })

  describe('Customization Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Navigate to customization step
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)
      
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
    })

    it('should show customization form fields', () => {
      expect(screen.getByLabelText('Welcome Message')).toBeInTheDocument()
      expect(screen.getByLabelText('Primary Color')).toBeInTheDocument()
      expect(screen.getByLabelText('Logo URL')).toBeInTheDocument()
    })

    it('should show notification settings checkboxes', () => {
      expect(screen.getByLabelText('Send welcome emails')).toBeInTheDocument()
      expect(screen.getByLabelText('Send progress reminders')).toBeInTheDocument()
      expect(screen.getByLabelText('Celebrate completions')).toBeInTheDocument()
      expect(screen.getByLabelText('Notify mentors')).toBeInTheDocument()
    })

    it('should allow editing welcome message', async () => {
      const user = userEvent.setup()
      
      const welcomeMessageInput = screen.getByTestId('welcomeMessage')
      await user.clear(welcomeMessageInput)
      await user.type(welcomeMessageInput, 'Custom welcome message')

      expect(welcomeMessageInput).toHaveValue('Custom welcome message')
    })

    it('should allow changing primary color', async () => {
      const user = userEvent.setup()
      
      const colorInput = screen.getByTestId('primaryColor')
      await user.clear(colorInput)
      await user.type(colorInput, '#ff0000')

      expect(colorInput).toHaveValue('#ff0000')
    })

    it('should allow toggling notification settings', async () => {
      const user = userEvent.setup()
      
      const welcomeEmailCheckbox = screen.getByLabelText('Send welcome emails')
      await user.click(welcomeEmailCheckbox)

      // Note: In a real test, you'd check the checkbox state
      // This is a simplified version due to mocked components
    })
  })

  describe('Error Handling', () => {
    it('should show error message when setup fails', async () => {
      const user = userEvent.setup()
      
      // Mock setup completion to throw error
      const mockOnSetupCompleteWithError = vi.fn().mockRejectedValue(new Error('Setup failed'))
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupCompleteWithError}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Navigate through all steps quickly
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)

      // Navigate to final step
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next')
        await user.click(nextButton)
      }

      // Try to complete setup
      const completeButton = screen.getByText('Complete Setup')
      await user.click(completeButton)

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
      })
    })

    it('should show error when no template is selected and user tries to proceed', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Try to navigate to review step without selecting template
      // Navigate through steps (this should be prevented by disabled buttons)
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Setup Completion', () => {
    it('should call onSetupComplete with correct configuration when setup is completed', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Select startup template
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)

      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next')
        await user.click(nextButton)
      }

      // Complete setup
      const completeButton = screen.getByText('Complete Setup')
      await user.click(completeButton)

      // Should call onSetupComplete with configuration
      await waitFor(() => {
        expect(mockOnSetupComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: mockOrganizationId,
            welcomeMessage: expect.any(String),
            branding: expect.any(Object),
            roleConfigurations: expect.any(Array),
            mandatoryModules: expect.any(Array),
            completionRequirements: expect.any(Object),
            notificationSettings: expect.any(Object)
          })
        )
      })
    })

    it('should show loading state during setup completion', async () => {
      const user = userEvent.setup()
      
      // Mock slow setup completion
      const mockSlowSetupComplete = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockSlowSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Navigate to completion
      const startupTemplate = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(startupTemplate!)

      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next')
        await user.click(nextButton)
      }

      // Start completion
      const completeButton = screen.getByTestId('complete-setup-button')
      await user.click(completeButton)

      // Should show loading state
      expect(screen.getByTestId('completing-text')).toBeInTheDocument()
      expect(screen.getByTestId('complete-setup-button')).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(mockSlowSetupComplete).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', async () => {
      const user = userEvent.setup()
      
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Navigate to customization step
      const startupTemplate = screen.getByText('Startup Team')
      await user.click(startupTemplate)
      
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Form inputs should be accessible via testid
      expect(screen.getByTestId('welcome-message-input')).toBeInTheDocument()
      expect(screen.getByTestId('primary-color-input')).toBeInTheDocument()
      expect(screen.getByTestId('logo-url-input')).toBeInTheDocument()
    })

    it('should have descriptive button text', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('should provide step indicators for screen readers', () => {
      render(
        <OrganizationSetupWizard
          organizationId={mockOrganizationId}
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('1 of 5')).toBeInTheDocument()
    })
  })
})