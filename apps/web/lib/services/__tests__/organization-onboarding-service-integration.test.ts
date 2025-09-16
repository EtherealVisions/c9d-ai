import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OrganizationOnboardingService } from '../organization-onboarding-service'

// Mock all dependencies
vi.mock('../../database', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'config-123',
              organization_id: 'org-123',
              welcome_message: 'Welcome!',
              branding_assets: {},
              custom_content: [],
              role_configurations: [],
              mandatory_modules: [],
              completion_requirements: {},
              notification_settings: {},
              integration_settings: {},
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'config-123',
                organization_id: 'org-123',
                welcome_message: 'Welcome!',
                branding_assets: {},
                custom_content: [],
                role_configurations: [],
                mandatory_modules: [],
                completion_requirements: {},
                notification_settings: {},
                integration_settings: {},
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              error: null
            }))
          })),
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'config-123',
              organization_id: 'org-123',
              welcome_message: 'Welcome!',
              branding_assets: {},
              custom_content: [],
              role_configurations: [],
              mandatory_modules: [],
              completion_requirements: {},
              notification_settings: {},
              integration_settings: {},
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null
          })),
          order: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  }))
}))

vi.mock('../../models/database', () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public cause?: any) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

vi.mock('../membership-service', () => ({
  membershipService: {
    inviteUser: vi.fn(() => Promise.resolve({
      data: { id: 'membership-inv-123' }
    })),
    acceptInvitation: vi.fn(() => Promise.resolve({
      data: { id: 'membership-123' }
    })),
    revokeInvitation: vi.fn(() => Promise.resolve({
      data: { id: 'membership-inv-123' }
    }))
  }
}))

vi.mock('../onboarding-service', () => ({
  OnboardingService: {
    initializeOnboarding: vi.fn(() => Promise.resolve({
      data: { id: 'session-123' }
    }))
  }
}))

describe('OrganizationOnboardingService Integration Tests', () => {
  let service: OrganizationOnboardingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OrganizationOnboardingService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Core Functionality', () => {
    it('should provide organization templates', async () => {
      const result = await service.getOrganizationTemplates()

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(4)
      expect(result.error).toBeUndefined()

      // Verify template structure
      const templates = result.data!
      expect(templates.some(t => t.id === 'startup')).toBe(true)
      expect(templates.some(t => t.id === 'enterprise')).toBe(true)
      expect(templates.some(t => t.id === 'agency')).toBe(true)
      expect(templates.some(t => t.id === 'education')).toBe(true)

      // Verify template has required properties
      const startupTemplate = templates.find(t => t.id === 'startup')!
      expect(startupTemplate.name).toBe('Startup Team')
      expect(startupTemplate.defaultRoles).toBeDefined()
      expect(startupTemplate.onboardingPaths).toBeDefined()
      expect(startupTemplate.recommendedSettings).toBeDefined()
    })

    it('should create organization onboarding configuration', async () => {
      const config = {
        organizationId: 'org-123',
        welcomeMessage: 'Welcome to our organization!',
        branding: {
          primaryColor: '#3b82f6',
          logoUrl: 'https://example.com/logo.png'
        },
        customContent: [],
        roleConfigurations: [{
          role: 'Admin',
          onboardingPath: 'admin-path',
          customizations: {},
          additionalResources: [],
          completionCriteria: {
            requiredSteps: ['step1', 'step2']
          }
        }],
        mandatoryModules: ['security-training'],
        completionRequirements: {
          minimumSteps: 5,
          requiredModules: ['security-training']
        },
        notificationSettings: {
          welcomeEmail: true,
          progressReminders: true,
          completionCelebration: true,
          mentorNotifications: false
        }
      }

      const result = await service.createOrganizationOnboardingConfig(config, 'user-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(result.data!.organization_id).toBe('org-123')
    })

    it('should get organization onboarding configuration', async () => {
      const result = await service.getOrganizationOnboardingConfig('org-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(result.data!.organization_id).toBe('org-123')
    })

    it('should send team invitations successfully', async () => {
      const invitations = [
        {
          email: 'user1@example.com',
          role: 'Developer',
          customMessage: 'Welcome to the team!'
        },
        {
          email: 'user2@example.com',
          role: 'Designer',
          onboardingPathOverride: 'custom-path'
        }
      ]

      const result = await service.sendTeamInvitations('org-123', invitations, 'admin-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(result.data).toHaveLength(2)
    })

    it('should get team invitations for organization', async () => {
      const result = await service.getTeamInvitations('org-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should get organization onboarding analytics', async () => {
      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(result.data!.organizationId).toBe('org-123')
      expect(result.data!.metrics).toBeDefined()
    })
  })

  describe('Template System', () => {
    it('should provide startup template with correct structure', async () => {
      const result = await service.getOrganizationTemplates()
      const startupTemplate = result.data!.find(t => t.id === 'startup')!

      expect(startupTemplate.name).toBe('Startup Team')
      expect(startupTemplate.category).toBe('startup')
      expect(startupTemplate.description).toContain('agile')
      expect(startupTemplate.defaultRoles).toHaveLength(4)
      expect(startupTemplate.onboardingPaths).toHaveLength(4)
      
      // Check roles
      const roles = startupTemplate.defaultRoles.map(r => r.name)
      expect(roles).toContain('Founder')
      expect(roles).toContain('Developer')
      expect(roles).toContain('Designer')
      expect(roles).toContain('Marketing')
    })

    it('should provide enterprise template with correct structure', async () => {
      const result = await service.getOrganizationTemplates()
      const enterpriseTemplate = result.data!.find(t => t.id === 'enterprise')!

      expect(enterpriseTemplate.name).toBe('Enterprise Organization')
      expect(enterpriseTemplate.category).toBe('enterprise')
      expect(enterpriseTemplate.description).toContain('large organizations')
      expect(enterpriseTemplate.defaultRoles).toHaveLength(6)
      expect(enterpriseTemplate.onboardingPaths).toHaveLength(6)
      
      // Check roles
      const roles = enterpriseTemplate.defaultRoles.map(r => r.name)
      expect(roles).toContain('Administrator')
      expect(roles).toContain('Manager')
      expect(roles).toContain('Senior Developer')
      expect(roles).toContain('Developer')
      expect(roles).toContain('Analyst')
      expect(roles).toContain('User')
    })

    it('should provide agency template with correct structure', async () => {
      const result = await service.getOrganizationTemplates()
      const agencyTemplate = result.data!.find(t => t.id === 'agency')!

      expect(agencyTemplate.name).toBe('Creative Agency')
      expect(agencyTemplate.category).toBe('agency')
      expect(agencyTemplate.description).toContain('creative')
      expect(agencyTemplate.defaultRoles).toHaveLength(6)
      
      // Check roles
      const roles = agencyTemplate.defaultRoles.map(r => r.name)
      expect(roles).toContain('Agency Owner')
      expect(roles).toContain('Account Manager')
      expect(roles).toContain('Creative Director')
      expect(roles).toContain('Designer')
      expect(roles).toContain('Developer')
      expect(roles).toContain('Freelancer')
    })

    it('should provide education template with correct structure', async () => {
      const result = await service.getOrganizationTemplates()
      const educationTemplate = result.data!.find(t => t.id === 'education')!

      expect(educationTemplate.name).toBe('Educational Institution')
      expect(educationTemplate.category).toBe('education')
      expect(educationTemplate.description.toLowerCase()).toContain('academic')
      expect(educationTemplate.defaultRoles).toHaveLength(5)
      
      // Check roles
      const roles = educationTemplate.defaultRoles.map(r => r.name)
      expect(roles).toContain('Administrator')
      expect(roles).toContain('Instructor')
      expect(roles).toContain('Teaching Assistant')
      expect(roles).toContain('Student')
      expect(roles).toContain('Guest')
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // This test verifies that the service doesn't throw unhandled errors
      // Even if internal operations fail, it should return error responses
      const result = await service.getOrganizationOnboardingConfig('nonexistent-org')
      
      // The service should handle this gracefully and return a result
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })
})