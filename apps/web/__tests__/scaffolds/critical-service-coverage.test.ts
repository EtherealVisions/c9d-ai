/**
 * Critical Service Coverage Test Scaffold
 * 
 * This scaffold provides comprehensive test coverage for the most critical
 * services that currently have 0% coverage but contain essential business logic.
 * 
 * Priority: P0 - CRITICAL
 * Target Coverage: 100% (Services layer requirement)
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createSupabaseClient } from '@/lib/database'

// Mock the database module
vi.mock('@/lib/database', () => ({
  createSupabaseClient: vi.fn()
}))

// Mock the errors module
vi.mock('@/lib/errors', () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, cause?: Error) {
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

describe('UserService - Critical Coverage', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User CRUD Operations', () => {
    it('should create user successfully', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      const mockUser = {
        id: 'user-123',
        clerk_user_id: 'clerk_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockUser,
        error: null
      })

      const userData = {
        clerk_user_id: 'clerk_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }

      const result = await UserService.create(userData)

      expect(result).toEqual(mockUser)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should get user by ID', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      })

      const result = await UserService.getById('user-123')

      expect(result).toEqual(mockUser)
    })

    it('should update user', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      const updatedUser = {
        id: 'user-123',
        first_name: 'Jane'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedUser,
        error: null
      })

      const result = await UserService.update('user-123', { first_name: 'Jane' })

      expect(result).toEqual(updatedUser)
    })

    it('should delete user', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      mockSupabase.from().delete().eq().mockResolvedValue({
        error: null
      })

      await expect(UserService.delete('user-123')).resolves.not.toThrow()
    })

    it('should handle database errors', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(UserService.getById('user-123')).rejects.toThrow('Database error')
    })
  })

  describe('User Authentication Integration', () => {
    it('should sync user from Clerk', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      const clerkUser = {
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'John',
        lastName: 'Doe'
      }

      const mockUser = {
        id: 'user-123',
        clerk_user_id: 'clerk_123',
        email: 'test@example.com'
      }

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: mockUser, error: null })

      const result = await UserService.syncFromClerk(clerkUser)

      expect(result).toEqual(mockUser)
    })

    it('should get user by Clerk ID', async () => {
      const { UserService } = await import('@/lib/services/user-service')
      
      const mockUser = {
        id: 'user-123',
        clerk_user_id: 'clerk_123'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      })

      const result = await UserService.getByClerkId('clerk_123')

      expect(result).toEqual(mockUser)
    })
  })
})

describe('OrganizationService - Critical Coverage', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('Organization CRUD Operations', () => {
    it('should create organization successfully', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        metadata: {},
        settings: {}
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockOrg,
        error: null
      })

      const orgData = {
        name: 'Test Org',
        slug: 'test-org',
        metadata: {},
        settings: {}
      }

      const result = await OrganizationService.createOrganization('user-123', orgData)

      expect(result.data).toEqual(mockOrg)
      expect(result.error).toBeUndefined()
    })

    it('should get organization by ID', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockOrg,
        error: null
      })

      const result = await OrganizationService.getOrganization('org-123')

      expect(result).toEqual(mockOrg)
    })

    it('should update organization', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      const updatedOrg = {
        id: 'org-123',
        name: 'Updated Org'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedOrg,
        error: null
      })

      const result = await OrganizationService.updateOrganization('org-123', { name: 'Updated Org' })

      expect(result).toEqual(updatedOrg)
    })

    it('should handle organization not found', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await OrganizationService.getOrganization('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('Organization Membership Management', () => {
    it('should get user organizations', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      const mockOrgs = [
        { id: 'org-1', name: 'Org 1' },
        { id: 'org-2', name: 'Org 2' }
      ]

      mockSupabase.from().select().eq().mockResolvedValue({
        data: mockOrgs,
        error: null
      })

      const result = await OrganizationService.getUserOrganizations('user-123')

      expect(result).toEqual(mockOrgs)
    })

    it('should check user organization access', async () => {
      const { OrganizationService } = await import('@/lib/services/organization-service')
      
      const mockMembership = {
        user_id: 'user-123',
        organization_id: 'org-123'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockMembership,
        error: null
      })

      const result = await OrganizationService.hasUserAccess('user-123', 'org-123')

      expect(result).toBe(true)
    })
  })
})

describe('MembershipService - Critical Coverage', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('Membership CRUD Operations', () => {
    it('should create membership', async () => {
      const { MembershipService } = await import('@/lib/services/membership-service')
      
      const mockMembership = {
        id: 'membership-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        role_id: 'role-123'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockMembership,
        error: null
      })

      const membershipData = {
        user_id: 'user-123',
        organization_id: 'org-123',
        role_id: 'role-123'
      }

      const result = await MembershipService.createMembership(membershipData)

      expect(result).toEqual(mockMembership)
    })

    it('should get user membership in organization', async () => {
      const { MembershipService } = await import('@/lib/services/membership-service')
      
      const mockMembership = {
        id: 'membership-123',
        user_id: 'user-123',
        organization_id: 'org-123'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockMembership,
        error: null
      })

      const result = await MembershipService.getUserMembership('user-123', 'org-123')

      expect(result).toEqual(mockMembership)
    })

    it('should update member role', async () => {
      const { MembershipService } = await import('@/lib/services/membership-service')
      
      const updatedMembership = {
        id: 'membership-123',
        role_id: 'new-role-123'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedMembership,
        error: null
      })

      const result = await MembershipService.updateMemberRole('user-123', 'org-123', 'new-role-123')

      expect(result.data).toEqual(updatedMembership)
    })
  })

  describe('Invitation Management', () => {
    it('should invite user to organization', async () => {
      const { MembershipService } = await import('@/lib/services/membership-service')
      
      const mockInvitation = {
        id: 'invitation-123',
        email: 'invite@example.com',
        organization_id: 'org-123',
        role_id: 'role-123'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      const invitationData = {
        email: 'invite@example.com',
        organizationId: 'org-123',
        roleId: 'role-123',
        invitedBy: 'user-123'
      }

      const result = await MembershipService.inviteUser(invitationData)

      expect(result.data).toEqual(mockInvitation)
    })

    it('should accept invitation', async () => {
      const { MembershipService } = await import('@/lib/services/membership-service')
      
      const mockInvitation = {
        id: 'invitation-123',
        status: 'pending',
        organization_id: 'org-123',
        role_id: 'role-123'
      }

      const mockMembership = {
        id: 'membership-123',
        user_id: 'user-123',
        organization_id: 'org-123'
      }

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: mockInvitation, error: null })
        .mockResolvedValueOnce({ data: mockMembership, error: null })

      const result = await MembershipService.acceptInvitation('invitation-123', 'user-123')

      expect(result.data).toEqual(mockMembership)
    })
  })
})

describe('OnboardingService - Critical Coverage', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('Session Management', () => {
    it('should initialize onboarding session', async () => {
      const { OnboardingService } = await import('@/lib/services/onboarding-service')
      
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        status: 'active'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const context = {
        userId: 'user-123',
        userRole: 'developer'
      }

      const result = await OnboardingService.initializeOnboarding('user-123', context)

      expect(result).toEqual(mockSession)
    })

    it('should get onboarding session', async () => {
      const { OnboardingService } = await import('@/lib/services/onboarding-service')
      
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const result = await OnboardingService.getOnboardingSession('session-123')

      expect(result).toEqual(mockSession)
    })

    it('should complete onboarding session', async () => {
      const { OnboardingService } = await import('@/lib/services/onboarding-service')
      
      const completedSession = {
        id: 'session-123',
        status: 'completed'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: completedSession,
        error: null
      })

      const result = await OnboardingService.completeOnboardingSession('session-123')

      expect(result.status).toBe('completed')
    })
  })

  describe('Step Management', () => {
    it('should record step completion', async () => {
      const { OnboardingService } = await import('@/lib/services/onboarding-service')
      
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        path: { steps: [{ id: 'step-1' }, { id: 'step-2' }] }
      }

      const stepResult = {
        stepId: 'step-1',
        status: 'completed' as const,
        timeSpent: 300,
        userActions: {}
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      // Mock the complex chain of calls that recordStepCompletion makes
      const result = await OnboardingService.recordStepCompletion('session-123', 'step-1', stepResult)

      expect(result).toBeDefined()
    })
  })
})

describe('PathEngine - Critical Coverage', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('Path Generation', () => {
    it('should generate personalized path', async () => {
      const { PathEngine } = await import('@/lib/services/path-engine')
      
      const mockPath = {
        id: 'path-123',
        name: 'Developer Path',
        target_role: 'developer',
        steps: []
      }

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [mockPath],
        error: null
      })

      const context = {
        userId: 'user-123',
        userRole: 'developer'
      }

      const result = await PathEngine.generatePersonalizedPath('user-123', context)

      expect(result).toEqual(mockPath)
    })

    it('should adapt path based on user behavior', async () => {
      const { PathEngine } = await import('@/lib/services/path-engine')
      
      const mockSession = {
        id: 'session-123',
        path: { steps: [] }
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const userBehavior = {
        sessionId: 'session-123',
        stepInteractions: [],
        learningStyle: 'visual' as const,
        pacePreference: 'medium' as const,
        engagementLevel: 'high' as const,
        strugglingAreas: [],
        preferredContentTypes: []
      }

      const result = await PathEngine.adaptPath('session-123', userBehavior)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe('session-123')
    })

    it('should get next step in path', async () => {
      const { PathEngine } = await import('@/lib/services/path-engine')
      
      const mockSession = {
        id: 'session-123',
        path: {
          steps: [
            { id: 'step-1', step_order: 0, dependencies: [] },
            { id: 'step-2', step_order: 1, dependencies: ['step-1'] }
          ]
        }
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const currentProgress = [
        { step_id: 'step-1', status: 'completed' }
      ]

      const result = await PathEngine.getNextStep('session-123', currentProgress)

      expect(result?.id).toBe('step-2')
    })
  })

  describe('Path Validation', () => {
    it('should validate path completion', async () => {
      const { PathEngine } = await import('@/lib/services/path-engine')
      
      const mockSession = {
        id: 'session-123',
        path: {
          steps: [
            { id: 'step-1', is_required: true },
            { id: 'step-2', is_required: true }
          ]
        }
      }

      const mockProgress = [
        { step_id: 'step-1', status: 'completed' },
        { step_id: 'step-2', status: 'completed' }
      ]

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockProgress,
        error: null
      })

      const result = await PathEngine.validatePathCompletion('session-123')

      expect(result.isValid).toBe(true)
      expect(result.completionPercentage).toBe(100)
    })

    it('should suggest alternative paths', async () => {
      const { PathEngine } = await import('@/lib/services/path-engine')
      
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        path_id: 'path-123'
      }

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: mockSession, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'alt-path', name: 'Alternative' }], error: null })

      const issues = [
        {
          type: 'difficulty' as const,
          description: 'Too difficult',
          severity: 'high' as const
        }
      ]

      const result = await PathEngine.suggestAlternativePaths('session-123', issues)

      expect(Array.isArray(result)).toBe(true)
    })
  })
})