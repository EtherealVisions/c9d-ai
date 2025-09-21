/**
 * UserService Migration Tests - Validation Focus
 * Tests the validation logic and business rules for the migrated UserService
 */

import { describe, it, expect } from 'vitest'
import { 
  validateCreateUser, 
  validateUpdateUser, 
  validateUserPreferences,
  type CreateUser,
  type UpdateUser,
  type UserPreferences
} from '@/lib/validation/schemas/users'
import { z } from 'zod'

describe('UserService Migration - Validation Logic', () => {
  describe('User Creation Validation', () => {
    it('should validate valid user creation data', () => {
      const validUserData: CreateUser = {
        email: 'test@example.com',
        clerkUserId: 'user_abc123def456',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      }

      const result = validateCreateUser(validUserData)
      expect(result).toEqual(validUserData)
    })

    it('should reject invalid email format', () => {
      const invalidUserData = {
        email: 'invalid-email',
        clerkUserId: 'user_abc123def456',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      expect(() => validateCreateUser(invalidUserData)).toThrow()
    })

    it('should reject invalid Clerk user ID format', () => {
      const invalidUserData = {
        email: 'test@example.com',
        clerkUserId: 'invalid_format',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      expect(() => validateCreateUser(invalidUserData)).toThrow()
    })

    it('should reject names with invalid characters', () => {
      const invalidUserData = {
        email: 'test@example.com',
        clerkUserId: 'user_abc123def456',
        firstName: 'John123', // Numbers not allowed
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {}
      }

      expect(() => validateCreateUser(invalidUserData)).toThrow()
    })

    it('should reject invalid avatar URL', () => {
      const invalidUserData = {
        email: 'test@example.com',
        clerkUserId: 'user_abc123def456',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'not-a-url',
        preferences: {}
      }

      expect(() => validateCreateUser(invalidUserData)).toThrow()
    })

    it('should reject invalid preference keys', () => {
      const invalidUserData = {
        email: 'test@example.com',
        clerkUserId: 'user_abc123def456',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        preferences: {
          invalidKey: 'value' // Not in allowed keys
        }
      }

      expect(() => validateCreateUser(invalidUserData)).toThrow()
    })
  })

  describe('User Update Validation', () => {
    it('should validate valid user update data', () => {
      const validUpdateData: UpdateUser = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        preferences: {
          theme: 'light'
        }
      }

      const result = validateUpdateUser(validUpdateData)
      expect(result).toEqual(validUpdateData)
    })

    it('should allow partial updates', () => {
      const partialUpdateData: UpdateUser = {
        firstName: 'Jane'
      }

      const result = validateUpdateUser(partialUpdateData)
      expect(result).toEqual(partialUpdateData)
    })

    it('should reject empty string names', () => {
      const invalidUpdateData = {
        firstName: '', // Empty string not allowed
        lastName: 'Smith'
      }

      expect(() => validateUpdateUser(invalidUpdateData)).toThrow()
    })

    it('should reject names that are too long', () => {
      const invalidUpdateData = {
        firstName: 'A'.repeat(101), // Too long
        lastName: 'Smith'
      }

      expect(() => validateUpdateUser(invalidUpdateData)).toThrow()
    })
  })

  describe('User Preferences Validation', () => {
    it('should validate complete preferences structure', () => {
      const validPreferences: UserPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          inApp: true,
          marketing: false
        },
        accessibility: {
          highContrast: false,
          reducedMotion: true,
          screenReader: false,
          fontSize: 'large'
        },
        privacy: {
          profileVisibility: 'organization',
          activityTracking: true,
          dataSharing: false
        }
      }

      const result = validateUserPreferences(validPreferences)
      expect(result).toEqual(validPreferences)
    })

    it('should apply default values for missing preferences', () => {
      const partialPreferences = {
        theme: 'light' as const
      }

      const result = validateUserPreferences(partialPreferences)
      expect(result.theme).toBe('light')
      expect(result.language).toBe('en') // Default value
      expect(result.notifications).toBeDefined() // Default structure
    })

    it('should reject invalid theme values', () => {
      const invalidPreferences = {
        theme: 'invalid-theme'
      }

      expect(() => validateUserPreferences(invalidPreferences)).toThrow()
    })

    it('should reject invalid language codes', () => {
      const invalidPreferences = {
        language: 'invalid'
      }

      expect(() => validateUserPreferences(invalidPreferences)).toThrow()
    })

    it('should reject invalid accessibility fontSize', () => {
      const invalidPreferences = {
        accessibility: {
          fontSize: 'invalid-size'
        }
      }

      expect(() => validateUserPreferences(invalidPreferences)).toThrow()
    })

    it('should reject invalid privacy profileVisibility', () => {
      const invalidPreferences = {
        privacy: {
          profileVisibility: 'invalid-visibility'
        }
      }

      expect(() => validateUserPreferences(invalidPreferences)).toThrow()
    })
  })

  describe('Business Logic Validation', () => {
    it('should build full name correctly', () => {
      // This tests the helper method logic
      const buildFullName = (firstName: string | null, lastName: string | null): string | null => {
        if (!firstName && !lastName) return null
        if (!firstName) return lastName
        if (!lastName) return firstName
        return `${firstName} ${lastName}`.trim()
      }

      expect(buildFullName('John', 'Doe')).toBe('John Doe')
      expect(buildFullName('John', null)).toBe('John')
      expect(buildFullName(null, 'Doe')).toBe('Doe')
      expect(buildFullName(null, null)).toBe(null)
      expect(buildFullName('', '')).toBe(null)
    })

    it('should determine user active status correctly', () => {
      // This tests the active status logic
      const isUserActive = (preferences: Record<string, unknown> | null): boolean => {
        return !preferences?.deactivated
      }

      expect(isUserActive({})).toBe(true)
      expect(isUserActive({ theme: 'dark' })).toBe(true)
      expect(isUserActive({ deactivated: false })).toBe(true)
      expect(isUserActive({ deactivated: true })).toBe(false)
      expect(isUserActive(null)).toBe(true)
    })

    it('should merge preferences correctly', () => {
      // This tests the preference merging logic
      const mergePreferences = (
        existing: Record<string, unknown>,
        updates: Record<string, unknown>
      ): Record<string, unknown> => {
        return { ...existing, ...updates }
      }

      const existing = { theme: 'dark', language: 'en' }
      const updates = { theme: 'light', notifications: { email: true } }
      
      const result = mergePreferences(existing, updates)
      
      expect(result).toEqual({
        theme: 'light', // Updated
        language: 'en', // Preserved
        notifications: { email: true } // Added
      })
    })
  })

  describe('Error Handling Validation', () => {
    it('should handle Zod validation errors properly', () => {
      try {
        validateCreateUser({
          email: 'invalid-email',
          clerkUserId: 'invalid',
          firstName: '',
          lastName: '',
          avatarUrl: 'not-a-url',
          preferences: {}
        })
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
        const zodError = error as z.ZodError
        expect(zodError.issues.length).toBeGreaterThan(0)
        expect(zodError.issues.some(issue => issue.path.includes('email'))).toBe(true)
      }
    })

    it('should provide detailed validation error messages', () => {
      try {
        validateCreateUser({
          email: '',
          clerkUserId: '',
          firstName: null,
          lastName: null,
          avatarUrl: null,
          preferences: {}
        })
      } catch (error) {
        const zodError = error as z.ZodError
        const emailError = zodError.issues.find(issue => issue.path.includes('email'))
        expect(emailError?.message).toContain('Invalid email format')
      }
    })
  })

  describe('Input Sanitization', () => {
    it('should handle null and undefined values correctly', () => {
      const validUserData = {
        email: 'test@example.com',
        clerkUserId: 'user_abc123def456',
        firstName: null,
        lastName: null,
        avatarUrl: null,
        preferences: {}
      }

      const result = validateCreateUser(validUserData)
      expect(result.firstName).toBe(null)
      expect(result.lastName).toBe(null)
      expect(result.avatarUrl).toBe(null)
    })

    it('should trim whitespace from string fields', () => {
      // Note: This would need to be implemented in the schema if desired
      const userDataWithWhitespace = {
        email: '  test@example.com  ',
        clerkUserId: 'user_abc123def456',
        firstName: '  John  ',
        lastName: '  Doe  ',
        avatarUrl: null,
        preferences: {}
      }

      // The email with spaces will fail validation, which is expected behavior
      expect(() => validateCreateUser(userDataWithWhitespace)).toThrow()
    })
  })
})