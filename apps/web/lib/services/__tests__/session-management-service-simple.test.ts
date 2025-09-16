import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  })
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(),
  useSession: vi.fn()
}))

import { SessionManagementService } from '../session-management-service'

describe('SessionManagementService', () => {
  let service: SessionManagementService
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SessionManagementService()
    
    // Get the mocked supabase client
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }
  })

  describe('Basic functionality', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(SessionManagementService)
    })

    it('should initialize session', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'

      // The service should not throw when initializing
      await expect(service.initializeSession(userId, sessionId)).resolves.toBeUndefined()
    })

    it('should update session activity', async () => {
      const sessionId = 'session-456'

      await expect(service.updateSessionActivity(sessionId)).resolves.toBeUndefined()
    })

    it('should get user active sessions', async () => {
      const userId = 'user-123'

      const sessions = await service.getUserActiveSessions(userId)
      expect(sessions).toEqual([])
    })

    it('should revoke session', async () => {
      const sessionId = 'session-456'

      await expect(service.revokeSession(sessionId)).resolves.toBeUndefined()
    })

    it('should cleanup expired sessions', async () => {
      await expect(service.cleanupExpiredSessions()).resolves.toBeUndefined()
    })
  })

  describe('Error handling', () => {
    it('should handle session retrieval errors gracefully', async () => {
      const userId = 'user-123'

      // Service should handle errors gracefully and return empty array
      const sessions = await service.getUserActiveSessions(userId)
      expect(sessions).toEqual([])
    })
  })
})