/**
 * User Service Unit Tests
 * Tests all user service methods with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/models/database')
vi.mock('@/lib/services/user-sync')

// Import after mocking
import { userService } from '@/lib/services/user-service'

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const userId = 'user-123'
      const mockUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock the database method
      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(mockUser)

      const result = await userService.getUser(userId)

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      const userId = 'nonexistent-user'

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(null)

      const result = await userService.getUser(userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle database errors', async () => {
      const userId = 'user-123'

      vi.spyOn(userService['db'], 'getUser').mockRejectedValue(new Error('Database error'))

      const result = await userService.getUser(userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Database error')
      expect(result.code).toBe('GET_USER_ERROR')
    })
  })

  describe('getUserByClerkId', () => {
    it('should return user when found by Clerk ID', async () => {
      const clerkUserId = 'clerk_123'
      const mockUser = {
        id: 'user-123',
        clerkUserId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUserByClerkId').mockResolvedValue(mockUser)

      const result = await userService.getUserByClerkId(clerkUserId)

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should return error when user not found by Clerk ID', async () => {
      const clerkUserId = 'nonexistent-clerk-id'

      vi.spyOn(userService['db'], 'getUserByClerkId').mockResolvedValue(null)

      const result = await userService.getUserByClerkId(clerkUserId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123'
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/avatar.jpg'
      }

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedUser = {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)
      vi.spyOn(userService['db'], 'updateUser').mockResolvedValue(updatedUser)
      vi.spyOn(userService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.data).toEqual(updatedUser)
      expect(result.error).toBeUndefined()
      expect(userService['db'].createAuditLog).toHaveBeenCalled()
    })

    it('should return error when user not found for update', async () => {
      const userId = 'nonexistent-user'
      const updateData = { firstName: 'Jane' }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(null)

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle validation errors', async () => {
      const userId = 'user-123'
      const invalidData = { firstName: '' } // Invalid empty name

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)

      // Mock validation error
      const ValidationError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'ValidationError'
        }
      }

      vi.spyOn(userService['db'], 'updateUser').mockRejectedValue(new ValidationError('First name is required'))

      const result = await userService.updateUserProfile(userId, invalidData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('First name is required')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const userId = 'user-123'
      const newPreferences = {
        theme: 'dark' as const,
        notifications: { email: false, push: true }
      }

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'light', language: 'en' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedUser = {
        ...existingUser,
        preferences: {
          ...existingUser.preferences,
          ...newPreferences
        },
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)
      vi.spyOn(userService['db'], 'updateUser').mockResolvedValue(updatedUser)
      vi.spyOn(userService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await userService.updateUserPreferences(userId, newPreferences)

      expect(result.data?.preferences.theme).toBe('dark')
      expect(result.data?.preferences.language).toBe('en') // Should preserve existing
      expect(result.error).toBeUndefined()
    })

    it('should merge preferences correctly', async () => {
      const userId = 'user-123'
      const existingPreferences = {
        theme: 'light',
        language: 'en',
        notifications: { email: true, push: false }
      }
      const newPreferences = {
        theme: 'dark' as const,
        notifications: { email: false } // Partial update
      }

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: existingPreferences,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const expectedMergedPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: { email: false } // Should merge with new values
      }

      const updatedUser = {
        ...existingUser,
        preferences: expectedMergedPreferences,
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)
      vi.spyOn(userService['db'], 'updateUser').mockResolvedValue(updatedUser)
      vi.spyOn(userService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await userService.updateUserPreferences(userId, newPreferences)

      expect(result.data?.preferences).toEqual(expectedMergedPreferences)
    })
  })

  describe('getUserPreferences', () => {
    it('should return user preferences with defaults', async () => {
      const userId = 'user-123'
      const userPreferences = {
        theme: 'dark',
        language: 'es'
      }

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: userPreferences,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)

      const result = await userService.getUserPreferences(userId)

      expect(result.data?.theme).toBe('dark')
      expect(result.data?.language).toBe('es')
      expect(result.data?.notifications?.email).toBe(true) // Default value
      expect(result.data?.dashboard?.defaultView).toBe('overview') // Default value
    })

    it('should return defaults when user has no preferences', async () => {
      const userId = 'user-123'

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)

      const result = await userService.getUserPreferences(userId)

      expect(result.data?.theme).toBe('system')
      expect(result.data?.language).toBe('en')
      expect(result.data?.notifications?.email).toBe(true)
      expect(result.data?.notifications?.push).toBe(true)
      expect(result.data?.notifications?.marketing).toBe(false)
    })
  })

  describe('deactivateUser', () => {
    it('should deactivate user account', async () => {
      const userId = 'user-123'

      const existingUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'light' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const deactivatedUser = {
        ...existingUser,
        preferences: {
          ...existingUser.preferences,
          accountStatus: 'deactivated',
          deactivatedAt: expect.any(String)
        },
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(existingUser)
      vi.spyOn(userService['db'], 'updateUser').mockResolvedValue(deactivatedUser)
      vi.spyOn(userService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await userService.deactivateUser(userId)

      expect(result.data?.preferences.accountStatus).toBe('deactivated')
      expect(result.data?.preferences.deactivatedAt).toBeDefined()
      expect(userService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.account.deactivated'
        })
      )
    })
  })

  describe('isUserActive', () => {
    it('should return true for active user', async () => {
      const userId = 'user-123'

      const activeUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'light' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(activeUser)

      const result = await userService.isUserActive(userId)

      expect(result.data).toBe(true)
    })

    it('should return false for deactivated user', async () => {
      const userId = 'user-123'

      const deactivatedUser = {
        id: userId,
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { 
          theme: 'light',
          accountStatus: 'deactivated'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(userService['db'], 'getUser').mockResolvedValue(deactivatedUser)

      const result = await userService.isUserActive(userId)

      expect(result.data).toBe(false)
    })
  })
})