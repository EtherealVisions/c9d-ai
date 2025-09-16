/**
 * Simplified unit tests for ProgressTrackerService
 * Tests core functionality with proper mocking
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ProgressTrackerService } from '../progress-tracker-service'
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

describe('ProgressTrackerService - Simple Tests', () => {
  let mockSupabase: any
  const mockSessionId = 'session-123'
  const mockStepId = 'step-456'
  const mockUserId = 'user-789'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a simple mock structure
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase = {
      from: vi.fn(() => mockQuery)
    }

    ;(createSupabaseClient as Mock).mockReturnValue(mockSupabase)
  })

  describe('trackStepProgress', () => {
    it('should create new progress record when none exists', async () => {
      const mockQuery = mockSupabase.from()
      
      // Mock no existing record found
      mockQuery.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ 
          data: { 
            id: 'progress-123',
            session_id: mockSessionId,
            step_id: mockStepId,
            status: 'in_progress',
            started_at: new Date().toISOString()
          }, 
          error: null 
        })

      const result = await ProgressTrackerService.trackStepProgress(
        mockSessionId,
        mockStepId,
        'in_progress',
        { time_spent: 30 }
      )

      expect(result).toBeDefined()
      expect(result.session_id).toBe(mockSessionId)
      expect(result.step_id).toBe(mockStepId)
      expect(result.status).toBe('in_progress')
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = mockSupabase.from()
      mockQuery.single.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        ProgressTrackerService.trackStepProgress(mockSessionId, mockStepId, mockUserId, { status: 'in_progress' })
      ).rejects.toThrow('Failed to track step progress')
    })
  })

  describe('getOverallProgress', () => {
    it('should calculate overall progress correctly', async () => {
      // Mock the three database calls that getOverallProgress makes
      // Each call to from() returns a new query object, so we need to mock each one
      
      // 1. Mock session data with path info
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
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
              },
              error: null
            })
          })
        })
      })
      
      // 2. Mock progress records
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { step_id: 'step-1', status: 'completed', time_spent: 900 },
                { step_id: 'step-2', status: 'in_progress', time_spent: 600 }
              ],
              error: null
            })
          })
        })
      })
      
      // 3. Mock achievements
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await ProgressTrackerService.getOverallProgress(mockSessionId)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(mockSessionId)
      expect(result.completedSteps).toEqual(['step-1'])
      expect(result.overallProgress).toBe(50)
    })

    it('should handle empty progress records', async () => {
      // 1. Mock session data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockSessionId,
                user_id: mockUserId,
                status: 'active',
                current_step_index: 0,
                updated_at: '2024-01-01T12:00:00Z',
                onboarding_paths: {
                  onboarding_steps: []
                }
              },
              error: null
            })
          })
        })
      })
      
      // 2. Mock empty progress records
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })
      
      // 3. Mock empty achievements
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await ProgressTrackerService.getOverallProgress(mockSessionId)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(mockSessionId)
      expect(result.completedSteps).toEqual([])
      expect(result.overallProgress).toBe(0)
    })

    it('should handle database errors', async () => {
      const mockQuery = mockSupabase.from()
      mockQuery.single.mockRejectedValue(new Error('Database error'))

      await expect(
        ProgressTrackerService.getOverallProgress(mockSessionId)
      ).rejects.toThrow('Failed to get overall progress')
    })
  })

  describe('recordStepCompletion', () => {
    it('should record step completion successfully', async () => {
      const mockQuery = mockSupabase.from()
      
      // Mock the calls that recordStepCompletion makes:
      // 1. trackStepProgress calls (check existing + insert/update)
      mockQuery.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ 
          data: { 
            id: 'progress-123',
            session_id: mockSessionId,
            step_id: mockStepId,
            status: 'completed',
            completed_at: new Date().toISOString()
          }, 
          error: null 
        })

      const result = await ProgressTrackerService.recordStepCompletion(
        mockSessionId,
        mockStepId,
        mockUserId,
        { 
          stepId: mockStepId,
          status: 'completed', 
          timeSpent: 300,
          userActions: {}
        }
      )

      expect(result).toBeDefined()
      expect(result.status).toBe('completed')
    })

    it('should handle completion errors', async () => {
      const mockQuery = mockSupabase.from()
      mockQuery.single.mockRejectedValue(new Error('Completion failed'))

      await expect(
        ProgressTrackerService.recordStepCompletion(mockSessionId, mockStepId, mockUserId, { 
          stepId: mockStepId,
          status: 'failed',
          timeSpent: 0,
          userActions: {}
        })
      ).rejects.toThrow('Failed to track step progress')
    })
  })

  describe('Local Storage Backup', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
    })

    it('should restore progress from localStorage', async () => {
      const mockBackupData = {
        progress: {
          sessionId: mockSessionId,
          completedSteps: ['step-1', 'step-2'],
          overallProgress: 40,
          timeSpent: 1200
        },
        achievements: [],
        lastBackup: '2024-01-01T12:00:00Z'
      }

      ;(window.localStorage.getItem as Mock).mockReturnValue(JSON.stringify(mockBackupData))

      const result = await ProgressTrackerService.restoreProgressFromLocalStorage(mockSessionId)

      expect(result).toBeDefined()
      expect(result.progress).toBeDefined()
      expect(result.progress?.sessionId).toBe(mockSessionId)
      expect(result.progress?.completedSteps).toEqual(['step-1', 'step-2'])
      expect(result.achievements).toEqual([])
    })

    it('should handle missing localStorage data', async () => {
      ;(window.localStorage.getItem as Mock).mockReturnValue(null)

      const result = await ProgressTrackerService.restoreProgressFromLocalStorage(mockSessionId)

      expect(result.progress).toBeNull()
    })

    it('should handle corrupted localStorage data', async () => {
      ;(window.localStorage.getItem as Mock).mockReturnValue('invalid-json')

      const result = await ProgressTrackerService.restoreProgressFromLocalStorage(mockSessionId)

      expect(result.progress).toBeNull()
    })
  })
})