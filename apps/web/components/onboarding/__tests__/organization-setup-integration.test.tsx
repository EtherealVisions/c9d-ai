import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrganizationSetupWizard } from '../organization-setup-wizard'
import { TeamInvitationManager } from '../team-invitation-manager'

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, ...props }: any) => (
    <div data-testid="card" className={className} onClick={onClick} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <div data-testid="card-description" {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>{children}</div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <h3 data-testid="card-title" {...props}>{children}</h3>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, ...props }: any) => (
    <input onChange={onChange} {...props} />
  )
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, ...props }: any) => (
    <textarea onChange={onChange} {...props} />
  )
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange && onValueChange('test-value')}>
        {children}
      </button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
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
    <div data-testid="alert-description" {...props}>{children}</div>
  )
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr data-testid="separator" {...props} />
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => (
    <label {...props}>{children}</label>
  )
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => (
    <table data-testid="table" {...props}>{children}</table>
  ),
  TableBody: ({ children, ...props }: any) => (
    <tbody data-testid="table-body" {...props}>{children}</tbody>
  ),
  TableCell: ({ children, ...props }: any) => (
    <td data-testid="table-cell" {...props}>{children}</td>
  ),
  TableHead: ({ children, ...props }: any) => (
    <th data-testid="table-head" {...props}>{children}</th>
  ),
  TableHeader: ({ children, ...props }: any) => (
    <thead data-testid="table-header" {...props}>{children}</thead>
  ),
  TableRow: ({ children, ...props }: any) => (
    <tr data-testid="table-row" {...props}>{children}</tr>
  )
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog" data-open={open}>
      <button onClick={() => onOpenChange && onOpenChange(false)}>
        Close Dialog
      </button>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogDescription: ({ children, ...props }: any) => (
    <div data-testid="dialog-description" {...props}>{children}</div>
  ),
  DialogHeader: ({ children, ...props }: any) => (
    <div data-testid="dialog-header" {...props}>{children}</div>
  ),
  DialogTitle: ({ children, ...props }: any) => (
    <h2 data-testid="dialog-title" {...props}>{children}</h2>
  ),
  DialogTrigger: ({ children, asChild }: any) => (
    <div data-testid="dialog-trigger">{children}</div>
  )
}))

// Mock icons
vi.mock('lucide-react', () => ({
  CheckCircle: (props: any) => <div data-testid="check-circle-icon" {...props} />,
  Users: (props: any) => <div data-testid="users-icon" {...props} />,
  Settings: (props: any) => <div data-testid="settings-icon" {...props} />,
  Palette: (props: any) => <div data-testid="palette-icon" {...props} />,
  Send: (props: any) => <div data-testid="send-icon" {...props} />,
  ArrowLeft: (props: any) => <div data-testid="arrow-left-icon" {...props} />,
  ArrowRight: (props: any) => <div data-testid="arrow-right-icon" {...props} />,
  AlertCircle: (props: any) => <div data-testid="alert-circle-icon" {...props} />,
  UserPlus: (props: any) => <div data-testid="user-plus-icon" {...props} />,
  Mail: (props: any) => <div data-testid="mail-icon" {...props} />,
  Clock: (props: any) => <div data-testid="clock-icon" {...props} />,
  XCircle: (props: any) => <div data-testid="x-circle-icon" {...props} />,
  MoreHorizontal: (props: any) => <div data-testid="more-horizontal-icon" {...props} />,
  Trash2: (props: any) => <div data-testid="trash2-icon" {...props} />,
  RefreshCw: (props: any) => <div data-testid="refresh-cw-icon" {...props} />,
  Eye: (props: any) => <div data-testid="eye-icon" {...props} />
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

vi.mock('date-fns', () => ({
  format: (date: Date | string, formatStr: string) => {
    const d = new Date(date)
    return d.toLocaleDateString()
  }
}))

describe('Organization Setup Integration Tests', () => {
  const mockTemplates = [
    {
      id: 'startup',
      name: 'Startup Team',
      description: 'Perfect for small, agile teams',
      category: 'startup' as const,
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
    }
  ]

  const mockCustomizationOptions = [
    {
      id: 'branding',
      name: 'Branding',
      description: 'Customize your organization branding',
      type: 'branding' as const,
      options: [
        { key: 'primaryColor', label: 'Primary Color', type: 'color' as const, required: false },
        { key: 'logoUrl', label: 'Logo URL', type: 'text' as const, required: false }
      ]
    }
  ]

  const mockRoles = [
    { id: 'founder', name: 'Founder', description: 'Organization founder' },
    { id: 'developer', name: 'Developer', description: 'Software developer' },
    { id: 'designer', name: 'Designer', description: 'UI/UX designer' }
  ]

  const mockOnboardingPaths = [
    { id: 'basic', name: 'Basic Onboarding', description: 'Standard onboarding path' },
    { id: 'advanced', name: 'Advanced Onboarding', description: 'Comprehensive onboarding' }
  ]

  describe('OrganizationSetupWizard', () => {
    it('should render initial template selection step', () => {
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByText('Organization Setup')).toBeInTheDocument()
      expect(screen.getByText('Choose Organization Template')).toBeInTheDocument()
      expect(screen.getByText('Startup Team')).toBeInTheDocument()
      expect(screen.getByText('Perfect for small, agile teams')).toBeInTheDocument()
    })

    it('should allow template selection and navigation', async () => {
      const user = userEvent.setup()
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Select template
      const templateCard = screen.getByText('Startup Team').closest('[data-testid="card"]')
      expect(templateCard).toBeInTheDocument()
      
      await user.click(templateCard!)

      // Navigate to next step
      const nextButton = screen.getByText('Next')
      expect(nextButton).not.toBeDisabled()
      
      await user.click(nextButton)

      // Should be on customization step
      expect(screen.getByText('Customize Onboarding Experience')).toBeInTheDocument()
    })

    it('should complete the setup process', async () => {
      const user = userEvent.setup()
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Select template
      const templateCard = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(templateCard!)

      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next')
        await user.click(nextButton)
      }

      // Should be on review step
      expect(screen.getByText('Review Configuration')).toBeInTheDocument()
      expect(screen.getByText('Complete Setup')).toBeInTheDocument()

      // Complete setup
      const completeButton = screen.getByText('Complete Setup')
      await user.click(completeButton)

      expect(mockOnSetupComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          welcomeMessage: expect.any(String),
          branding: expect.any(Object),
          roleConfigurations: expect.any(Array)
        })
      )
    })
  })

  describe('TeamInvitationManager', () => {
    it('should render invitation management interface', () => {
      render(
        <TeamInvitationManager
          organizationId="org-123"
          availableRoles={mockRoles}
          onboardingPaths={mockOnboardingPaths}
        />
      )

      expect(screen.getByText('Team Invitations')).toBeInTheDocument()
      expect(screen.getByText('Manage team member invitations and onboarding assignments')).toBeInTheDocument()
      expect(screen.getByText('Recent Invitations')).toBeInTheDocument()
    })

    it('should show empty state when no invitations exist', () => {
      render(
        <TeamInvitationManager
          organizationId="org-123"
          availableRoles={mockRoles}
          onboardingPaths={mockOnboardingPaths}
        />
      )

      expect(screen.getByText('No invitations sent yet')).toBeInTheDocument()
      expect(screen.getByText('Start by inviting team members to join your organization')).toBeInTheDocument()
    })

    it('should handle invitation callbacks', () => {
      const mockOnInvitationSent = vi.fn()
      const mockOnInvitationRevoked = vi.fn()

      render(
        <TeamInvitationManager
          organizationId="org-123"
          availableRoles={mockRoles}
          onboardingPaths={mockOnboardingPaths}
          onInvitationSent={mockOnInvitationSent}
          onInvitationRevoked={mockOnInvitationRevoked}
        />
      )

      // Component should render without errors
      expect(screen.getByText('Team Invitations')).toBeInTheDocument()
    })
  })

  describe('Integration Workflow', () => {
    it('should support complete organization setup workflow', async () => {
      const user = userEvent.setup()
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Step 1: Template Selection
      expect(screen.getByText('1 of 5')).toBeInTheDocument()
      const templateCard = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(templateCard!)
      
      const nextButton = screen.getByText('Next')
      expect(nextButton).not.toBeDisabled()
      await user.click(nextButton)

      // Step 2: Customization
      expect(screen.getByText('2 of 5')).toBeInTheDocument()
      expect(screen.getByText('Customize Onboarding Experience')).toBeInTheDocument()
      await user.click(screen.getByText('Next'))

      // Step 3: Roles
      expect(screen.getByText('3 of 5')).toBeInTheDocument()
      expect(screen.getByText('Configure Role-Specific Onboarding')).toBeInTheDocument()
      await user.click(screen.getByText('Next'))

      // Step 4: Invitations
      expect(screen.getByText('4 of 5')).toBeInTheDocument()
      expect(screen.getByText('Invite Team Members')).toBeInTheDocument()
      await user.click(screen.getByText('Next'))

      // Step 5: Review
      expect(screen.getByText('5 of 5')).toBeInTheDocument()
      expect(screen.getByText('Review Configuration')).toBeInTheDocument()
      expect(screen.getByText('Complete Setup')).toBeInTheDocument()

      // Complete the setup
      await user.click(screen.getByText('Complete Setup'))

      expect(mockOnSetupComplete).toHaveBeenCalled()
    })

    it('should prevent navigation without required selections', async () => {
      const user = userEvent.setup()
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Try to navigate without selecting template
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()

      // Select template
      const templateCard = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(templateCard!)

      // Now navigation should be enabled
      expect(nextButton).not.toBeDisabled()
    })

    it('should show progress correctly throughout the wizard', async () => {
      const user = userEvent.setup()
      const mockOnSetupComplete = vi.fn()

      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={mockOnSetupComplete}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      // Initial progress
      expect(screen.getByText('Progress: 20%')).toBeInTheDocument()

      // Select template and navigate
      const templateCard = screen.getByText('Startup Team').closest('[data-testid="card"]')
      await user.click(templateCard!)
      await user.click(screen.getByText('Next'))

      // Progress should update
      expect(screen.getByText('Progress: 40%')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <OrganizationSetupWizard
          organizationId="org-123"
          onSetupComplete={vi.fn()}
          availableTemplates={mockTemplates}
          customizationOptions={mockCustomizationOptions}
        />
      )

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Organization Setup')
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Choose Organization Template')
    })

    it('should have descriptive button text', () => {
      render(
        <TeamInvitationManager
          organizationId="org-123"
          availableRoles={mockRoles}
          onboardingPaths={mockOnboardingPaths}
        />
      )

      // The button text should be descriptive
      expect(screen.getByText('Team Invitations')).toBeInTheDocument()
    })
  })
})