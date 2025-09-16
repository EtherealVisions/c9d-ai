/**
 * Fixed ProgressTrackerService Tests - Version 2
 * Demonstrates proper mock setup and test patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceTestSetup } from '../../__tests__/setup/mocks/supabase-client-fixed-v2'

// Mock the database module with proper path
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

describe('ProgressTrackerService - Fixed Tests', () => {
  let testSetup: ReturnType<typeof createServiceTestSetup>
  let ProgressTrackerService: any

  const mockSessionId = 'session-123'
  const mockStepId = 'step-456'
  const mockUserId = 'user-789'

  beforeEach(async () => {
    // Setup test infrastructure
    testSetup = createServiceTestSetup()
    
    // Mock the database client
    const { createSupabaseClient } = await import('@/lib/database')
    vi.mocked(createSupabaseClient).mockReturnValue(testSetup.client as any)

    // Import service after mocking
    const module = await import('@/lib/services/progress-tracker-service')
    ProgressTrackerService = module.ProgressTrackerService
  })

  afterEach(() => {
    testSetup.reset()
    vi.clearAllMocks()
  })

  describe('trackStepProgress', () => {
    it('should create new progress record when none exists', async () => {
      const progressCrud = testSetup.setupCrud('user_progress')
      
      // Mock no existing record (first call)
      progressCrud.mockNotFound()
      
      // Mock successful insert (second call)
      const mockProgressData = {
        id: 'progress-123',
        session_id: mockSessionId,
        step_id: mockStepId,
        user_id: mockUserId,
        status: 'in_progress',
        started_at: '2024-01-01T10:00:00Z',
        onboarding_steps: { id: mockStepId, title: 'Test Step' },
        onboarding_sessions: { id: mockSessionId, user_id: mockUserId }
      }
      
      // Setup the second call to return the created data
      const query = testSetup.client._mocks.setupTable('user_progress')
      query.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: mockProgressData, error: null })

      const progress = { status: 'in_progress' as const, started_at: '2024-01-01T10:00:00Z' }
      const result = await ProgressTrackerService.trackStepProgress(
        mockSessionId,
        mockStepId,
        mockUserId,
        progress
      )

      expect(result).toBeDefined()
      expect(result.session_id).toBe(mockSessionId)
      expect(result.step_id).toBe(mockStepId)
      expect(result.status).toBe('in_progress')
    })

    it('should update existing progress record', async () => {
      const existingRecord = {
        id: 'progress-123',
        session_id: mockSessionId,
        step_id: mockStepId,
        user_id: mockUserId,
        status: 'not_started'
      }

      const updatedRecord = {
        ...existingRecord,
        status: 'completed',
        completed_at: '2024-01-01T11:00:00Z',
        onboarding_steps: { id: mockStepId, title: 'Test Step' },
        onboarding_sessions: { id: mockSessionId, user_id: mockUserId }
      }

      const query = testSetup.client._mocks.setupTable('user_progress')
      query.single
        .mockResolvedValueOnce({ data: existingRecord, error: null })
        .mockResolvedValueOnce({ data: updatedRecord, error: null })

      const progress = { status: 'completed' as const, completed_at: '2024-01-01T11:00:00Z' }
      const result = await ProgressTrackerService.trackStepProgress(
        mockSessionId,
        mockStepId,
        mockUserId,
        progress
      )

      expect(result.status).toBe('completed')
      expect(result.completed_at).toBe('2024-01-01T11:00:00Z')
    })

    it('should handle database errors gracefully', async () => {
      const query = testSetup.client._mocks.setupTable('user_progress')
      query.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(
        ProgressTrackerService.trackStepProgress(mockSessionId, mockStepId, mockUserId, {})
      ).rejects.toThrow('Failed to track step progress')
    })
  })

  describe('getOverallProgress', () => {
    it('should calculate overall progress correctly', async () => {
      // Mock session data
      const mockSession = {
        id: mockSessionId,
        user_id: mockUserId,
        status: 'active',
        current_step_index: 1,
        updated_at: '2024-01-01T12:00:00Z',
        onboarding_paths: {
          onboarding_steps: [
            { id: 'step-1' },
            { id: 'step-2' }
          ]
        }
      }

      // Mock progress records
      const mockProgressRecords = [
        { step_id: 'step-1', status: 'completed', time_spent: 900 },
        { step_id: 'step-2', status: 'in_progress', time_spent: 600 }
      ]

      // Mock achievements
      const mockAchievements: any[] = []

      // Setup multiple table mocks
      const sessionQuery = testSetup.client._mocks.setupTable('onboarding_sessions')
      sessionQuery.single.mockResolvedValue({ data: mockSession, error: null })

      const progressQuery = testSetup.client._mocks.setupTable('user_progress')
      // Mock the chained query for progress records
      const progressChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProgressRecords, error: null })
      }
      testSetup.client.from.mockImplementation((table: string) => {
        if (table === 'onboarding_sessions') return sessionQuery
        if (table === 'user_progress') return progressChain
        if (table === 'user_achievements') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockAchievements, error: null })
        }
        return testSetup.client._mocks.setupTable(table)
      })

      const result = await ProgressTrackerService.getOverallProgress(mockSessionId)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(mockSessionId)
      expect(result.completedSteps).toEqual(['step-1'])
      expect(result.overallProgress).toBe(50)
    })

    it('should handle empty progress records', async () => {
      const mockSession = {
        id: mockSessionId,
        user_id: mockUserId,
        status: 'active',
        current_step_index: 0,
        updated_at: '2024-01-01T12:00:00Z',
        onboarding_paths: {
          onboarding_steps: []
        }
      }

      const sessionQuery = testSetup.client._mocks.setupTable('onboarding_sessions')
      sessionQuery.single.mockResolvedValue({ data: mockSession, error: null })

      // Mock empty progress and achievements
      testSetup.client.from.mockImplementation((table: string) => {
        if (table === 'onboarding_sessions') return sessionQuery
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const result = await ProgressTrackerService.getOverallProgress(mockSessionId)

      expect(result.overallProgress).toBe(0)
      expect(result.timeSpent).toBe(0)
      expect(result.completedSteps).toEqual([])
    })
  })

  describe('recordStepCompletion', () => {
    it('should record step completion successfully', async () => {
      const stepResult = {
        stepId: mockStepId,
        status: 'completed' as const,
        timeSpent: 300,
        userActions: { clicks: 5, inputs: 3 },
        feedback: { rating: 5 },
        achievements: { first_completion: true }
      }

      const mockProgress = {
        id: 'progress-123',
        session_id: mockSessionId,
        step_id: mockStepId,
        user_id: mockUserId,
        status: 'completed',
        time_spent: 300,
        onboarding_steps: {},
        onboarding_sessions: {}
      }

      // Setup the mock calls for trackStepProgress
      const query = testSetup.client._mocks.setupTable('user_progress')
      query.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: mockProgress, error: null })

      // Mock milestones and analytics queries
      testSetup.client.from.mockImplementation((table: string) => {
        if (table === 'user_progress') return query
        if (table === 'onboarding_milestones') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        }
        if (table === 'onboarding_analytics') return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        }
        return testSetup.client._mocks.setupTable(table)
      })

      const result = await ProgressTrackerService.recordStepCompletion(
        mockSessionId,
        mockStepId,
        mockUserId,
        stepResult
      )

      expect(result).toBeDefined()
      expect(result.status).toBe('completed')
      expect(result.time_spent).toBe(300)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const query = testSetup.client._mocks.setupTable('user_progress')
      query.single.mockRejectedValue(new Error('Connection failed'))

      await expect(
        ProgressTrackerService.trackStepProgress(mockSessionId, mockStepId, mockUserId, {})
      ).rejects.toThrow('Failed to track step progress')
    })

    it('should handle malformed data gracefully', async () => {
      const query = testSetup.client._mocks.setupTable('onboarding_sessions')
      query.single.mockResolvedValue({
        data: null,
        error: { message: 'Invalid data format' }
      })

      await expect(
        ProgressTrackerService.getOverallProgress(mockSessionId)
      ).rejects.toThrow('Failed to get overall progress')
    })
  })
})