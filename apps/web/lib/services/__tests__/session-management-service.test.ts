/**
 * Unit Tests for SessionManagementService - Drizzle Migration
 * 
 * These tests focus on business logic and error handling using Drizzle ORM.
 * Requirements: 5.4 - Update tests to use new database layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionManagementService } from '../session-management-service'
import { createMockDatabase } from '../../../__tests__/setup/drizzle-testing-setup'
import type { DrizzleDatabase } from '@/lib/db/connection'

// Mock Drizzle database
const mockDatabase = createMockDatabase()

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => mockDatabase
}))

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((column, value) => ({ column, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  desc: vi.fn((column) => ({ column, type: 'desc' })),
  gt: vi.fn((column, value) => ({ column, value, type: 'gt' })),
  lt: vi.fn((column, value) => ({ column, value, type: 'lt' }))
}))

// Mock schema imports
vi.mock('@/lib/db/schema/users', () => ({
  userSessions: {
    id: 'id',
    userId: 'userId',
    sessionId: 'sessionId',
    organizationId: 'organizationId',
    lastActivity: 'lastActivity',
    expiresAt: 'expiresAt',
    isActive: 'isActive',
    deviceInfo: 'deviceInfo'
  },
  sessionEvents: {
    id: 'id',
    sessionId: 'sessionId',
    eventType: 'eventType',
    eventData: 'eventData',
    timestamp: 'timestamp'
  }
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

describe('SessionManagementService - Drizzle Migration', () => {
  let service: SessionManagementService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SessionManagementService()
    
    // Reset mock database methods
    Object.keys(mockDatabase).forEach(key => {
      if (typeof mockDatabase[key as keyof typeof mockDatabase] === 'function') {
        vi.mocked(mockDatabase[key as keyof typeof mockDatabase]).mockClear()
      }
    })
    
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

      // Mock successful upsert operation
      vi.mocked(mockDatabase.insert).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.values).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.onConflictDoUpdate).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.returning).mockResolvedValue([{
        id: 'session-123',
        userId,
        sessionId,
        organizationId,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
        deviceInfo: {}
      }])

      await service.initializeSession(userId, sessionId, organizationId)

      expect(mockDatabase.insert).toHaveBeenCalled()
      expect(mockDatabase.values).toHaveBeenCalled()
    })

    it('should handle initialization errors gracefully', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'

      // Mock database error
      vi.mocked(mockDatabase.insert).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.values).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.onConflictDoUpdate).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.returning).mockRejectedValue(new Error('Database error'))

      await expect(service.initializeSession(userId, sessionId)).rejects.toThrow('Database error')
    })
  })

  describe('updateSessionActivity', () => {
    it('should update session last activity', async () => {
      const sessionId = 'session-456'

      // Mock successful update operation
      vi.mocked(mockDatabase.update).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.set).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.where).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.returning).mockResolvedValue([{
        id: 'session-123',
        sessionId,
        lastActivity: new Date(),
        updatedAt: new Date()
      }])

      await service.updateSessionActivity(sessionId)

      expect(mockDatabase.update).toHaveBeenCalled()
      expect(mockDatabase.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActivity: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
    })

    it('should handle update errors gracefully', async () => {
      const sessionId = 'session-456'
      
      // Mock database error
      vi.mocked(mockDatabase.update).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.set).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.where).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.returning).mockRejectedValue(new Error('Update failed'))

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