/**
 * Unit tests for PathEngine
 * Tests path generation, adaptation, and personalization logic
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { PathEngine, type UserBehavior } from '../path-engine'
import { createSupabaseClient } from '@/lib/database'
import type { 
  OnboardingContext, 
  OnboardingPath, 
  OnboardingStep,
  OnboardingSession 
} from '@/lib/models'

// Mock the database client
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
    constructor(code: string, message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  },
  ErrorCode: {
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR'
  }
}))

describe('PathEngine', () => {
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

  function createMockSupabaseClient() {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnThis()
    const mockInsert = vi.fn().mockReturnThis()
    const mockUpdate = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOr = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()

    // Chain the methods properly
    mockSelect.mockImplementation(() => ({
      eq: mockEq,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle
    }))

    mockEq.mockImplementation(() => ({
      eq: mockEq,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle
    }))

    mockOr.mockImplementation(() => ({
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle
    }))

    mockOrder.mockImplementation(() => ({
      limit: mockLimit,
      single: mockSingle
    }))

    mockLimit.mockImplementation(() => ({
      single: mockSingle
    }))

    mockInsert.mockImplementation(() => ({
      single: mockSingle
    }))

    const mockFrom = vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq
    }))

    return {
      from: mockFrom,
      _mocks: {
        from: mockFrom,
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        eq: mockEq,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle
      }
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
    learning_objectives: ['Learn platform basics', 'Complete first project'],
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
        content: { type: 'text', data: 'Welcome content' },
        interactive_elements: {},
        success_criteria: {},
        validation_rules: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'step-2',
        path_id: 'path-123',
        title: 'First Project',
        description: 'Create your first project',
        step_type: 'exercise',
        step_order: 1,
        estimated_time: 30,
        is_required: true,
        dependencies: ['step-1'],
        content: { type: 'interactive', data: 'Project creation guide' },
        interactive_elements: { sandbox: true },
        success_criteria: { project_created: true },
        validation_rules: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  }

  const mockUserBehavior: UserBehavior = {
    sessionId: 'session-123',
    stepInteractions: [
      {
        stepId: 'step-1',
        timeSpent: 900, // 15 minutes
        attempts: 1,
        completionRate: 1.0,
        skipRate: 0.0,
        errorRate: 0.0
      },
      {
        stepId: 'step-2',
        timeSpent: 2400, // 40 minutes
        attempts: 3,
        completionRate: 0.7,
        skipRate: 0.0,
        errorRate: 0.3
      }
    ],
    learningStyle: 'visual',
    pacePreference: 'medium',
    engagementLevel: 'medium',
    strugglingAreas: ['step-2'],
    preferredContentTypes: ['interactive', 'video']
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient()
    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('generatePersonalizedPath', () => {
    it('should generate a personalized path based on user context', async () => {
      // Mock the paths query
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: [mockPath],
        error: null
      })

      // Mock user preferences query
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: { preferences: { learningStyle: 'visual', pacePreference: 'medium' } },
        error: null
      })

      // Mock sessions query
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: [],
        error: null
      })

      // Mock analytics insert
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await PathEngine.generatePersonalizedPath('user-123', mockContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('path-123')
      expect(result.target_role).toBe('developer')
      expect(mockSupabase.from).toHaveBeenCalledWith('onboarding_paths')
    })

    it('should throw error when no matching paths found', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: [],
        error: null
      })

      await expect(
        PathEngine.generatePersonalizedPath('user-123', mockContext)
      ).rejects.toThrow('No suitable onboarding paths found for user context')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(
        PathEngine.generatePersonalizedPath('user-123', mockContext)
      ).rejects.toThrow('Failed to fetch matching paths')
    })
  })

  describe('adaptPath', () => {
    it('should adapt path based on user behavior patterns', async () => {
      // Mock session with path
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        path_id: 'path-123',
        onboarding_paths: mockPath
      }

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockSession,
        error: null
      })

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await PathEngine.adaptPath('session-123', mockUserBehavior)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe('session-123')
      expect(result.adjustmentType).toBeDefined()
      expect(result.adjustmentReason).toBeDefined()
    })

    it('should identify when no adjustments are needed', async () => {
      const goodBehavior: UserBehavior = {
        ...mockUserBehavior,
        stepInteractions: [
          {
            stepId: 'step-1',
            timeSpent: 900,
            attempts: 1,
            completionRate: 1.0,
            skipRate: 0.0,
            errorRate: 0.0
          }
        ],
        strugglingAreas: [],
        engagementLevel: 'high'
      }

      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        path_id: 'path-123',
        onboarding_paths: mockPath
      }

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockSession,
        error: null
      })

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await PathEngine.adaptPath('session-123', goodBehavior)

      expect(result.adjustmentReason).toContain('No adjustments needed')
    })

    it('should throw error when session not found', async () => {
      // Mock the getSessionWithPath method to return null
      const getSessionWithPathSpy = vi.spyOn(PathEngine as any, 'getSessionWithPath')
      getSessionWithPathSpy.mockResolvedValue(null)

      await expect(
        PathEngine.adaptPath('session-123', mockUserBehavior)
      ).rejects.toThrow('Session or path not found')
      
      getSessionWithPathSpy.mockRestore()
    })
  })

  describe('getNextStep', () => {
    it('should return the next incomplete step', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
      }

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const currentProgress = [
        {
          step_id: 'step-1',
          status: 'completed'
        }
      ]

      const result = await PathEngine.getNextStep('session-123', currentProgress as any)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-2')
      expect(result?.title).toBe('First Project')
    })

    it('should return null when all steps are completed', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
      }

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const currentProgress = [
        { step_id: 'step-1', status: 'completed' },
        { step_id: 'step-2', status: 'completed' }
      ]

      const result = await PathEngine.getNextStep('session-123', currentProgress as any)

      expect(result).toBeNull()
    })

    it('should respect step dependencies', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
      }

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const currentProgress: any[] = [] // No steps completed

      const result = await PathEngine.getNextStep('session-123', currentProgress)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-1') // Should return first step since step-2 depends on step-1
    })
  })

  describe('suggestAlternativePaths', () => {
    it('should suggest alternative paths for difficulty issues', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        path_id: 'path-123',
        session_metadata: { userRole: 'developer' }
      }

      const mockAlternativePaths = [
        {
          id: 'path-456',
          name: 'Beginner Developer Path',
          estimated_duration: 90
        }
      ]

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockSession,
        error: null
      })

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockAlternativePaths,
        error: null
      })

      const issues = [
        {
          type: 'difficulty' as const,
          description: 'User struggling with complex concepts',
          severity: 'high' as const
        }
      ]

      const result = await PathEngine.suggestAlternativePaths('session-123', issues)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('pathId')
      expect(result[0]).toHaveProperty('reason')
    })

    it('should handle multiple issues and prioritize by severity', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        path_id: 'path-123',
        session_metadata: { userRole: 'developer' }
      }

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockSession,
        error: null
      })

      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: [{ id: 'path-456', name: 'Alternative Path', estimated_duration: 60 }],
        error: null
      })

      const issues = [
        {
          type: 'pacing' as const,
          description: 'Too fast paced',
          severity: 'low' as const
        },
        {
          type: 'difficulty' as const,
          description: 'Too difficult',
          severity: 'high' as const
        }
      ]

      const result = await PathEngine.suggestAlternativePaths('session-123', issues)

      expect(result).toBeDefined()
      // High severity issues should be prioritized
      expect(result[0].reason).toContain('difficulty')
    })
  })

  describe('validatePathCompletion', () => {
    it('should validate complete path successfully', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
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
      expect(result.issues).toHaveLength(0)
      expect(result.missingSteps).toHaveLength(0)
    })

    it('should identify missing required steps', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
      }

      const mockProgress = [
        { step_id: 'step-1', status: 'completed' }
        // step-2 is missing
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

      expect(result.isValid).toBe(false)
      expect(result.completionPercentage).toBe(50)
      expect(result.issues).toContain('Missing 1 required steps')
      expect(result.missingSteps).toContain('step-2')
    })

    it('should identify dependency violations', async () => {
      const mockSession = {
        id: 'session-123',
        onboarding_paths: mockPath
      }

      const mockProgress = [
        // step-1 not completed but step-2 is (violates dependency)
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

      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('dependencies'))).toBe(true)
    })

    it('should handle session not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await PathEngine.validatePathCompletion('session-123')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Session or path not found')
      expect(result.completionPercentage).toBe(0)
    })
  })

  describe('private helper methods', () => {
    it('should score duration appropriately for pace preferences', () => {
      // Test fast pace preference
      expect((PathEngine as any).scoreDurationForPace(20, 'fast')).toBe(10)
      expect((PathEngine as any).scoreDurationForPace(45, 'fast')).toBe(5)
      expect((PathEngine as any).scoreDurationForPace(120, 'fast')).toBe(-5)

      // Test slow pace preference
      expect((PathEngine as any).scoreDurationForPace(120, 'slow')).toBe(10)
      expect((PathEngine as any).scoreDurationForPace(75, 'slow')).toBe(5)
      expect((PathEngine as any).scoreDurationForPace(20, 'slow')).toBe(-5)

      // Test medium pace preference
      expect((PathEngine as any).scoreDurationForPace(60, 'medium')).toBe(10)
      expect((PathEngine as any).scoreDurationForPace(20, 'medium')).toBe(0)
      expect((PathEngine as any).scoreDurationForPace(120, 'medium')).toBe(0)
    })
  })
})