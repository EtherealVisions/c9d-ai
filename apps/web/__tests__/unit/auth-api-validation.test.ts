/**
 * Unit Tests for Authentication API Validation
 * 
 * Tests the Zod validation schemas used in migrated authentication API routes.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  createUserSchema,
  updateUserSchema,
  userApiResponseSchema,
  userPreferencesSchema,
  validateCreateUser,
  validateUpdateUser,
  safeValidateCreateUser,
  safeValidateUpdateUser
} from '@/lib/validation/schemas/users'

describe('Authentication API Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate correct user creation data', () => {
      const validData = {
        email: 'test@example.com',
        clerkUserId: 'user_123abc',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {
          theme: 'dark',
          notifications: { email: true }
        }
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.clerkUserId).toBe('user_123abc')
        expect(result.data.firstName).toBe('John')
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        clerkUserId: 'user_123abc',
        firstName: 'John',
        lastName: 'Doe'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['email'])
        expect(result.error.errors[0].message).toContain('Invalid email format')
      }
    })

    it('should reject invalid Clerk user ID format', () => {
      const invalidData = {
        email: 'test@example.com',
        clerkUserId: 'invalid_format',
        firstName: 'John',
        lastName: 'Doe'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['clerkUserId'])
        expect(result.error.errors[0].message).toContain('Invalid Clerk user ID format')
      }
    })

    it('should reject names with invalid characters', () => {
      const invalidData = {
        email: 'test@example.com',
        clerkUserId: 'user_123abc',
        firstName: 'John123',
        lastName: 'Doe!'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid avatar URL', () => {
      const invalidData = {
        email: 'test@example.com',
        clerkUserId: 'user_123abc',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'not-a-url'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['avatarUrl'])
        expect(result.error.errors[0].message).toContain('Invalid avatar URL format')
      }
    })

    it('should validate preferences structure', () => {
      const invalidData = {
        email: 'test@example.com',
        clerkUserId: 'user_123abc',
        preferences: {
          invalidKey: 'value'
        }
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const prefError = result.error.errors.find(e => e.message.includes('Invalid preference keys'))
        expect(prefError).toBeDefined()
      }
    })
  })

  describe('updateUserSchema', () => {
    it('should validate partial user update data', () => {
      const validData = {
        firstName: 'Jane',
        preferences: {
          theme: 'light'
        }
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.firstName).toBe('Jane')
        expect(result.data.lastName).toBeUndefined()
      }
    })

    it('should allow empty updates', () => {
      const result = updateUserSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid partial data', () => {
      const invalidData = {
        firstName: '', // Empty string not allowed
        avatarUrl: 'not-a-url'
      }

      const result = updateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('userApiResponseSchema', () => {
    it('should validate complete API response data', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerkUserId: 'user_123abc',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        fullName: 'John Doe',
        membershipCount: 2,
        isActive: true
      }

      const result = userApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.fullName).toBe('John Doe')
        expect(result.data.membershipCount).toBe(2)
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should handle null fullName', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerkUserId: 'user_123abc',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        fullName: null,
        membershipCount: 0,
        isActive: true
      }

      const result = userApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.fullName).toBeNull()
        expect(result.data.membershipCount).toBe(0)
      }
    })
  })

  describe('userPreferencesSchema', () => {
    it('should validate complete preferences', () => {
      const validPreferences = {
        theme: 'dark' as const,
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
          fontSize: 'large' as const
        },
        privacy: {
          profileVisibility: 'organization' as const,
          activityTracking: true,
          dataSharing: false
        }
      }

      const result = userPreferencesSchema.safeParse(validPreferences)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.theme).toBe('dark')
        expect(result.data.notifications.email).toBe(true)
        expect(result.data.accessibility.fontSize).toBe('large')
      }
    })

    it('should apply default values', () => {
      const result = userPreferencesSchema.safeParse({})
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.theme).toBe('system')
        expect(result.data.language).toBe('en')
        expect(result.data.notifications.email).toBe(true)
        expect(result.data.accessibility.fontSize).toBe('medium')
      }
    })

    it('should reject invalid theme values', () => {
      const invalidPreferences = {
        theme: 'invalid-theme'
      }

      const result = userPreferencesSchema.safeParse(invalidPreferences)
      expect(result.success).toBe(false)
    })

    it('should reject invalid language codes', () => {
      const invalidPreferences = {
        language: 'x' // Too short
      }

      const result = userPreferencesSchema.safeParse(invalidPreferences)
      expect(result.success).toBe(false)
    })
  })

  describe('Validation Helper Functions', () => {
    describe('validateCreateUser', () => {
      it('should validate and return parsed data', () => {
        const validData = {
          email: 'test@example.com',
          clerkUserId: 'user_123abc'
        }

        const result = validateCreateUser(validData)
        expect(result.email).toBe('test@example.com')
        expect(result.clerkUserId).toBe('user_123abc')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          email: 'invalid-email'
        }

        expect(() => validateCreateUser(invalidData)).toThrow()
      })
    })

    describe('validateUpdateUser', () => {
      it('should validate partial update data', () => {
        const validData = {
          firstName: 'Jane'
        }

        const result = validateUpdateUser(validData)
        expect(result.firstName).toBe('Jane')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          firstName: ''
        }

        expect(() => validateUpdateUser(invalidData)).toThrow()
      })
    })

    describe('Safe validation functions', () => {
      it('should return success result for valid data', () => {
        const validData = {
          email: 'test@example.com',
          clerkUserId: 'user_123abc'
        }

        const result = safeValidateCreateUser(validData)
        expect(result.success).toBe(true)
        
        if (result.success) {
          expect(result.data.email).toBe('test@example.com')
        }
      })

      it('should return error result for invalid data', () => {
        const invalidData = {
          email: 'invalid-email'
        }

        const result = safeValidateCreateUser(invalidData)
        expect(result.success).toBe(false)
        
        if (!result.success) {
          expect(result.error.errors.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle nested preference validation', () => {
      const complexPreferences = {
        theme: 'dark' as const,
        notifications: {
          email: true,
          push: false,
          inApp: true,
          marketing: false
        },
        accessibility: {
          highContrast: true,
          reducedMotion: false,
          screenReader: true,
          fontSize: 'large' as const
        },
        privacy: {
          profileVisibility: 'private' as const,
          activityTracking: false,
          dataSharing: false
        }
      }

      const result = userPreferencesSchema.safeParse(complexPreferences)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.notifications.marketing).toBe(false)
        expect(result.data.accessibility.screenReader).toBe(true)
        expect(result.data.privacy.profileVisibility).toBe('private')
      }
    })

    it('should validate user data with all optional fields', () => {
      const completeUserData = {
        email: 'complete@example.com',
        clerkUserId: 'user_complete123',
        firstName: 'Complete',
        lastName: 'User',
        avatarUrl: 'https://example.com/complete-avatar.jpg',
        preferences: {
          theme: 'light',
          language: 'en-US',
          notifications: {
            email: false,
            push: true,
            inApp: false,
            marketing: true
          }
        }
      }

      const result = createUserSchema.safeParse(completeUserData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.preferences.theme).toBe('light')
        expect(result.data.preferences.language).toBe('en-US')
      }
    })

    it('should handle edge cases in string validation', () => {
      const edgeCaseData = {
        email: 'test+tag@example-domain.co.uk',
        clerkUserId: 'user_1234567890abcdef',
        firstName: "O'Connor",
        lastName: 'Van Der Berg-Smith',
        avatarUrl: 'https://cdn.example.com/path/to/avatar.jpg?v=123&size=large'
      }

      const result = createUserSchema.safeParse(edgeCaseData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.firstName).toBe("O'Connor")
        expect(result.data.lastName).toBe('Van Der Berg-Smith')
      }
    })
  })

  describe('Error Message Quality', () => {
    it('should provide clear error messages for validation failures', () => {
      const invalidData = {
        email: 'not-an-email',
        clerkUserId: 'invalid',
        firstName: '',
        lastName: 'Doe123',
        avatarUrl: 'not-a-url'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors
        
        // Check that we get specific error messages
        const emailError = errors.find(e => e.path.includes('email'))
        expect(emailError?.message).toContain('Invalid email format')
        
        const clerkIdError = errors.find(e => e.path.includes('clerkUserId'))
        expect(clerkIdError?.message).toContain('Invalid Clerk user ID format')
        
        const firstNameError = errors.find(e => e.path.includes('firstName'))
        expect(firstNameError?.message).toContain('First name is required')
      }
    })

    it('should provide context for preference validation errors', () => {
      const invalidPreferences = {
        theme: 'invalid',
        language: 'x',
        notifications: {
          email: 'not-boolean'
        }
      }

      const result = userPreferencesSchema.safeParse(invalidPreferences)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors
        expect(errors.length).toBeGreaterThan(0)
        
        // Each error should have a clear path and message
        errors.forEach(error => {
          expect(error.path).toBeDefined()
          expect(error.message).toBeDefined()
          expect(error.message.length).toBeGreaterThan(0)
        })
      }
    })
  })
})