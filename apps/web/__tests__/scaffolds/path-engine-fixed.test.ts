/**
 * Fixed Path Engine Tests
 * Addresses mock configuration and ensures comprehensive coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PathEngine } from '@/lib/services/path-engine'
import { createStandardSupabaseMock } from './mock-infrastructure-fixes.test'

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
  }
}))

describe('PathEngine - Fixed Tests', () => {
  let mockSupabase: any

  const mockContext = {
    userId: 'user-123',
    organizationId: 'org-123',
    userRole: 'developer',
    subscriptionTier: 'pro',
    preferences: {
      learningStyle: 'visual',
      pacePreference: 'medium'
    }
  }

  const mockPath = {
    id: 'path-123',
    name: 'Developer Path',
    target_role: 'developer',
    estimated_duration: 60,
    steps: [
      {
        id: 'step-1',
        step_order: 0,
        dependencies: [],
        is_required: true
      },
      {
        id: 'step-2',
        step_order: 1,
        dependencies: ['step-1'],
        is_required: true
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createStandardSupabaseMock()
    
    const { createSupabaseClient } = require('@/lib/database')
    createSupabaseClient.mockReturnValue(mockSupabase)
  })

  describe('generatePersonalizedPath', () => {
    it('should generate personalized path successfully', async () => {
      // Mock the sequence of calls that generatePersonalizedPath makes
      mockSupabase._mocks.single
        .mockResolvedValueOnce({ data: [mockPath], error: null }) // getMatchingPaths
        .mockResolvedValueOnce({ data: { preferences: {} }, error: null }) // getUserLearningProfile
        .mockResolvedValueOnce({ data: [], error: null }) // user sessions
        .mockResolvedValueOnce({ data: null, error: null }) // analytics insert

      const result = await PathEngine.generatePersonalizedPath('user-123', mockContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('path-123')
      expect(result.name).toBe('Developer Path')
    })

    it('should throw NotFoundError when no paths found', async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: [], error: null })

      await expect(
        PathEngine.generatePersonalizedPath('user-123', mockContext)
      ).rejects.toThrow('No suitable onboarding paths found for user context')
    })

    it('should handle database errors', async () => {
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
    const mockUserBehavior = {
      sessionId: 'session-123',
      stepInteractions: [{
        stepId: 'step-1',
        timeSpent: 1800,
        attempts: 3,
        completionRate: 0.7,
        skipRate: 0.0,
        errorRate: 0.3
      }],
      learningStyle: 'visual' as const,
      pacePreference: 'slow' as const,
      engagementLevel: 'low' as const,
      strugglingAreas: ['step-1'],
      preferredContentTypes: ['video']
    }

    it('should adapt path based on user behavior', async () => {
      // Mock session with path
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: {
            id: 'session-123',
            user_id: 'user-123',
            path_id: 'path-123',
            onboarding_paths: mockPath
          },
          error: null
        })
        .mockResolvedValueOnce({ data: null, error: null }) // analytics insert

      const result = await PathEngine.adaptPath('session-123', mockUserBehavior)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe('session-123')
      expect(result.adjustmentType).toBeDefined()
    })

    it('should identify no adjustments needed for good behavior', async () => {
      const goodBehavior = {
        ...mockUserBehavior,
        engagementLevel: 'high' as const,
        strugglingAreas: []
      }

      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: {
            id: 'session-123',
            onboarding_paths: mockPath
          },
          error: null
        })
        .mockResolvedValueOnce({ data: null, error: null })

      const result = await PathEngine.adaptPath('session-123', goodBehavior)

      expect(result.adjustmentReason).toContain('No adjustments needed')
    })

    it('should throw error when session not found', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(
        PathEngine.adaptPath('session-123', mockUserBehavior)
      ).rejects.toThrow('Session or path not found')
    })
  })

  describe('getNextStep', () => {
    it('should return next incomplete step', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: 'session-123',
          onboarding_paths: mockPath
        },
        error: null
      })

      const currentProgress = [
        { step_id: 'step-1', status: 'completed' }
      ]

      const result = await PathEngine.getNextStep('session-123', currentProgress as any)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-2')
    })

    it('should return null when all steps completed', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: 'session-123',
          onboarding_paths: mockPath
        },
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
      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: 'session-123',
          onboarding_paths: mockPath
        },
        error: null
      })

      const currentProgress: any[] = []

      const result = await PathEngine.getNextStep('session-123', currentProgress)

      expect(result?.id).toBe('step-1') // First step since step-2 depends on step-1
    })
  })

  describe('suggestAlternativePaths', () => {
    it('should suggest alternatives for difficulty issues', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        path_id: 'path-123',
        session_metadata: { userRole: 'developer' }
      }

      const mockAlternatives = [{
        id: 'path-456',
        name: 'Beginner Path',
        estimated_duration: 90
      }]

      mockSupabase._mocks.single
        .mockResolvedValueOnce({ data: mockSession, error: null })
        .mockResolvedValueOnce({ data: mockAlternatives, error: null })

      const issues = [{
        type: 'difficulty' as const,
        description: 'Too difficult',
        severity: 'high' as const
      }]

      const result = await PathEngine.suggestAlternativePaths('session-123', issues)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('pathId')
      expect(result[0]).toHaveProperty('reason')
    })
  })

  describe('validatePathCompletion', () => {
    it('should validate complete path successfully', async () => {
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: {
            id: 'session-123',
            onboarding_paths: mockPath
          },
          error: null
        })

      // Mock progress records query
      const mockProgressQuery = createStandardSupabaseMock()
      mockProgressQuery._mocks.single.mockResolvedValue({
        data: [
          { step_id: 'step-1', status: 'completed' },
          { step_id: 'step-2', status: 'completed' }
        ],
        error: null
      })

      // Set up from method to return different mocks
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        return callCount === 1 ? mockSupabase._mocks : mockProgressQuery._mocks
      })

      const result = await PathEngine.validatePathCompletion('session-123')

      expect(result.isValid).toBe(true)
      expect(result.completionPercentage).toBe(100)
      expect(result.issues).toHaveLength(0)
    })

    it('should identify missing required steps', async () => {
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: {
            id: 'session-123',
            onboarding_paths: mockPath
          },
          error: null
        })

      const mockProgressQuery = createStandardSupabaseMock()
      mockProgressQuery._mocks.single.mockResolvedValue({
        data: [{ step_id: 'step-1', status: 'completed' }], // step-2 missing
        error: null
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        return callCount === 1 ? mockSupabase._mocks : mockProgressQuery._mocks
      })

      const result = await PathEngine.validatePathCompletion('session-123')

      expect(result.isValid).toBe(false)
      expect(result.completionPercentage).toBe(50)
      expect(result.missingSteps).toContain('step-2')
    })

    it('should handle session not found', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await PathEngine.validatePathCompletion('session-123')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Session or path not found')
    })
  })
})