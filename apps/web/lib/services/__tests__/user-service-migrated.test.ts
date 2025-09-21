/**
 * UserService Integration Tests
 * Tests for the migrated UserService using real Drizzle repositories and database
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { UserService } from '../user-service'
import { getDatabase } from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { CreateUser } from '@/lib/validation/schemas/users'

describe('UserService Integration Tests', () => {
  let userService: UserService
  let db: ReturnType<typeof getDatabase>
  let testUserId: string | null = null

  beforeAll(async () => {
    // Get database connection
    db = getDatabase()
  })

  beforeEach(() => {
    userService = new UserService()
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      try {
        await db.delete(users).where(eq(users.id, testUserId))
      } catch (error) {
        console.warn('Failed to cleanup test user:', error)
      }
      testUserId = null
    }
  })

  afterAll(async () => {
    // Clean up any remaining test data
    try {
      await db.delete(users).where(eq(users.email, 'test@example.com'))
      await db.delete(users).where(eq(users.email, 'updated@example.com'))
    } catch (error) {
      console.warn('Failed to cleanup test data:', error)
    }
  })

  describe('createUser', () => {
    it('should create user with validation and audit logging', async () => {
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const result = await userService.createUser(userData)

      expect(result.data).toBeDefined()
      expect(result.data?.email).toBe('test@example.com')
      expect(result.data?.fullName).toBe('John Doe')
      expect(result.data?.isActive).toBe(true)
      expect(result.error).toBeUndefined()

      // Store for cleanup
      testUserId = result.data?.id || null

      // Verify user was actually created in database
      if (testUserId) {
        const dbUser = await db.select().from(users).where(eq(users.id, testUserId))
        expect(dbUser).toHaveLength(1)
        expect(dbUser[0].email).toBe('test@example.com')
      }
    })

    it('should reject invalid user data', async () => {
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        clerkUserId: 'invalid', // Invalid Clerk ID format
        firstName: '', // Empty first name
        lastName: 'Doe'
      }

      const result = await userService.createUser(invalidData as any)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should prevent duplicate email creation', async () => {
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      // Create first user
      const firstResult = await userService.createUser(userData)
      expect(firstResult.data).toBeDefined()
      testUserId = firstResult.data?.id || null

      // Try to create duplicate
      const duplicateData: CreateUser = {
        ...userData,
        clerkUserId: 'clerk_test_456' // Different Clerk ID but same email
      }

      const secondResult = await userService.createUser(duplicateData)
      expect(secondResult.error).toBeDefined()
      expect(secondResult.data).toBeUndefined()
    })
  })

  describe('getUser', () => {
    it('should get user successfully with validation', async () => {
      // First create a user
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Now get the user
      const result = await userService.getUser(testUserId!)

      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe(testUserId)
      expect(result.data?.fullName).toBe('John Doe')
      expect(result.data?.isActive).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error for invalid user ID', async () => {
      const result = await userService.getUser('')

      expect(result.error).toBe('Valid user ID is required')
      expect(result.data).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      const result = await userService.getUser('non-existent-id')

      expect(result.error).toBe('User not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getUserByClerkId', () => {
    it('should get user by Clerk ID successfully', async () => {
      // First create a user
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Now get by Clerk ID
      const result = await userService.getUserByClerkId('clerk_test_123')

      expect(result.data).toBeDefined()
      expect(result.data?.clerkUserId).toBe('clerk_test_123')
      expect(result.data?.email).toBe('test@example.com')
      expect(result.error).toBeUndefined()
    })

    it('should return error for invalid Clerk ID', async () => {
      const result = await userService.getUserByClerkId('')

      expect(result.error).toBe('Valid Clerk user ID is required')
      expect(result.data).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      const result = await userService.getUserByClerkId('clerk_non_existent')

      expect(result.error).toBe('User not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile with validation', async () => {
      // First create a user
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Update the user
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      }

      const result = await userService.updateUserProfile(testUserId!, updateData)

      expect(result.data).toBeDefined()
      expect(result.data?.firstName).toBe('Jane')
      expect(result.data?.lastName).toBe('Smith')
      expect(result.data?.fullName).toBe('Jane Smith')
      expect(result.data?.avatarUrl).toBe('https://example.com/new-avatar.jpg')
      expect(result.error).toBeUndefined()

      // Verify changes in database
      const dbUser = await db.select().from(users).where(eq(users.id, testUserId!))
      expect(dbUser[0].firstName).toBe('Jane')
      expect(dbUser[0].lastName).toBe('Smith')
    })

    it('should return error for invalid update data', async () => {
      const invalidData = {
        firstName: '', // Invalid - empty string
        avatarUrl: 'not-a-url' // Invalid URL
      }

      const result = await userService.updateUserProfile('some-id', invalidData)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return error when user not found', async () => {
      const updateData = {
        firstName: 'Jane'
      }

      const result = await userService.updateUserProfile('non-existent-id', updateData)

      expect(result.error).toBe('User not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences with validation', async () => {
      // First create a user
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Update preferences
      const preferences = {
        theme: 'light' as const,
        notifications: {
          email: false,
          push: true,
          inApp: true,
          marketing: false
        }
      }

      const result = await userService.updateUserPreferences(testUserId!, preferences)

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify preferences were updated in database
      const dbUser = await db.select().from(users).where(eq(users.id, testUserId!))
      const userPrefs = dbUser[0].preferences as any
      expect(userPrefs.theme).toBe('light')
      expect(userPrefs.notifications.email).toBe(false)
    })

    it('should reject invalid preferences', async () => {
      const invalidPreferences = {
        theme: 'invalid-theme', // Invalid theme value
        language: 'invalid-lang-code' // Invalid language code
      }

      const result = await userService.updateUserPreferences('some-id', invalidPreferences as any)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('getUserPreferences', () => {
    it('should get user preferences with defaults', async () => {
      // First create a user with custom preferences
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: { theme: 'dark' }
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Get preferences
      const result = await userService.getUserPreferences(testUserId!)

      expect(result.data).toBeDefined()
      expect(result.data?.theme).toBe('dark')
      expect(result.data?.language).toBe('en') // Default value
      expect(result.data?.notifications).toBeDefined() // Default structure
      expect(result.error).toBeUndefined()
    })

    it('should return error for invalid user ID', async () => {
      const result = await userService.getUserPreferences('')

      expect(result.error).toBe('Valid user ID is required')
      expect(result.data).toBeUndefined()
    })
  })

  describe('deactivateUser and reactivateUser', () => {
    it('should deactivate and reactivate user', async () => {
      // First create a user
      const userData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'clerk_test_123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      const createResult = await userService.createUser(userData)
      expect(createResult.data).toBeDefined()
      testUserId = createResult.data?.id || null

      // Deactivate user
      const deactivateResult = await userService.deactivateUser(testUserId!)
      expect(deactivateResult.data).toBeDefined()
      expect(deactivateResult.data?.isActive).toBe(false)
      expect(deactivateResult.error).toBeUndefined()

      // Check user is inactive
      const statusResult = await userService.isUserActive(testUserId!)
      expect(statusResult.data).toBe(false)

      // Reactivate user
      const reactivateResult = await userService.reactivateUser(testUserId!)
      expect(reactivateResult.data).toBeDefined()
      expect(reactivateResult.data?.isActive).toBe(true)
      expect(reactivateResult.error).toBeUndefined()

      // Check user is active again
      const finalStatusResult = await userService.isUserActive(testUserId!)
      expect(finalStatusResult.data).toBe(true)
    })
  })

  describe('validation and error handling', () => {
    it('should handle validation errors properly', async () => {
      const invalidData = {
        email: 'invalid-email',
        clerkUserId: 'invalid-format',
        firstName: '',
        lastName: 'Doe'
      }

      const result = await userService.createUser(invalidData as any)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should handle non-existent user operations gracefully', async () => {
      const nonExistentId = 'non-existent-user-id'

      const getResult = await userService.getUser(nonExistentId)
      expect(getResult.error).toBe('User not found')

      const updateResult = await userService.updateUserProfile(nonExistentId, { firstName: 'Test' })
      expect(updateResult.error).toBe('User not found')

      const prefsResult = await userService.getUserPreferences(nonExistentId)
      expect(prefsResult.error).toBe('User not found')
    })
  })
})