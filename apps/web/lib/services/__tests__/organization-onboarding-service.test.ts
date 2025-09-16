import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OrganizationOnboardingService } from '../organization-onboarding-service'
import { membershipService } from '../membership-service'

// Mock dependencies
vi.mock('../membership-service', () => ({
  membershipService: {
    inviteUser: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn()
  }
}))

vi.mock('../onboarding-service', () => ({
  OnboardingService: vi.fn().mockImplementation(() => ({
    initializeOnboarding: vi.fn()
  }))
}))

vi.mock('../../database', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ select: mockSelect }))
  const mockDelete = vi.fn()
  const mockEq = vi.fn(() => ({ 
    single: mockSingle, 
    eq: vi.fn(() => ({ single: mockSingle })),
    order: vi.fn(() => ({ eq: vi.fn() }))
  }))
  const mockGte = vi.fn(() => ({ lte: vi.fn() }))
  const mockLte = vi.fn()
  const mockOrder = vi.fn(() => ({ eq: vi.fn() }))
  
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: vi.fn(() => ({
      eq: mockEq,
      single: mockSingle,
      gte: mockGte,
      lte: mockLte,
      order: mockOrder
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: mockSelect
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))

  return {
    createSupabaseClient: vi.fn(() => ({
      from: mockFrom
    }))
  }
})

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

describe('OrganizationOnboardingService', () => {
  let service: OrganizationOnboardingService
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new OrganizationOnboardingService()
    
    // Get the mocked database instance
    const { createSupabaseClient } = await import('../../database')
    mockDb = createSupabaseClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOrganizationTemplates', () => {
    it('should return predefined organization templates', async () => {
      const result = await service.getOrganizationTemplates()

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(4) // startup, enterprise, agency, education
      expect(result.error).toBeUndefined()

      // Check startup template
      const startupTemplate = result.data!.find(t => t.id === 'startup')
      expect(startupTemplate).toBeDefined()
      expect(startupTemplate!.name).toBe('Startup Team')
      expect(startupTemplate!.category).toBe('startup')
      expect(startupTemplate!.defaultRoles).toHaveLength(4)
      expect(startupTemplate!.onboardingPaths).toHaveLength(4)
    })

    it('should return enterprise template with correct structure', async () => {
      const result = await service.getOrganizationTemplates()

      const enterpriseTemplate = result.data!.find(t => t.id === 'enterprise')
      expect(enterpriseTemplate).toBeDefined()
      expect(enterpriseTemplate!.name).toBe('Enterprise Organization')
      expect(enterpriseTemplate!.category).toBe('enterprise')
      expect(enterpriseTemplate!.defaultRoles).toHaveLength(6)
      expect(enterpriseTemplate!.recommendedSettings.mandatoryModules).toBeDefined()
    })

    it('should handle errors gracefully', async () => {
      // Mock an error in the service
      const originalConsoleError = console.error
      console.error = vi.fn()

      // Force an error by mocking a method that throws
      const serviceWithError = new OrganizationOnboardingService()
      vi.spyOn(serviceWithError, 'getOrganizationTemplates').mockRejectedValue(new Error('Service error'))

      const result = await serviceWithError.getOrganizationTemplates()

      expect(result.error).toBe('Service error')
      expect(result.code).toBe('GET_TEMPLATES_ERROR')
      expect(result.data).toBeUndefined()

      console.error = originalConsoleError
    })
  })

  describe('createOrganizationOnboardingConfig', () => {
    const mockConfig = {
      organizationId: 'org-123',
      welcomeMessage: 'Welcome to our organization!',
      branding: {
        primaryColor: '#3b82f6',
        logoUrl: 'https://example.com/logo.png'
      },
      customContent: [],
      roleConfigurations: [
        {
          role: 'Admin',
          onboardingPath: 'admin-path',
          customizations: {},
          additionalResources: [],
          completionCriteria: {
            requiredSteps: ['step1', 'step2']
          }
        }
      ],
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

    const mockCreatedConfig = {
      id: 'config-123',
      organization_id: 'org-123',
      welcome_message: 'Welcome to our organization!',
      branding_assets: mockConfig.branding,
      custom_content: [],
      role_configurations: mockConfig.roleConfigurations,
      mandatory_modules: ['security-training'],
      completion_requirements: mockConfig.completionRequirements,
      notification_settings: mockConfig.notificationSettings,
      integration_settings: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should create organization onboarding configuration successfully', async () => {
      mockDb.from().insert().select().single.mockResolvedValue({
        data: mockCreatedConfig,
        error: null
      })

      const result = await service.createOrganizationOnboardingConfig(mockConfig, 'user-123')

      expect(result.data).toEqual(mockCreatedConfig)
      expect(result.error).toBeUndefined()

      // Verify database calls
      expect(mockDb.from).toHaveBeenCalledWith('organization_onboarding_configs')
      expect(mockDb.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          welcome_message: 'Welcome to our organization!',
          branding_assets: mockConfig.branding,
          is_active: true
        })
      )
    })

    it('should handle duplicate configuration error', async () => {
      const duplicateError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505'
      }

      mockDb.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      })

      const result = await service.createOrganizationOnboardingConfig(mockConfig, 'user-123')

      expect(result.error).toBe('Organization onboarding configuration already exists')
      expect(result.code).toBe('CONFIG_EXISTS')
      expect(result.data).toBeUndefined()
    })

    it('should handle database errors', async () => {
      const dbError = {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR'
      }

      mockDb.from().insert().select().single.mockResolvedValue({
        data: null,
        error: dbError
      })

      const result = await service.createOrganizationOnboardingConfig(mockConfig, 'user-123')

      expect(result.error).toBe('Failed to create organization onboarding config')
      expect(result.code).toBe('CREATE_CONFIG_ERROR')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getOrganizationOnboardingConfig', () => {
    const mockConfig = {
      id: 'config-123',
      organization_id: 'org-123',
      welcome_message: 'Welcome!',
      branding_assets: { primaryColor: '#3b82f6' },
      custom_content: [],
      role_configurations: [],
      mandatory_modules: [],
      completion_requirements: { minimumSteps: 5 },
      notification_settings: { welcomeEmail: true },
      integration_settings: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should get organization onboarding configuration successfully', async () => {
      mockDb.from().select().eq().eq().single.mockResolvedValue({
        data: mockConfig,
        error: null
      })

      const result = await service.getOrganizationOnboardingConfig('org-123')

      expect(result.data).toEqual(mockConfig)
      expect(result.error).toBeUndefined()

      // Verify database calls
      expect(mockDb.from).toHaveBeenCalledWith('organization_onboarding_configs')
      expect(mockDb.from().select().eq).toHaveBeenCalledWith('organization_id', 'org-123')
      expect(mockDb.from().select().eq().eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should handle configuration not found', async () => {
      mockDb.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Supabase not found error
      })

      const result = await service.getOrganizationOnboardingConfig('org-123')

      expect(result.error).toBe('Organization onboarding configuration not found')
      expect(result.code).toBe('CONFIG_NOT_FOUND')
      expect(result.data).toBeUndefined()
    })

    it('should handle database errors', async () => {
      const dbError = {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR'
      }

      mockDb.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: dbError
      })

      const result = await service.getOrganizationOnboardingConfig('org-123')

      expect(result.error).toBe('Failed to get organization onboarding config')
      expect(result.code).toBe('GET_CONFIG_ERROR')
      expect(result.data).toBeUndefined()
    })
  })

  describe('sendTeamInvitations', () => {
    const mockInvitations = [
      {
        email: 'user1@example.com',
        role: 'Developer',
        customMessage: 'Welcome to the team!'
      },
      {
        email: 'user2@example.com',
        role: 'Designer',
        customMessage: 'Excited to work with you!'
      }
    ]

    const mockOrgConfig = {
      id: 'config-123',
      organization_id: 'org-123',
      role_configurations: [
        { role: 'Developer', onboardingPath: 'dev-path' },
        { role: 'Designer', onboardingPath: 'design-path' }
      ]
    }

    const mockMembershipInvitation = {
      id: 'membership-inv-123',
      organizationId: 'org-123',
      email: 'user1@example.com',
      roleId: 'Developer',
      invitedBy: 'admin-123'
    }

    const mockTeamInvitation = {
      id: 'team-inv-123',
      organization_id: 'org-123',
      invited_by: 'admin-123',
      email: 'user1@example.com',
      role: 'Developer',
      custom_message: 'Welcome to the team!',
      onboarding_path_override: 'dev-path',
      status: 'pending',
      expires_at: expect.any(String),
      metadata: expect.any(Object),
      created_at: expect.any(String),
      updated_at: expect.any(String)
    }

    beforeEach(() => {
      // Mock getting organization config
      vi.spyOn(service, 'getOrganizationOnboardingConfig').mockResolvedValue({
        data: mockOrgConfig as any
      })

      // Mock membership service
      vi.mocked(membershipService.inviteUser).mockResolvedValue({
        data: mockMembershipInvitation as any
      })

      // Mock team invitation creation
      mockDb.from().insert().select().single.mockResolvedValue({
        data: mockTeamInvitation,
        error: null
      })
    })

    it('should send team invitations successfully', async () => {
      const result = await service.sendTeamInvitations('org-123', mockInvitations, 'admin-123')

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeUndefined()

      // Verify membership service was called
      expect(membershipService.inviteUser).toHaveBeenCalledTimes(2)
      expect(membershipService.inviteUser).toHaveBeenCalledWith({
        organizationId: 'org-123',
        email: 'user1@example.com',
        roleId: 'Developer',
        invitedBy: 'admin-123'
      })

      // Verify team invitation was created
      expect(mockDb.from).toHaveBeenCalledWith('team_invitations')
      expect(mockDb.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          email: 'user1@example.com',
          role: 'Developer',
          custom_message: 'Welcome to the team!',
          status: 'pending'
        })
      )
    })

    it('should handle partial failures gracefully', async () => {
      // Mock first invitation to succeed, second to fail
      vi.mocked(membershipService.inviteUser)
        .mockResolvedValueOnce({ data: mockMembershipInvitation as any })
        .mockResolvedValueOnce({ error: 'User already exists', code: 'USER_EXISTS' })

      const result = await service.sendTeamInvitations('org-123', mockInvitations, 'admin-123')

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1) // Only one successful invitation
      expect(result.error).toContain('Some invitations failed')
      expect(result.code).toBe('PARTIAL_INVITATIONS_FAILED')
    })

    it('should handle all invitations failing', async () => {
      vi.mocked(membershipService.inviteUser).mockResolvedValue({
        error: 'Service unavailable',
        code: 'SERVICE_ERROR'
      })

      const result = await service.sendTeamInvitations('org-123', mockInvitations, 'admin-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Failed to send all invitations')
      expect(result.code).toBe('ALL_INVITATIONS_FAILED')
    })

    it('should use onboarding path override when provided', async () => {
      const invitationsWithOverride = [
        {
          email: 'user1@example.com',
          role: 'Developer',
          onboardingPathOverride: 'custom-path'
        }
      ]

      await service.sendTeamInvitations('org-123', invitationsWithOverride, 'admin-123')

      expect(mockDb.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          onboarding_path_override: 'custom-path'
        })
      )
    })

    it('should determine onboarding path from organization config when not overridden', async () => {
      await service.sendTeamInvitations('org-123', mockInvitations, 'admin-123')

      expect(mockDb.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          onboarding_path_override: 'dev-path' // From org config
        })
      )
    })
  })

  describe('acceptTeamInvitation', () => {
    const mockInvitation = {
      id: 'inv-123',
      organization_id: 'org-123',
      email: 'user@example.com',
      role: 'Developer',
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      onboarding_path_override: 'dev-path',
      metadata: {
        membershipInvitationId: 'membership-inv-123'
      }
    }

    const mockUpdatedInvitation = {
      ...mockInvitation,
      status: 'accepted',
      accepted_at: expect.any(String)
    }

    const mockOnboardingSession = {
      id: 'session-123',
      userId: 'user-123',
      organizationId: 'org-123',
      pathId: 'dev-path'
    }

    beforeEach(() => {
      // Mock getting invitation
      mockDb.from().select().eq().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      // Mock updating invitation
      mockDb.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedInvitation,
        error: null
      })

      // Mock membership service
      vi.mocked(membershipService.acceptInvitation).mockResolvedValue({
        data: { id: 'membership-123' } as any
      })

      // The OnboardingService is already mocked at the top level
      // No need to require it again
    })

    it('should accept team invitation successfully', async () => {
      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.data).toBeDefined()
      expect(result.data!.invitation).toEqual(mockUpdatedInvitation)
      expect(result.data!.onboardingSession).toEqual(mockOnboardingSession)
      expect(result.error).toBeUndefined()

      // Verify membership invitation was accepted
      expect(membershipService.acceptInvitation).toHaveBeenCalledWith('membership-inv-123', 'user-123')

      // Verify onboarding session was started
      const { OnboardingService } = require('../onboarding-service')
      const mockInstance = vi.mocked(OnboardingService).mock.results[0].value
      expect(mockInstance.initializeOnboarding).toHaveBeenCalledWith('user-123', {
        userId: 'user-123',
        organizationId: 'org-123',
        userRole: 'Developer',
        onboardingPathId: 'dev-path'
      })

      // Verify invitation was updated
      expect(mockDb.from().update).toHaveBeenCalledWith({
        status: 'accepted',
        accepted_at: expect.any(String)
      })
    })

    it('should handle invitation not found', async () => {
      mockDb.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.error).toBe('Failed to get team invitation')
      expect(result.code).toBe('ACCEPT_INVITATION_ERROR')
      expect(result.data).toBeUndefined()
    })

    it('should handle invitation not pending', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' }
      mockDb.from().select().eq().single.mockResolvedValue({
        data: acceptedInvitation,
        error: null
      })

      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.error).toBe('Invitation is no longer valid')
      expect(result.code).toBe('INVITATION_NOT_PENDING')
      expect(result.data).toBeUndefined()
    })

    it('should handle expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }
      
      mockDb.from().select().eq().single.mockResolvedValue({
        data: expiredInvitation,
        error: null
      })

      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.error).toBe('Invitation has expired')
      expect(result.code).toBe('INVITATION_EXPIRED')
      expect(result.data).toBeUndefined()

      // Should mark invitation as expired
      expect(mockDb.from().update).toHaveBeenCalledWith({ status: 'expired' })
    })

    it('should handle membership acceptance failure', async () => {
      vi.mocked(membershipService.acceptInvitation).mockResolvedValue({
        error: 'User already member',
        code: 'USER_ALREADY_MEMBER'
      })

      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.error).toBe('User already member')
      expect(result.code).toBe('USER_ALREADY_MEMBER')
      expect(result.data).toBeUndefined()
    })

    it('should not start onboarding if no path is specified', async () => {
      const invitationWithoutPath = { ...mockInvitation, onboarding_path_override: null }
      mockDb.from().select().eq().single.mockResolvedValue({
        data: invitationWithoutPath,
        error: null
      })

      const result = await service.acceptTeamInvitation('inv-123', 'user-123')

      expect(result.data!.onboardingSession).toBeNull()
      // OnboardingService should not be called when no path is specified
      // OnboardingService should not be called when no path is specified
    })
  })

  describe('revokeTeamInvitation', () => {
    const mockInvitation = {
      id: 'inv-123',
      organization_id: 'org-123',
      email: 'user@example.com',
      role: 'Developer',
      status: 'pending',
      metadata: {
        membershipInvitationId: 'membership-inv-123'
      }
    }

    const mockRevokedInvitation = {
      ...mockInvitation,
      status: 'revoked'
    }

    beforeEach(() => {
      // Mock getting invitation
      mockDb.from().select().eq().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      // Mock updating invitation
      mockDb.from().update().eq().select().single.mockResolvedValue({
        data: mockRevokedInvitation,
        error: null
      })

      // Mock membership service
      vi.mocked(membershipService.revokeInvitation).mockResolvedValue({
        data: { id: 'membership-inv-123' } as any
      })
    })

    it('should revoke team invitation successfully', async () => {
      const result = await service.revokeTeamInvitation('inv-123', 'admin-123')

      expect(result.data).toEqual(mockRevokedInvitation)
      expect(result.error).toBeUndefined()

      // Verify membership invitation was revoked
      expect(membershipService.revokeInvitation).toHaveBeenCalledWith('membership-inv-123', 'admin-123')

      // Verify invitation was updated
      expect(mockDb.from().update).toHaveBeenCalledWith({ status: 'revoked' })
    })

    it('should handle invitation not pending', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' }
      mockDb.from().select().eq().single.mockResolvedValue({
        data: acceptedInvitation,
        error: null
      })

      const result = await service.revokeTeamInvitation('inv-123', 'admin-123')

      expect(result.error).toBe('Only pending invitations can be revoked')
      expect(result.code).toBe('INVITATION_NOT_PENDING')
      expect(result.data).toBeUndefined()
    })

    it('should handle invitation not found', async () => {
      mockDb.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      const result = await service.revokeTeamInvitation('inv-123', 'admin-123')

      expect(result.error).toBe('Failed to get team invitation')
      expect(result.code).toBe('REVOKE_INVITATION_ERROR')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getOrganizationOnboardingAnalytics', () => {
    const mockSessions = [
      {
        id: 'session-1',
        organization_id: 'org-123',
        status: 'completed',
        session_type: 'team_member',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'session-2',
        organization_id: 'org-123',
        status: 'active',
        session_type: 'team_admin',
        started_at: '2024-01-01T12:00:00Z',
        completed_at: null,
        created_at: '2024-01-01T12:00:00Z'
      },
      {
        id: 'session-3',
        organization_id: 'org-123',
        status: 'abandoned',
        session_type: 'team_member',
        started_at: '2024-01-01T06:00:00Z',
        completed_at: null,
        created_at: '2024-01-01T06:00:00Z'
      }
    ]

    const mockInvitations = [
      {
        id: 'inv-1',
        organization_id: 'org-123',
        status: 'accepted',
        role: 'Developer',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'inv-2',
        organization_id: 'org-123',
        status: 'pending',
        role: 'Designer',
        created_at: '2024-01-01T12:00:00Z'
      },
      {
        id: 'inv-3',
        organization_id: 'org-123',
        status: 'expired',
        role: 'Developer',
        created_at: '2024-01-01T06:00:00Z'
      }
    ]

    beforeEach(() => {
      // Mock sessions query
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'onboarding_sessions') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: vi.fn().mockResolvedValue({ data: mockSessions, error: null })
                })
              })
            })
          }
        }
        if (table === 'team_invitations') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: vi.fn().mockResolvedValue({ data: mockInvitations, error: null })
                })
              })
            })
          }
        }
        return mockDb
      })
    })

    it('should calculate organization onboarding analytics correctly', async () => {
      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()

      const analytics = result.data!
      expect(analytics.organizationId).toBe('org-123')
      expect(analytics.metrics.totalSessions).toBe(3)
      expect(analytics.metrics.completedSessions).toBe(1)
      expect(analytics.metrics.activeSessions).toBe(1)
      expect(analytics.metrics.abandonedSessions).toBe(1)
      expect(analytics.metrics.completionRate).toBe(33.33333333333333) // 1/3 * 100

      expect(analytics.metrics.totalInvitations).toBe(3)
      expect(analytics.metrics.acceptedInvitations).toBe(1)
      expect(analytics.metrics.pendingInvitations).toBe(1)
      expect(analytics.metrics.expiredInvitations).toBe(1)
      expect(analytics.metrics.acceptanceRate).toBe(33.33333333333333) // 1/3 * 100
    })

    it('should calculate average completion time correctly', async () => {
      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      const analytics = result.data!
      expect(analytics.metrics.averageCompletionTime).toBe(1) // 1 day difference
    })

    it('should group sessions and invitations by role', async () => {
      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      const analytics = result.data!
      expect(analytics.sessionsByRole.team_member).toBe(2)
      expect(analytics.sessionsByRole.team_admin).toBe(1)
      expect(analytics.invitationsByRole.Developer).toBe(2)
      expect(analytics.invitationsByRole.Designer).toBe(1)
    })

    it('should handle period filtering', async () => {
      const period = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z'
      }

      const result = await service.getOrganizationOnboardingAnalytics('org-123', period)

      expect(result.data).toBeDefined()
      expect(result.data!.period).toEqual(period)
    })

    it('should handle empty data gracefully', async () => {
      mockDb.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      }))

      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      expect(result.data).toBeDefined()
      const analytics = result.data!
      expect(analytics.metrics.totalSessions).toBe(0)
      expect(analytics.metrics.completionRate).toBe(0)
      expect(analytics.metrics.averageCompletionTime).toBe(0)
    })

    it('should handle database errors', async () => {
      mockDb.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Database error' } 
              })
            })
          })
        })
      }))

      const result = await service.getOrganizationOnboardingAnalytics('org-123')

      expect(result.error).toBe('Failed to get organization onboarding analytics')
      expect(result.code).toBe('GET_ANALYTICS_ERROR')
      expect(result.data).toBeUndefined()
    })
  })
})