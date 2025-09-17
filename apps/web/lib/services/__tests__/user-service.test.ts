/**
 * Unit tests for UserService
 * Tests all CRUD operations, preferences management, and error handling
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { UserService } from '../user-service'
import { createTypedSupabaseClient } from '../../models/database'
import { userSyncService } from '../user-sync'
import type { User } from '../../models/types'

// Mock the database client
vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: vi.fn(),
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public code?: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} with id ${id} not found`)
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

// Mock the user sync service
vi.mock('../user-sync', () => ({
  userSyncService: {
    syncUser: vi.fn()
  }
}))

// Mock validation functions
vi.mock('../../models/schemas', () => ({
  validateUpdateUser: vi.fn((data) => data),
  validateCreateUser: vi.fn((data) => data)
}))

describe('UserService', () => {
  let userService: UserService
  let mockDb: any

  const mockUser: User = {
    id: 'user-123',
    clerkUserId: 'clerk-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: {
      theme: 'dark',
      language: 'en'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock database client
    mockDb = {
      getUser: vi.fn(),
      getUserByClerkId: vi.fn(),
      updateUser: vi.fn(),
      getUserWithMemberships: vi.fn(),
      createAuditLog: vi.fn()
    }

    // Mock the database client factory
    ;(createTypedSupabaseClient as Mock).mockReturnValue(mockDb)

    // Create new service instance
    userService = new UserService()
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.getUser).toHaveBeenCalledWith('user-123')
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.getUser('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockDb.getUser.mockRejectedValue(dbError)

      const result = await userService.getUser('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('GET_USER_ERROR')
    })
  })

  describe('getUserByClerkId', () => {
    it('should return user when found by Clerk ID', async () => {
      mockDb.getUserByClerkId.mockResolvedValue(mockUser)

      const result = await userService.getUserByClerkId('clerk-123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.getUserByClerkId).toHaveBeenCalledWith('clerk-123')
    })

    it('should return error when user not found by Clerk ID', async () => {
      mockDb.getUserByClerkId.mockResolvedValue(null)

      const result = await userService.getUserByClerkId('clerk-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('updateUserProfile', () => {
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith',
      avatarUrl: 'https://example.com/new-avatar.jpg'
    }

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData }
      mockDb.getUser.mockResolvedValue(mockUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await userService.updateUserProfile('user-123', updateData)

      expect(result.data).toEqual(updatedUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', updateData)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'user.profile.updated',
        resourceType: 'user',
        resourceId: 'user-123',
        metadata: {
          updatedFields: ['firstName', 'lastName', 'avatarUrl'],
          previousValues: {
            firstName: 'John',
            lastName: 'Doe',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        }
      })
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserProfile('user-123', updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('updateUserPreferences', () => {
    const newPreferences = {
      theme: 'light' as const,
      notifications: {
        email: false
      }
    }

    it('should update user preferences successfully', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          ...newPreferences
        }
      }
      mockDb.getUser.mockResolvedValue(mockUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await userService.updateUserPreferences('user-123', newPreferences)

      expect(result.data).toEqual(updatedUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', {
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: {
            email: false
          }
        }
      })
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserPreferences('user-123', newPreferences)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('getUserPreferences', () => {
    it('should return user preferences with defaults', async () => {
      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.getUserPreferences('user-123')

      expect(result.data).toEqual({
        theme: 'dark', // From user preferences
        language: 'en', // From user preferences
        timezone: 'UTC', // Default
        notifications: {
          email: true,
          push: true,
          marketing: false
        }, // Default
        dashboard: {
          defaultView: 'overview',
          itemsPerPage: 10
        } // Default
      })
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.getUserPreferences('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('resetUserPreferences', () => {
    it('should reset user preferences to defaults', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            marketing: false
          },
          dashboard: {
            defaultView: 'overview',
            itemsPerPage: 10
          }
        }
      }
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await userService.resetUserPreferences('user-123')

      expect(result.data).toEqual(updatedUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'user.preferences.reset',
        resourceType: 'user',
        resourceId: 'user-123',
        metadata: {
          resetToDefaults: true
        }
      })
    })
  })

  describe('getUserWithMemberships', () => {
    const userWithMemberships = {
      ...mockUser,
      memberships: [
        {
          id: 'membership-123',
          userId: 'user-123',
          organizationId: 'org-123',
          roleId: 'role-123',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            id: 'org-123',
            name: 'Test Org',
            slug: 'test-org'
          },
          role: {
            id: 'role-123',
            name: 'Member'
          }
        }
      ]
    }

    it('should return user with memberships', async () => {
      mockDb.getUserWithMemberships.mockResolvedValue(userWithMemberships)

      const result = await userService.getUserWithMemberships('user-123')

      expect(result.data).toEqual(userWithMemberships)
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      mockDb.getUserWithMemberships.mockResolvedValue(null)

      const result = await userService.getUserWithMemberships('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('syncUserFromClerk', () => {
    const clerkUser = {
      id: 'clerk-123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/avatar.jpg'
    }

    it('should sync user from Clerk successfully', async () => {
      const syncResult = {
        user: mockUser,
        isNew: false,
        error: undefined
      }
      ;(userSyncService.syncUser as Mock).mockResolvedValue(syncResult)

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
      expect(userSyncService.syncUser).toHaveBeenCalledWith(clerkUser)
    })

    it('should return error when sync fails', async () => {
      const syncResult = {
        user: {} as User,
        isNew: false,
        error: 'Sync failed'
      }
      ;(userSyncService.syncUser as Mock).mockResolvedValue(syncResult)

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Sync failed')
      expect(result.code).toBe('USER_SYNC_ERROR')
    })
  })

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          accountStatus: 'deactivated',
          deactivatedAt: expect.any(String)
        }
      }
      mockDb.getUser.mockResolvedValue(mockUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await userService.deactivateUser('user-123')

      expect(result.data).toEqual(updatedUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'user.account.deactivated',
        resourceType: 'user',
        resourceId: 'user-123',
        metadata: {
          deactivatedAt: expect.any(String)
        }
      })
    })
  })

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      const deactivatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          accountStatus: 'deactivated',
          deactivatedAt: '2024-01-01T00:00:00.000Z'
        }
      }
      const reactivatedUser = {
        ...mockUser,
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      }
      mockDb.getUser.mockResolvedValue(deactivatedUser)
      mockDb.updateUser.mockResolvedValue(reactivatedUser)
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await userService.reactivateUser('user-123')

      expect(result.data).toEqual(reactivatedUser)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-123', {
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      })
    })
  })

  describe('isUserActive', () => {
    it('should return true for active user', async () => {
      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.isUserActive('user-123')

      expect(result.data).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return false for deactivated user', async () => {
      const deactivatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          accountStatus: 'deactivated'
        }
      }
      mockDb.getUser.mockResolvedValue(deactivatedUser)

      const result = await userService.isUserActive('user-123')

      expect(result.data).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.isUserActive('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })
})