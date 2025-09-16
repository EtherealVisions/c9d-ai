/**
 * Critical Mock Infrastructure Repair Tests
 * Validates that mock infrastructure works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient, mockSupabaseResponse, mockNotFoundError } from '../setup/mocks/supabase-client-emergency-fix'

describe('Mock Infrastructure Critical Repair', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
  })

  describe('Supabase Mock Chain Methods', () => {
    it('should support basic query chaining', () => {
      const query = mockSupabase.from('test_table')
      
      expect(query.select).toBeDefined()
      expect(query.insert).toBeDefined()
      expect(query.update).toBeDefined()
      expect(query.eq).toBeDefined()
      expect(query.order).toBeDefined()
      expect(query.single).toBeDefined()
    })

    it('should support method chaining', () => {
      const query = mockSupabase.from('test_table')
        .select('*')
        .eq('id', '123')
        .order('created_at')
        .single()

      expect(query).toBeDefined()
    })

    it('should support mockResolvedValue chaining', async () => {
      const mockData = { id: '123', name: 'Test' }
      const query = mockSupabase.from('test_table')
      
      query.single.mockResolvedValue(mockSupabaseResponse(mockData))
      
      const result = await query.select('*').eq('id', '123').single()
      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('should support mockResolvedValueOnce chaining', async () => {
      const mockData = { id: '123', name: 'Test' }
      const query = mockSupabase.from('test_table')
      
      query.mockResolvedValueOnce(mockSupabaseResponse(mockData))
      
      const result = await query.select('*').eq('id', '123').single()
      expect(result.data).toEqual(mockData)
    })

    it('should handle error responses correctly', async () => {
      const query = mockSupabase.from('test_table')
      
      query.single.mockResolvedValue(mockNotFoundError())
      
      const result = await query.select('*').eq('id', 'nonexistent').single()
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('PGRST116')
    })
  })

  describe('Service Integration Mock Patterns', () => {
    it('should support ProgressTrackerService mock pattern', async () => {
      const mockProgress = {
        id: 'progress-123',
        session_id: 'session-123',
        step_id: 'step-123',
        status: 'completed',
        time_spent: 300
      }

      // Mock the pattern used in ProgressTrackerService
      const query = mockSupabase.from('user_progress')
      query.single
        .mockResolvedValueOnce(mockNotFoundError()) // No existing record
        .mockResolvedValueOnce(mockSupabaseResponse(mockProgress)) // Insert success

      // Test the pattern
      const checkResult = await query.select('*').eq('session_id', 'session-123').single()
      expect(checkResult.error?.code).toBe('PGRST116')

      const insertResult = await query.insert(mockProgress).select('*').single()
      expect(insertResult.data).toEqual(mockProgress)
    })

    it('should support PathEngine mock pattern', async () => {
      const mockPath = {
        id: 'path-123',
        name: 'Test Path',
        steps: [{ id: 'step-1', step_order: 0 }]
      }

      const query = mockSupabase.from('onboarding_paths')
      query.single.mockResolvedValue(mockSupabaseResponse(mockPath))

      const result = await query
        .select('*, onboarding_steps(*)')
        .eq('id', 'path-123')
        .single()

      expect(result.data).toEqual(mockPath)
    })

    it('should support RoleBasedOnboardingService mock pattern', async () => {
      const mockRoleConfig = {
        id: 'config-123',
        organization_id: 'org-123',
        role: 'developer',
        onboarding_path_id: 'path-123'
      }

      const query = mockSupabase.from('role_onboarding_configurations')
      query.single.mockResolvedValue(mockSupabaseResponse(mockRoleConfig))

      const result = await query
        .select('*')
        .eq('organization_id', 'org-123')
        .eq('role', 'developer')
        .single()

      expect(result.data).toEqual(mockRoleConfig)
    })
  })

  describe('Error Handling Mock Patterns', () => {
    it('should properly mock NotFoundError scenarios', async () => {
      const query = mockSupabase.from('test_table')
      query.single.mockResolvedValue(mockNotFoundError())

      const result = await query.select('*').eq('id', 'nonexistent').single()
      
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('PGRST116')
    })

    it('should properly mock DatabaseError scenarios', async () => {
      const query = mockSupabase.from('test_table')
      query.single.mockResolvedValue(mockSupabaseResponse(null, {
        message: 'Connection failed',
        code: 'CONNECTION_ERROR'
      }))

      const result = await query.select('*').single()
      
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error.message).toBe('Connection failed')
    })

    it('should support multiple sequential mock calls', async () => {
      const query = mockSupabase.from('test_table')
      
      // Set up sequence of responses
      query.single
        .mockResolvedValueOnce(mockNotFoundError())
        .mockResolvedValueOnce(mockSupabaseResponse({ id: '123' }))
        .mockResolvedValueOnce(mockSupabaseResponse({ id: '456' }))

      // Test sequence
      const result1 = await query.select('*').eq('id', '1').single()
      expect(result1.error?.code).toBe('PGRST116')

      const result2 = await query.select('*').eq('id', '2').single()
      expect(result2.data.id).toBe('123')

      const result3 = await query.select('*').eq('id', '3').single()
      expect(result3.data.id).toBe('456')
    })
  })

  describe('Complex Query Mock Patterns', () => {
    it('should support joins and complex selects', async () => {
      const mockData = {
        id: 'session-123',
        user_id: 'user-123',
        onboarding_paths: {
          id: 'path-123',
          name: 'Test Path',
          onboarding_steps: [
            { id: 'step-1', step_order: 0 },
            { id: 'step-2', step_order: 1 }
          ]
        }
      }

      const query = mockSupabase.from('onboarding_sessions')
      query.single.mockResolvedValue(mockSupabaseResponse(mockData))

      const result = await query
        .select(`
          *,
          onboarding_paths(
            *,
            onboarding_steps(*)
          )
        `)
        .eq('id', 'session-123')
        .single()

      expect(result.data).toEqual(mockData)
      expect(result.data.onboarding_paths.onboarding_steps).toHaveLength(2)
    })

    it('should support array responses for list queries', async () => {
      const mockData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'in_progress' }
      ]

      const query = mockSupabase.from('user_progress')
      query.mockResolvedValue(mockSupabaseResponse(mockData))

      const result = await query
        .select('*')
        .eq('session_id', 'session-123')
        .order('created_at')

      expect(result.data).toEqual(mockData)
      expect(result.data).toHaveLength(2)
    })
  })
})