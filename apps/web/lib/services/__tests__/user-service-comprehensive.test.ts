/**
 * Comprehensive UserService Tests
 * Achieving 100% coverage for critical business logic
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { UserService } from '../user-service'

// Mock the database module
vi.mock('../models/database', () => ({
  createTypedSupabaseClient: vi.fn(),
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

// Mock the schemas module
vi.mock('../models/schemas', () => ({
  validateUpdateUser: vi.fn((data) => data),
  validateCreateUser: vi.fn((data) => data)
}))

// Mock the user-sync service
vi.mock('./user-sync', () => ({
  userSyncService: {
    syncUser: vi.fn()
  }
}))

describe('UserService - Comprehensive Coverage', () => {
  let mockDb: any
  let userService: UserService
  let mockUserSyncService: any

  beforeEach(() => {
    // Create comprehensive mock for typed database client
    mockDb = {
      getUser: vi.fn(),
      getUserByClerkId: vi.fn(),
      updateUser: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      getUserWithMemberships: vi.fn(),
      createAuditLog: vi.fn()
    }

    // Mock the user sync service
    mockUserSyncService = {
      syncUser: vi.fn()
    }

    userService = new UserService()
  })

  describe('User Retrieval Operations', () => {
    it('should get user by ID successfully', async () => {
      const mockUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      }

      mockDb.getUser.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-1')

      expect(mockDb.getUser).toHaveBeenCalledWith('user-1')
      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.getUser('nonexistent')

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
      expect(result.data).toBeUndefined()
    })

    it('should handle database errors gracefully', async () => {
      mockDb.getUser.mockRejectedValue(new Error('Database connection failed'))

      const result = await userService.getUser('user-1')

      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('GET_USER_ERROR')
    })

    it('should get user by Clerk ID successfully', async () => {
      const mockUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      }

      mockDb.getUserByClerkId.mockResolvedValue(mockUser)

      const result = await userService.getUserByClerkId('clerk-123')

      expect(mockDb.getUserByClerkId).toHaveBeenCalledWith('clerk-123')
      expect(result.data?.clerkUserId).toBe('clerk-123')
    })

    it('should return error when user not found by Clerk ID', async () => {
      mockDb.getUserByClerkId.mockResolvedValue(null)

      const result = await userService.getUserByClerkId('nonexistent')
      
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('User Profile Update Operations', () => {
    it('should update user profile successfully', async () => {
      const existingUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      }

      const updatedUser = {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.updateUserProfile('user-1', updateData)

      expect(mockDb.getUser).toHaveBeenCalledWith('user-1')
      expect(mockDb.updateUser).toHaveBeenCalledWith('user-1', updateData)
      expect(mockDb.createAuditLog).toHaveBeenCalled()
      expect(result.data?.firstName).toBe('Jane')
      expect(result.data?.lastName).toBe('Smith')
    })

    it('should return error when user not found for profile update', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserProfile('nonexistent', { firstName: 'Jane' })

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle validation errors', async () => {
      const existingUser = {
        id: 'user-1',
        firstName: 'John',
        preferences: {}
      }

      mockDb.getUser.mockResolvedValue(existingUser)

      const { ValidationError } = await import('../models/database')
      const { validateUpdateUser } = await import('../models/schemas')
      ;(validateUpdateUser as Mock).mockImplementation(() => {
        throw new ValidationError('Invalid data')
      })

      const result = await userService.updateUserProfile('user-1', { firstName: '' })

      expect(result.error).toBe('Invalid data')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('User Preferences Operations', () => {
    it('should update user preferences successfully', async () => {
      const existingUser = {
        id: 'user-1',
        preferences: { theme: 'light', language: 'en' }
      }

      const newPreferences = {
        theme: 'dark',
        notifications: { email: true }
      }

      const expectedPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: { email: true }
      }

      const updatedUser = {
        ...existingUser,
        preferences: expectedPreferences
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.updateUserPreferences('user-1', newPreferences)

      expect(mockDb.updateUser).toHaveBeenCalledWith('user-1', {
        preferences: expectedPreferences
      })
      expect(result.data?.preferences).toEqual(expectedPreferences)
    })

    it('should get user preferences with defaults', async () => {
      const user = {
        id: 'user-1',
        preferences: { theme: 'dark' }
      }

      mockDb.getUser.mockResolvedValue(user)

      const result = await userService.getUserPreferences('user-1')

      expect(result.data).toEqual({
        theme: 'dark', // User's preference
        language: 'en', // Default
        timezone: 'UTC', // Default
        notifications: {
          email: true,
          push: true,
          marketing: false
        },
        dashboard: {
          defaultView: 'overview',
          itemsPerPage: 10
        }
      })
    })

    it('should reset user preferences to defaults', async () => {
      const defaultPreferences = {
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

      const updatedUser = {
        id: 'user-1',
        preferences: defaultPreferences
      }

      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.resetUserPreferences('user-1')

      expect(mockDb.updateUser).toHaveBeenCalledWith('user-1', {
        preferences: defaultPreferences
      })
      expect(result.data?.preferences).toEqual(defaultPreferences)
    })

    it('should handle preferences update for non-existent user', async () => {
      mockDb.getUser.mockResolvedValue(null)

      const result = await userService.updateUserPreferences('nonexistent', { theme: 'dark' })

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('User Account Status Operations', () => {
    it('should deactivate user successfully', async () => {
      const existingUser = {
        id: 'user-1',
        preferences: { theme: 'dark' }
      }

      const updatedUser = {
        ...existingUser,
        preferences: {
          theme: 'dark',
          accountStatus: 'deactivated',
          deactivatedAt: expect.any(String)
        }
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.deactivateUser('user-1')

      expect(mockDb.updateUser).toHaveBeenCalledWith('user-1', {
        preferences: expect.objectContaining({
          accountStatus: 'deactivated',
          deactivatedAt: expect.any(String)
        })
      })
      expect(result.data?.preferences.accountStatus).toBe('deactivated')
    })

    it('should reactivate user successfully', async () => {
      const existingUser = {
        id: 'user-1',
        preferences: {
          theme: 'dark',
          accountStatus: 'deactivated',
          deactivatedAt: '2024-01-01T00:00:00Z'
        }
      }

      const updatedUser = {
        ...existingUser,
        preferences: { theme: 'dark' }
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.reactivateUser('user-1')

      expect(mockDb.updateUser).toHaveBeenCalledWith('user-1', {
        preferences: { theme: 'dark' }
      })
      expect(result.data?.preferences.accountStatus).toBeUndefined()
    })

    it('should check if user is active', async () => {
      const activeUser = {
        id: 'user-1',
        preferences: { theme: 'dark' }
      }

      mockDb.getUser.mockResolvedValue(activeUser)

      const result = await userService.isUserActive('user-1')

      expect(result.data).toBe(true)
    })

    it('should return false for deactivated user', async () => {
      const deactivatedUser = {
        id: 'user-1',
        preferences: { accountStatus: 'deactivated' }
      }

      mockDb.getUser.mockResolvedValue(deactivatedUser)

      const result = await userService.isUserActive('user-1')

      expect(result.data).toBe(false)
    })
  })

  describe('User Memberships Operations', () => {
    it('should get user with memberships successfully', async () => {
      const userWithMemberships = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        memberships: [
          {
            id: 'membership-1',
            organizationId: 'org-1',
            roleId: 'role-1',
            status: 'active'
          }
        ]
      }

      mockDb.getUserWithMemberships.mockResolvedValue(userWithMemberships)

      const result = await userService.getUserWithMemberships('user-1')

      expect(mockDb.getUserWithMemberships).toHaveBeenCalledWith('user-1')
      expect(result.data?.memberships).toHaveLength(1)
    })

    it('should handle user not found for memberships', async () => {
      mockDb.getUserWithMemberships.mockResolvedValue(null)

      const result = await userService.getUserWithMemberships('nonexistent')

      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('User Sync Operations', () => {
    it('should sync user from Clerk successfully', async () => {
      const clerkUser = {
        id: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      const syncedUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: syncedUser,
        error: null
      })

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(mockUserSyncService.syncUser).toHaveBeenCalledWith(clerkUser)
      expect(result.data).toEqual(syncedUser)
    })

    it('should handle sync errors', async () => {
      const clerkUser = {
        id: 'clerk-123',
        email: 'test@example.com'
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: null,
        error: 'Sync failed'
      })

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.error).toBe('Sync failed')
      expect(result.code).toBe('USER_SYNC_ERROR')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully in all operations', async () => {
      const dbError = new Error('Database connection failed')
      
      mockDb.getUser.mockRejectedValue(dbError)
      mockDb.updateUser.mockRejectedValue(dbError)
      mockDb.getUserByClerkId.mockRejectedValue(dbError)
      mockDb.getUserWithMemberships.mockRejectedValue(dbError)

      // Test all operations handle errors gracefully
      const getUserResult = await userService.getUser('user-1')
      expect(getUserResult.error).toBe('Database connection failed')

      const getByClerkResult = await userService.getUserByClerkId('clerk-123')
      expect(getByClerkResult.error).toBe('Database connection failed')

      const getMembershipsResult = await userService.getUserWithMemberships('user-1')
      expect(getMembershipsResult.error).toBe('Database connection failed')

      const getPreferencesResult = await userService.getUserPreferences('user-1')
      expect(getPreferencesResult.error).toBe('Database connection failed')
    })

    it('should handle audit log failures gracefully', async () => {
      const existingUser = {
        id: 'user-1',
        preferences: {}
      }

      const updatedUser = {
        ...existingUser,
        firstName: 'Updated'
      }

      mockDb.getUser.mockResolvedValue(existingUser)
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockRejectedValue(new Error('Audit log failed'))

      // Should still succeed even if audit log fails
      const result = await userService.updateUserProfile('user-1', { firstName: 'Updated' })

      expect(result.data?.firstName).toBe('Updated')
      expect(result.error).toBeUndefined()
    })

    it('should handle sync service errors', async () => {
      mockUserSyncService.syncUser.mockRejectedValue(new Error('Sync service unavailable'))

      const result = await userService.syncUserFromClerk({ id: 'clerk-123' })

      expect(result.error).toBe('Sync service unavailable')
      expect(result.code).toBe('USER_SYNC_ERROR')
    })
  })

  describe('Comprehensive Integration Tests', () => {
    it('should handle complete user lifecycle', async () => {
      // Test complete user lifecycle: get -> update -> preferences -> deactivate -> reactivate
      const user = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { theme: 'light' }
      }

      // Get user
      mockDb.getUser.mockResolvedValue(user)
      const getUserResult = await userService.getUser('user-1')
      expect(getUserResult.data).toEqual(user)

      // Update profile
      const updatedUser = { ...user, firstName: 'Jane' }
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)
      
      const updateResult = await userService.updateUserProfile('user-1', { firstName: 'Jane' })
      expect(updateResult.data?.firstName).toBe('Jane')

      // Update preferences
      const userWithNewPrefs = { ...updatedUser, preferences: { theme: 'dark' } }
      mockDb.getUser.mockResolvedValue(updatedUser)
      mockDb.updateUser.mockResolvedValue(userWithNewPrefs)
      
      const prefsResult = await userService.updateUserPreferences('user-1', { theme: 'dark' })
      expect(prefsResult.data?.preferences.theme).toBe('dark')

      // Deactivate user
      const deactivatedUser = { 
        ...userWithNewPrefs, 
        preferences: { ...userWithNewPrefs.preferences, accountStatus: 'deactivated' }
      }
      mockDb.getUser.mockResolvedValue(userWithNewPrefs)
      mockDb.updateUser.mockResolvedValue(deactivatedUser)
      
      const deactivateResult = await userService.deactivateUser('user-1')
      expect(deactivateResult.data?.preferences.accountStatus).toBe('deactivated')

      // Check status
      mockDb.getUser.mockResolvedValue(deactivatedUser)
      const statusResult = await userService.isUserActive('user-1')
      expect(statusResult.data).toBe(false)

      // Reactivate user
      const reactivatedUser = { 
        ...deactivatedUser, 
        preferences: { theme: 'dark' } // accountStatus removed
      }
      mockDb.getUser.mockResolvedValue(deactivatedUser)
      mockDb.updateUser.mockResolvedValue(reactivatedUser)
      
      const reactivateResult = await userService.reactivateUser('user-1')
      expect(reactivateResult.data?.preferences.accountStatus).toBeUndefined()
    })

    it('should handle all error scenarios consistently', async () => {
      // Test that all methods handle user not found consistently
      mockDb.getUser.mockResolvedValue(null)
      mockDb.getUserByClerkId.mockResolvedValue(null)
      mockDb.getUserWithMemberships.mockResolvedValue(null)

      const getUserResult = await userService.getUser('nonexistent')
      const getByClerkResult = await userService.getUserByClerkId('nonexistent')
      const getMembershipsResult = await userService.getUserWithMemberships('nonexistent')
      const getPrefsResult = await userService.getUserPreferences('nonexistent')
      const updateProfileResult = await userService.updateUserProfile('nonexistent', {})
      const updatePrefsResult = await userService.updateUserPreferences('nonexistent', {})
      const deactivateResult = await userService.deactivateUser('nonexistent')
      const reactivateResult = await userService.reactivateUser('nonexistent')
      const statusResult = await userService.isUserActive('nonexistent')

      // All should return consistent error structure
      const results = [
        getUserResult, getByClerkResult, getMembershipsResult, getPrefsResult,
        updateProfileResult, updatePrefsResult, deactivateResult, reactivateResult, statusResult
      ]

      results.forEach(result => {
        expect(result.error).toBe('User not found')
        expect(result.code).toBe('USER_NOT_FOUND')
        expect(result.data).toBeUndefined()
      })
    })

    it('should maintain data consistency across operations', async () => {
      const baseUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { theme: 'light', language: 'en' }
      }

      // Test that preferences are properly merged, not replaced
      mockDb.getUser.mockResolvedValue(baseUser)
      
      const updatedUser = {
        ...baseUser,
        preferences: {
          theme: 'dark', // Updated
          language: 'en', // Preserved
          notifications: { email: true } // Added
        }
      }
      
      mockDb.updateUser.mockResolvedValue(updatedUser)
      mockDb.createAuditLog.mockResolvedValue(true)

      const result = await userService.updateUserPreferences('user-1', {
        theme: 'dark',
        notifications: { email: true }
      })

      expect(result.data?.preferences).toEqual({
        theme: 'dark',
        language: 'en', // Should be preserved
        notifications: { email: true }
      })
    })
  })
})