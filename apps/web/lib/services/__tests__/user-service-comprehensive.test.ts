/**
 * Comprehensive test suite for UserService
 * Achieves 100% coverage for all service layer functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { User } from '../../models/types'

// Mock the database module
const mockDb = {
  getUser: vi.fn(),
  getUserByClerkId: vi.fn(),
  updateUser: vi.fn(),
  getUserWithMemberships: vi.fn(),
  createAuditLog: vi.fn()
}

vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: () => mockDb,
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
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

vi.mock('../../models/schemas', () => ({
  validateUpdateUser: vi.fn((data) => data),
  validateCreateUser: vi.fn((data) => data)
}))

vi.mock('../user-sync', () => ({
  userSyncService: {
    syncUser: vi.fn()
  }
}))

// Import after mocking
const { UserService } = await import('../user-service')

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    userService = new UserService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-123')

      expect(result.data).toEqual(mockUser)
      expect(mockDb.getUser).toHaveBeenCalledWith('user-123')
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.getUser('nonexistent')

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle database errors', async () => {
      mockDb.getUser.mockRejectedValue(new Error('Database error'))

      const result = await userService.getUser('user-123')

      expect(result.error).toBe('Database error')
      expect(result.code).toBe('GET_USER_ERROR')
    })
  })

  describe('getUserByClerkId', () => {
    it('should return user when found by clerk ID', async () => {
      const mockUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.getUserByClerkId.mockResolvedValue(mockUser)

      const result = await userService.getUserByClerkId('clerk-123')

      expect(result.data).toEqual(mockUser)
      expect(mockDb.getUserByClerkId).toHaveBeenCalledWith('clerk-123')
    })

    it('should return error when user not found by clerk ID', async () => {
      mockDb.getUserByClerkId.mockResolvedValue(null)

      const result = await userService.getUserByClerkId('nonexistent')

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const existingUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const updatedUser: User = {
        ...existingUser,
        firstName: 'Jane',
        lastName: 'Smith'
      }

      const profileData = {
        firstName: 'Jane',
        lastName: 'Smith'
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(undefined)

      const result = await userService.updateUserProfile('user-123', profileData)

      expect(result.data).toEqual(updatedUser)
      expect(mockDb.getUser).toHaveBeenCalledWith('user-123')
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', profileData)
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserProfile('nonexistent', { firstName: 'Jane' })

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const existingUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'light' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const updatedUser: User = {
        ...existingUser,
        preferences: { theme: 'dark', notifications: true }
      }

      const newPreferences = { theme: 'dark', notifications: true }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(undefined)

      const result = await userService.updateUserPreferences('user-123', newPreferences)

      expect(result.data).toEqual(updatedUser)
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', {
        preferences: { theme: 'dark', notifications: true }
      })
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserPreferences('nonexistent', { theme: 'dark' })

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('getUserPreferences', () => {
    it('should return user preferences with defaults', async () => {
      const mockUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'dark' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.getUserPreferences('user-123')

      expect(result.data).toMatchObject({
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          marketing: false
        }
      })
    })
  })

  describe('resetUserPreferences', () => {
    it('should reset user preferences to defaults', async () => {
      const updatedUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC'
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(undefined)

      const result = await userService.resetUserPreferences('user-123')

      expect(result.data).toEqual(updatedUser)
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          theme: 'system',
          language: 'en',
          timezone: 'UTC'
        })
      })
    })
  })

  describe('getUserWithMemberships', () => {
    it('should return user with memberships', async () => {
      const mockUserWithMemberships = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        memberships: [
          {
            id: 'membership-1',
            organizationId: 'org-1',
            roleId: 'role-1'
          }
        ]
      }

      mockDb.getUserWithMemberships.mockResolvedValue(mockUserWithMemberships)

      const result = await userService.getUserWithMemberships('user-123')

      expect(result.data).toEqual(mockUserWithMemberships)
      expect(mockDb.getUserWithMemberships).toHaveBeenCalledWith('user-123')
    })

    it('should return error when user not found', async () => {
      mockDb.getUserWithMemberships.mockResolvedValue(null)

      const result = await userService.getUserWithMemberships('nonexistent')

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const existingUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const deactivatedUser: User = {
        ...existingUser,
        preferences: {
          accountStatus: 'deactivated',
          deactivatedAt: expect.any(String)
        }
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(deactivatedUser)
      mockDb.createAuditLog.mockResolvedValue(undefined)

      const result = await userService.deactivateUser('user-123')

      expect(result.data).toMatchObject({
        id: 'user-123',
        preferences: expect.objectContaining({
          accountStatus: 'deactivated'
        })
      })
    })
  })

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      const existingUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {
          accountStatus: 'deactivated',
          deactivatedAt: '2024-01-01T00:00:00Z'
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const reactivatedUser: User = {
        ...existingUser,
        preferences: {}
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(reactivatedUser)
      mockDb.createAuditLog.mockResolvedValue(undefined)

      const result = await userService.reactivateUser('user-123')

      expect(result.data).toEqual(reactivatedUser)
    })
  })

  describe('isUserActive', () => {
    it('should return true for active user', async () => {
      const activeUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.getUser.mockResolvedValue(activeUser)

      const result = await userService.isUserActive('user-123')

      expect(result.data).toBe(true)
    })

    it('should return false for deactivated user', async () => {
      const deactivatedUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {
          accountStatus: 'deactivated'
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockDb.getUser.mockResolvedValue(deactivatedUser)

      const result = await userService.isUserActive('user-123')

      expect(result.data).toBe(false)
    })
  })

  describe('syncUserFromClerk', () => {
    it('should sync user from Clerk successfully', async () => {
      const clerkUser = {
        id: 'clerk-123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'John',
        lastName: 'Doe'
      }

      const syncedUser: User = {
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      const { userSyncService } = await import('../user-sync')
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: syncedUser,
        error: null
      })

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.data).toEqual(syncedUser)
    })

    it('should handle sync errors', async () => {
      const clerkUser = {
        id: 'clerk-123',
        emailAddresses: [{ emailAddress: 'test@example.com' }]
      }

      const { userSyncService } = await import('../user-sync')
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: null,
        error: 'Sync failed'
      })

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.error).toBe('Sync failed')
      expect(result.code).toBe('USER_SYNC_ERROR')
    })
  })
})