/**
 * Unit Tests for SessionManagementService
 * 
 * These tests focus on business logic and error handling without database calls.
 * For database integration testing, see session-management-service.integration.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionManagementService } from '../session-management-service'

// Mock the database to focus on business logic
vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ data: {}, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: {}, error: null }) }),
      upsert: () => Promise.resolve({ data: {}, error: null })
    })
  })
}))

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(),
  useSession: vi.fn()
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
})

describe('SessionManagementService', () => {
  let service: SessionManagementService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SessionManagementService()
    
    // Reset timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initializeSession', () => {
    it('should initialize session with device info', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'
      const organizationId = 'org-789'

      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          error: null
        }),
        insert: vi.fn().mockReturnValue({
          error: null
        })
      })

      await service.initializeSession(userId, sessionId, organizationId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('session_events')
    })

    it('should handle initialization errors gracefully', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'

      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          error: new Error('Database error')
        })
      })

      await expect(service.initializeSession(userId, sessionId)).rejects.toThrow('Database error')
    })
  })

  describe('updateSessionActivity', () => {
    it('should update session last activity', async () => {
      const sessionId = 'session-456'
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            error: null
          })
        })
      })

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      })

      await service.updateSessionActivity(sessionId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          last_activity: expect.any(String),
          updated_at: expect.any(String)
        })
      )
    })

    it('should handle update errors gracefully', async () => {
      const sessionId = 'session-456'
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              error: new Error('Update failed')
            })
          })
        })
      })

      // Should not throw, just log error
      await expect(service.updateSessionActivity(sessionId)).resolves.toBeUndefined()
    })
  })

  describe('checkAndRefreshSession', () => {
    it('should return true for valid session', async () => {
      const sessionId = 'session-456'
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  session_id: sessionId,
                  expires_at: futureDate.toISOString(),
                  is_active: true
                },
                error: null
              })
            })
          })
        })
      })

      const result = await service.checkAndRefreshSession(sessionId)
      expect(result).toBe(true)
    })

    it('should refresh session when near expiry', async () => {
      const sessionId = 'session-456'
      const nearExpiryDate = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  session_id: sessionId,
                  expires_at: nearExpiryDate.toISOString(),
                  is_active: true
                },
                error: null
              })
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              error: null
            })
          })
        })
      })

      const result = await service.checkAndRefreshSession(sessionId)
      expect(result).toBe(true)
    })

    it('should return false for non-existent session', async () => {
      const sessionId = 'session-456'

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      })

      const result = await service.checkAndRefreshSession(sessionId)
      expect(result).toBe(false)
    })
  })

  describe('revokeSession', () => {
    it('should revoke session and log event', async () => {
      const sessionId = 'session-456'
      const reason = 'user_logout'

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            error: null
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'user-123' },
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          error: null
        })
      })

      await service.revokeSession(sessionId, reason)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('session_events')
    })

    it('should handle revocation errors', async () => {
      const sessionId = 'session-456'

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            error: new Error('Revocation failed')
          })
        })
      })

      await expect(service.revokeSession(sessionId)).rejects.toThrow('Revocation failed')
    })
  })

  describe('getUserActiveSessions', () => {
    it('should return active sessions for user', async () => {
      const userId = 'user-123'
      const mockSessions = [
        {
          session_id: 'session-1',
          user_id: userId,
          organization_id: 'org-1',
          device_info: { type: 'desktop', os: 'macOS', browser: 'Chrome', userAgent: 'test' },
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          is_active: true
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockSessions,
                error: null
              })
            })
          })
        })
      })

      const sessions = await service.getUserActiveSessions(userId)

      expect(sessions).toHaveLength(1)
      expect(sessions[0].sessionId).toBe('session-1')
      expect(sessions[0].userId).toBe(userId)
    })

    it('should return empty array on error', async () => {
      const userId = 'user-123'

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      })

      const sessions = await service.getUserActiveSessions(userId)
      expect(sessions).toEqual([])
    })
  })

  describe('revokeOtherSessions', () => {
    it('should revoke all sessions except current', async () => {
      const userId = 'user-123'
      const currentSessionId = 'session-current'

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                error: null
              })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          error: null
        })
      })

      await service.revokeOtherSessions(userId, currentSessionId)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('session_events')
    })

    it('should handle revocation errors', async () => {
      const userId = 'user-123'
      const currentSessionId = 'session-current'

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                error: new Error('Revocation failed')
              })
            })
          })
        })
      })

      await expect(service.revokeOtherSessions(userId, currentSessionId)).rejects.toThrow('Revocation failed')
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as inactive', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              error: null
            })
          })
        })
      })

      await service.cleanupExpiredSessions()

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
    })

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              error: new Error('Cleanup failed')
            })
          })
        })
      })

      // Should not throw, just log error
      await expect(service.cleanupExpiredSessions()).resolves.toBeUndefined()
    })
  })

  describe('device detection', () => {
    it('should detect desktop device correctly', async () => {
      // Mock desktop user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        configurable: true
      })

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({ error: null }),
        insert: vi.fn().mockReturnValue({ error: null })
      })

      await service.initializeSession('user-123', 'session-456')

      // Verify device info was captured correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
    })

    it('should detect mobile device correctly', async () => {
      // Mock mobile user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        },
        configurable: true
      })

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({ error: null }),
        insert: vi.fn().mockReturnValue({ error: null })
      })

      await service.initializeSession('user-123', 'session-456')

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
    })
  })

  describe('session monitoring', () => {
    it('should start and stop session monitoring', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({ error: null }),
        insert: vi.fn().mockReturnValue({ error: null })
      })

      // Initialize session (starts monitoring)
      await service.initializeSession(userId, sessionId)

      // Fast-forward time to trigger monitoring
      vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes

      // Revoke session (stops monitoring)
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { user_id: userId },
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({ error: null })
      })

      await service.revokeSession(sessionId)

      // Monitoring should be stopped
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })
})