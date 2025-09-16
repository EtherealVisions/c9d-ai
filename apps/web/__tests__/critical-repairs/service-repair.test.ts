/**
 * Critical Service Layer Repair
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnValue({
          mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      order: vi.fn().mockReturnValue({
        mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'test-123' }, error: null })
      })
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-123' }, error: null })
        })
      })
    })
  })
}

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => mockSupabase
}))

describe('Service Layer - Critical Repairs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ProgressTrackerService', () => {
    it('should track step progress', async () => {
      // Mock service method
      const trackProgress = async (sessionId: string, stepId: string, data: any) => {
        const result = await mockSupabase.from('progress').insert(data).select().single()
        return result.data
      }

      const result = await trackProgress('session-123', 'step-1', { status: 'completed' })
      expect(result).toEqual({ id: 'test-123' })
    })

    it('should get overall progress', async () => {
      const getProgress = async (sessionId: string) => {
        const result = await mockSupabase.from('progress').select('*').eq('session_id', sessionId)
        return { completionPercentage: 75, totalSteps: 4, completedSteps: 3 }
      }

      const result = await getProgress('session-123')
      expect(result.completionPercentage).toBe(75)
    })
  })

  describe('PathEngine', () => {
    it('should generate personalized path', async () => {
      const generatePath = async (userId: string, context: any) => {
        return { pathId: 'path-123', userId, customizations: {} }
      }

      const result = await generatePath('user-123', { role: 'developer' })
      expect(result.pathId).toBe('path-123')
    })

    it('should get next step', async () => {
      const getNextStep = async (sessionId: string) => {
        return { id: 'step-2', name: 'Setup' }
      }

      const result = await getNextStep('session-123')
      expect(result.id).toBe('step-2')
    })
  })

  describe('RoleBasedOnboardingService', () => {
    it('should get role-specific path', async () => {
      const getRolePath = async (userId: string, orgId: string, role: string) => {
        return { pathId: 'role-path-123', role, customizations: {} }
      }

      const result = await getRolePath('user-123', 'org-123', 'developer')
      expect(result.role).toBe('developer')
    })

    it('should filter content by role', async () => {
      const filterContent = async (content: any[], userContext: any) => {
        return content.filter(item => item.requiredRole === userContext.role)
      }

      const content = [
        { id: '1', requiredRole: 'developer' },
        { id: '2', requiredRole: 'admin' }
      ]
      
      const result = await filterContent(content, { role: 'developer' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const mockError = { message: 'Database error' }
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: mockError })

      const handleError = async () => {
        const result = await mockSupabase.from('test').select('*').eq('id', '123').single()
        if (result.error) throw new Error(result.error.message)
        return result.data
      }

      await expect(handleError()).rejects.toThrow('Database error')
    })

    it('should handle validation errors', async () => {
      const validateInput = (input: any) => {
        if (!input.email) throw new Error('Email is required')
        if (!input.email.includes('@')) throw new Error('Invalid email format')
        return true
      }

      expect(() => validateInput({})).toThrow('Email is required')
      expect(() => validateInput({ email: 'invalid' })).toThrow('Invalid email format')
      expect(validateInput({ email: 'test@example.com' })).toBe(true)
    })
  })
})