/**
 * Unit tests for OnboardingService
 * Tests session management, path orchestration, and integration with PathEngine
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { OnboardingService } from '../onboarding-service'
import { PathEngine } from '../path-engine'
import { ProgressTrackerService } from '../progress-tracker-service'
import { createSupabaseClient } from '@/lib/database'
import type { 
  OnboardingContext, 
  OnboardingSession, 
  OnboardingPath, 
  StepResult,
  UserProgressRow
} from '@/lib/models'

// Mock dependencies
vi.mock('@/lib/database', () => ({
  createSupabaseClient: vi.fn(),
}))

vi.mock('../path-engine', () => ({
  PathEngine: {
    generatePersonalizedPath: vi.fn(),
    adaptPath: vi.fn(),
    getNextStep: vi.fn(),
    suggestAlternativePaths: vi.fn()
  }
}))

vi.mock('../progress-tracker-service', () => ({
  ProgressTrackerService: {
    trackStepProgress: vi.fn(),
    recordStepCompletion: vi.fn(),
    getOverallProgress: vi.fn()
  }
}))

describe('OnboardingService', () => {
  let mockSupabase: any

  const mockContext: OnboardingContext = {
    userId: 'user-123',
    organizationId: 'org-123',
    userRole: 'developer',
    subscriptionTier: 'pro',
    preferences: {
      learningStyle: 'visual',
      pacePreference: 'medium'
    }
  }

  const mockPath: OnboardingPath = {
    id: 'path-123',
    name: 'Developer Onboarding',
    description: 'Comprehensive developer onboarding path',
    target_role: 'developer',
    subscription_tier: 'pro',
    estimated_duration: 60,
    is_active: true,
    prerequisites: [],
    learning_objectives: ['Learn platform basics'],
    success_criteria: { completion_rate: 0.8 },
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-1',
        path_id: 'path-123',
        title: 'Getting Started',
        description: 'Introduction to the platform',
        step_type: 'tutorial',
        step_order: 0,
        estimated_time: 15,
        is_required: true,
        dependencies: [],
        content: { type: 'text' },
        interactive_elements: {},
        success_criteria: {},
        validation_rules: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  }

  const mockSession: OnboardingSession = {
    id: 'session-123',
    user_id: 'user-123',
    organization_id: 'org-123',
    path_id: 'path-123',
    session_type: 'team_member',
    status: 'active',
    current_step_id: 'step-1',
    current_step_index: 0,
    progress_percentage: 0,
    time_spent: 0,
    started_at: '2024-01-01T00:00:00Z',
    last_active_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    paused_at: null,
    session_metadata: {},
    preferences: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock Supabase client
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn()
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('initializeOnboarding', () => {
    it('should initialize onboarding with personalized path', async () => {
      // Mock PathEngine response
      ;(PathEngine.generatePersonalizedPath as Mock).mockResolvedValue(mockPath)

      // Create separate mock queries for each database call
      const membershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role_id: 'role-123',
            roles: { name: 'Member', permissions: [] }
          },
          error: null
        })
      }

      const sessionQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockSession,
            users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
            organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
            onboarding_paths: mockPath
          },
          error: null
        })
      }

      const progressQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null })
      }

      const analyticsQuery = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }

      // Mock the from method to return different queries based on table name
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'organization_memberships':
            return membershipQuery
          case 'onboarding_sessions':
            return sessionQuery
          case 'user_progress':
            return progressQuery
          case 'onboarding_analytics':
            return analyticsQuery
          default:
            return sessionQuery
        }
      })

      // Mock progress tracking
      ;(ProgressTrackerService.trackStepProgress as Mock).mockResolvedValue({})

      const result = await OnboardingService.initializeOnboarding('user-123', mockContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('session-123')
      expect(result.user_id).toBe('user-123')
      expect(PathEngine.generatePersonalizedPath).toHaveBeenCalledWith('user-123', mockContext)
      expect(ProgressTrackerService.trackStepProgress).toHaveBeenCalled()
    })

    it('should determine correct session type for team admin', async () => {
      ;(PathEngine.generatePersonalizedPath as Mock).mockResolvedValue(mockPath)

      // Create separate mock queries for each database call
      const membershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role_id: 'role-admin',
            roles: { name: 'Admin', permissions: ['organization.manage'] }
          },
          error: null
        })
      }

      const sessionQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockSession,
            session_type: 'team_admin',
            users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
            organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
            onboarding_paths: mockPath
          },
          error: null
        })
      }

      const progressQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null })
      }

      const analyticsQuery = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }

      // Mock the from method to return different queries based on table name
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'organization_memberships':
            return membershipQuery
          case 'onboarding_sessions':
            return sessionQuery
          case 'user_progress':
            return progressQuery
          case 'onboarding_analytics':
            return analyticsQuery
          default:
            return sessionQuery
        }
      })

      ;(ProgressTrackerService.trackStepProgress as Mock).mockResolvedValue({})

      const result = await OnboardingService.initializeOnboarding('user-123', mockContext)

      expect(result.session_type).toBe('team_admin')
    })

    it('should determine individual session type when no organization', async () => {
      const individualContext = { ...mockContext, organizationId: undefined }
      ;(PathEngine.generatePersonalizedPath as Mock).mockResolvedValue(mockPath)

      // For individual context, no membership query is made
      const sessionQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockSession,
            session_type: 'individual',
            organization_id: null,
            users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
            onboarding_paths: mockPath
          },
          error: null
        })
      }

      const progressQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null })
      }

      const analyticsQuery = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }

      // Mock the from method to return different queries based on table name
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'onboarding_sessions':
            return sessionQuery
          case 'user_progress':
            return progressQuery
          case 'onboarding_analytics':
            return analyticsQuery
          default:
            return sessionQuery
        }
      })

      ;(ProgressTrackerService.trackStepProgress as Mock).mockResolvedValue({})

      const result = await OnboardingService.initializeOnboarding('user-123', individualContext)

      expect(result.session_type).toBe('individual')
    })

    it('should handle path generation failure', async () => {
      ;(PathEngine.generatePersonalizedPath as Mock).mockRejectedValue(
        new Error('No suitable onboarding paths found')
      )

      await expect(
        OnboardingService.initializeOnboarding('user-123', mockContext)
      ).rejects.toThrow('Failed to initialize onboarding')
    })
  })

  describe('recordStepCompletion', () => {
    const mockStepResult: StepResult = {
      stepId: 'step-1',
      status: 'completed',
      timeSpent: 900,
      userActions: { clicks: 5, scrolls: 10 },
      feedback: { rating: 5 },
      errors: {},
      achievements: { first_step: true }
    }

    it('should record step completion and advance to next step', async () => {
      // Mock session retrieval
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockSession,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      // Mock progress tracking
      ;(ProgressTrackerService.recordStepCompletion as Mock).mockResolvedValue({})
      ;(ProgressTrackerService.getOverallProgress as Mock).mockResolvedValue({
        sessionId: 'session-123',
        currentStepIndex: 1,
        completedSteps: ['step-1'],
        skippedSteps: [],
        milestones: [],
        overallProgress: 50,
        timeSpent: 900,
        lastUpdated: '2024-01-01T00:00:00Z'
      })

      // Mock user progress
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [{ step_id: 'step-1', status: 'completed' }],
        error: null
      })

      // Mock next step
      const nextStep = {
        id: 'step-2',
        title: 'Next Step',
        step_order: 1
      }
      ;(PathEngine.getNextStep as Mock).mockResolvedValue(nextStep)

      // Mock session update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockSession,
          current_step_id: 'step-2',
          current_step_index: 1,
          progress_percentage: 50,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      // Mock analytics
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.recordStepCompletion('session-123', 'step-1', mockStepResult)

      expect(result).toBeDefined()
      expect(result.nextStep).toEqual(nextStep)
      expect(result.isPathComplete).toBe(false)
      expect(ProgressTrackerService.recordStepCompletion).toHaveBeenCalledWith(
        'session-123',
        'step-1',
        'user-123',
        mockStepResult
      )
    })

    it('should mark path as complete when no next step', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockSession,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      ;(ProgressTrackerService.recordStepCompletion as Mock).mockResolvedValue({})
      ;(ProgressTrackerService.getOverallProgress as Mock).mockResolvedValue({
        sessionId: 'session-123',
        overallProgress: 100,
        timeSpent: 1800
      })

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [
          { step_id: 'step-1', status: 'completed' },
          { step_id: 'step-2', status: 'completed' }
        ],
        error: null
      })

      ;(PathEngine.getNextStep as Mock).mockResolvedValue(null)

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockSession,
          status: 'completed',
          completed_at: '2024-01-01T01:00:00Z',
          progress_percentage: 100,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.recordStepCompletion('session-123', 'step-1', mockStepResult)

      expect(result.isPathComplete).toBe(true)
      expect(result.session.status).toBe('completed')
    })

    it('should handle session not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(
        OnboardingService.recordStepCompletion('session-123', 'step-1', mockStepResult)
      ).rejects.toThrow('Failed to record step completion')
    })
  })

  describe('adaptOnboardingPath', () => {
    const mockUserBehavior = {
      sessionId: 'session-123',
      stepInteractions: [
        {
          stepId: 'step-1',
          timeSpent: 1800,
          attempts: 3,
          completionRate: 0.7,
          skipRate: 0.0,
          errorRate: 0.3
        }
      ],
      learningStyle: 'visual' as const,
      pacePreference: 'slow' as const,
      engagementLevel: 'low' as const,
      strugglingAreas: ['step-1'],
      preferredContentTypes: ['video', 'interactive']
    }

    it('should adapt path based on user behavior', async () => {
      // Mock session retrieval
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockSession,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      // Mock path adaptation
      const mockPathAdjustment = {
        sessionId: 'session-123',
        adjustmentType: 'difficulty',
        adjustmentReason: 'User struggling with current difficulty level',
        originalPath: ['step-1', 'step-2'],
        adjustedPath: ['step-1-easy', 'step-2-easy'],
        metadata: {}
      }
      ;(PathEngine.adaptPath as Mock).mockResolvedValue(mockPathAdjustment)

      // Mock session update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockSession,
          session_metadata: {
            pathAdapted: true,
            adaptationTimestamp: '2024-01-01T01:00:00Z'
          },
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      // Mock analytics
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.adaptOnboardingPath('session-123', mockUserBehavior)

      expect(result).toBeDefined()
      expect(result.pathAdjustment).toEqual(mockPathAdjustment)
      expect(result.recommendedActions).toBeDefined()
      expect(Array.isArray(result.recommendedActions)).toBe(true)
      expect(PathEngine.adaptPath).toHaveBeenCalledWith('session-123', mockUserBehavior)
    })

    it('should provide appropriate recommended actions for difficulty adjustments', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockSession,
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      const difficultyAdjustment = {
        sessionId: 'session-123',
        adjustmentType: 'difficulty',
        adjustmentReason: 'User struggling with current difficulty level'
      }
      ;(PathEngine.adaptPath as Mock).mockResolvedValue(difficultyAdjustment)

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockSession,
        error: null
      })
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.adaptOnboardingPath('session-123', mockUserBehavior)

      expect(result.recommendedActions).toContain('Consider providing additional support resources')
      expect(result.recommendedActions).toContain('Offer one-on-one guidance sessions')
    })
  })

  describe('resumeOnboardingSession', () => {
    it('should resume paused session with context preservation', async () => {
      const pausedSession = {
        ...mockSession,
        status: 'paused',
        paused_at: '2024-01-01T00:30:00Z'
      }

      // Mock session retrieval
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            ...pausedSession,
            users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
            organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
            onboarding_paths: mockPath
          },
          error: null
        })

      // Mock session update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockSession,
          status: 'active',
          paused_at: null,
          session_metadata: {
            resumedAt: '2024-01-01T01:00:00Z',
            pauseDuration: 1800000 // 30 minutes
          },
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      // Mock analytics
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.resumeOnboardingSession('session-123')

      expect(result.status).toBe('active')
      expect(result.paused_at).toBeNull()
      expect(result.session_metadata?.resumedAt).toBeDefined()
      expect(result.session_metadata?.pauseDuration).toBe(1800000)
    })

    it('should throw error when session is not paused', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockSession,
          status: 'active', // Not paused
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: mockPath
        },
        error: null
      })

      await expect(
        OnboardingService.resumeOnboardingSession('session-123')
      ).rejects.toThrow('Failed to resume onboarding session')
    })
  })

  describe('switchToAlternativePath', () => {
    it('should switch to alternative path successfully', async () => {
      // Mock current session
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            ...mockSession,
            users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
            organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
            onboarding_paths: mockPath
          },
          error: null
        })

      // Mock alternative path
      const alternativePath = {
        ...mockPath,
        id: 'path-456',
        name: 'Alternative Path'
      }
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: alternativePath,
          error: null
        })

      // Mock session update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockSession,
          path_id: 'path-456',
          session_metadata: {
            pathSwitched: true,
            switchTimestamp: '2024-01-01T01:00:00Z',
            switchReason: 'Too difficult',
            previousPathId: 'path-123'
          },
          users: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
          organizations: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          onboarding_paths: alternativePath
        },
        error: null
      })

      // Mock analytics
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await OnboardingService.switchToAlternativePath(
        'session-123',
        'path-456',
        'Too difficult'
      )

      expect(result.path_id).toBe('path-456')
      expect(result.session_metadata?.pathSwitched).toBe(true)
      expect(result.session_metadata?.switchReason).toBe('Too difficult')
      expect(result.session_metadata?.previousPathId).toBe('path-123')
    })

    it('should handle alternative path not found', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: mockSession,
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

      await expect(
        OnboardingService.switchToAlternativePath('session-123', 'path-456', 'Too difficult')
      ).rejects.toThrow('Failed to switch to alternative path')
    })
  })

  describe('getUserProgress', () => {
    it('should return user progress for session', async () => {
      const mockProgress: UserProgressRow[] = [
        {
          id: 'progress-1',
          session_id: 'session-123',
          step_id: 'step-1',
          user_id: 'user-123',
          status: 'completed',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T00:15:00Z',
          time_spent: 900,
          attempts: 1,
          score: 100,
          feedback: {},
          user_actions: {},
          step_result: {},
          errors: {},
          achievements: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:15:00Z'
        }
      ]

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockProgress,
        error: null
      })

      const result = await OnboardingService.getUserProgress('session-123')

      expect(result).toEqual(mockProgress)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_progress')
    })

    it('should handle empty progress', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await OnboardingService.getUserProgress('session-123')

      expect(result).toEqual([])
    })
  })

  describe('getPersonalizedOnboardingPath', () => {
    it('should delegate to PathEngine', async () => {
      ;(PathEngine.generatePersonalizedPath as Mock).mockResolvedValue(mockPath)

      const result = await OnboardingService.getPersonalizedOnboardingPath('user-123', mockContext)

      expect(result).toEqual(mockPath)
      expect(PathEngine.generatePersonalizedPath).toHaveBeenCalledWith('user-123', mockContext)
    })
  })

  describe('suggestAlternativePaths', () => {
    it('should delegate to PathEngine', async () => {
      const mockAlternatives = [
        {
          pathId: 'path-456',
          pathName: 'Beginner Path',
          reason: 'Easier difficulty level',
          estimatedDuration: 90,
          difficultyLevel: 'beginner',
          focusAreas: ['basics']
        }
      ]

      ;(PathEngine.suggestAlternativePaths as Mock).mockResolvedValue(mockAlternatives)

      const issues = [
        {
          type: 'difficulty' as const,
          description: 'Too difficult',
          severity: 'high' as const
        }
      ]

      const result = await OnboardingService.suggestAlternativePaths('session-123', issues)

      expect(result).toEqual(mockAlternatives)
      expect(PathEngine.suggestAlternativePaths).toHaveBeenCalledWith('session-123', issues)
    })
  })
})