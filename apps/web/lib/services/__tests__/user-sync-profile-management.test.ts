import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserSyncService, AuthEventType } from '../user-sync'
import type { User as ClerkUser } from '@clerk/nextjs/server'

// Mock dependencies
vi.mock('../database', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn(() => ({}))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    raw: vi.fn()
  }))
}))

vi.mock('../../models/transformers', () => ({
  transformUserRow: vi.fn((row) => ({
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    preferences: row.preferences,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }))
}))

describe('UserSyncService - Profile Management', () => {
  let userSyncService: UserSyncService
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh mock for each test
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          })),
          in: vi.fn(() => ({}))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      })),
      raw: vi.fn((sql: string) => sql)
    }
    
    userSyncService = new UserSyncService()
  })

  describe('updateUserProfile', () => {
    const mockUser = {
      id: 'user-1',
      clerkUserId: 'clerk-user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      preferences: { theme: 'dark' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }

    it('should update user profile with change tracking', async () => {
      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock successful update
      const updatedUserRow = {
        id: 'user-1',
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        avatar_url: 'https://example.com/new-avatar.jpg',
        preferences: { theme: 'dark', customField: 'value' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedUserRow,
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const profileData = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        customFields: { customField: 'value' }
      }

      const result = await userSyncService.updateUserProfile(
        'clerk-user-1',
        profileData,
        { source: 'test' }
      )

      expect(result.error).toBeUndefined()
      expect(result.user.firstName).toBe('Jane')
      expect(result.user.lastName).toBe('Smith')
      expect(result.syncMetadata?.changes).toContain('firstName')
      expect(result.syncMetadata?.changes).toContain('lastName')
      expect(result.syncMetadata?.changes).toContain('avatarUrl')
      expect(result.syncMetadata?.changes).toContain('customFields')
      expect(result.syncMetadata?.previousValues).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      })
    })

    it('should handle user not found', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await userSyncService.updateUserProfile(
        'nonexistent-user',
        { firstName: 'Test' }
      )

      expect(result.error).toBe('User not found')
      expect(result.isNew).toBe(false)
    })

    it('should handle database update errors', async () => {
      // Mock getUserByClerkId success
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock update failure
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await userSyncService.updateUserProfile(
        'clerk-user-1',
        { firstName: 'Jane' }
      )

      expect(result.error).toBe('Failed to update user profile: Update failed')
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences with validation', async () => {
      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: { theme: 'dark' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock successful update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: { 
            theme: 'light', 
            language: 'en',
            updatedAt: expect.any(String)
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        },
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const preferences = {
        theme: 'light',
        language: 'en'
      }

      const result = await userSyncService.updateUserPreferences(
        'clerk-user-1',
        preferences,
        true
      )

      expect(result.error).toBeUndefined()
      expect(result.user.preferences.theme).toBe('light')
      expect(result.user.preferences.language).toBe('en')
      expect(result.syncMetadata?.changes).toContain('preferences')
    })

    it('should validate custom fields when enabled', async () => {
      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      const preferences = {
        customFields: {
          invalidField: 'value', // This should fail validation
          phoneNumber: 'invalid-phone' // This should fail pattern validation
        }
      }

      const result = await userSyncService.updateUserPreferences(
        'clerk-user-1',
        preferences,
        true // Enable validation
      )

      expect(result.error).toContain('Custom field validation failed')
    })

    it('should skip validation when disabled', async () => {
      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock successful update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: { 
            customFields: { invalidField: 'value' },
            updatedAt: expect.any(String)
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        },
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const preferences = {
        customFields: {
          invalidField: 'value' // This should pass when validation is disabled
        }
      }

      const result = await userSyncService.updateUserPreferences(
        'clerk-user-1',
        preferences,
        false // Disable validation
      )

      expect(result.error).toBeUndefined()
      expect(result.user.preferences.customFields.invalidField).toBe('value')
    })
  })

  describe('getUserAnalytics', () => {
    it('should return user analytics with engagement data', async () => {
      const mockUser = {
        id: 'user-1',
        clerkUserId: 'clerk-user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { lastSignInAt: '2024-01-15T10:00:00Z' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }

      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          preferences: { lastSignInAt: '2024-01-15T10:00:00Z' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock audit logs query
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: [
          { action: AuthEventType.SIGN_IN, created_at: '2024-01-10T10:00:00Z' },
          { action: AuthEventType.SIGN_IN, created_at: '2024-01-15T10:00:00Z' },
          { action: AuthEventType.SESSION_CREATED, created_at: '2024-01-10T10:00:00Z' },
          { action: AuthEventType.SESSION_CREATED, created_at: '2024-01-15T10:00:00Z' },
          { action: AuthEventType.SUSPICIOUS_ACTIVITY, created_at: '2024-01-12T10:00:00Z' }
        ],
        error: null
      })

      // Mock organization memberships count
      mockSupabase.from().select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 2,
            error: null
          })
        })
      })

      const result = await userSyncService.getUserAnalytics('clerk-user-1')

      expect(result.error).toBeUndefined()
      expect(result.user).toBeDefined()
      expect(result.analytics.signInCount).toBe(2)
      expect(result.analytics.sessionCount).toBe(2)
      expect(result.analytics.securityEvents).toBe(1)
      expect(result.analytics.organizationMemberships).toBe(2)
      expect(result.analytics.lastSignInAt).toBe('2024-01-15T10:00:00Z')
      expect(result.analytics.accountAge).toBeGreaterThan(0)
    })

    it('should handle user not found', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await userSyncService.getUserAnalytics('nonexistent-user')

      expect(result.error).toBe('User not found')
      expect(result.user).toBeNull()
      expect(result.analytics.signInCount).toBe(0)
    })
  })

  describe('updateUserStatus', () => {
    it('should update user status with admin tracking', async () => {
      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: { accountStatus: 'active' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock successful update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          preferences: { 
            accountStatus: 'suspended',
            statusUpdatedAt: expect.any(String),
            statusReason: 'Policy violation',
            statusUpdatedBy: 'admin-user-1'
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        },
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await userSyncService.updateUserStatus(
        'clerk-user-1',
        'suspended',
        'Policy violation',
        'admin-user-1'
      )

      expect(result.error).toBeUndefined()
      expect(result.user.preferences.accountStatus).toBe('suspended')
      expect(result.user.preferences.statusReason).toBe('Policy violation')
      expect(result.user.preferences.statusUpdatedBy).toBe('admin-user-1')
      expect(result.syncMetadata?.changes).toContain('accountStatus')
    })

    it('should handle user not found for status update', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await userSyncService.updateUserStatus(
        'nonexistent-user',
        'suspended',
        'Test reason'
      )

      expect(result.error).toBe('User not found')
      expect(result.isNew).toBe(false)
    })
  })

  describe('validateCustomFields', () => {
    it('should validate custom fields according to rules', async () => {
      const userSyncServiceInstance = new UserSyncService()
      
      // Access private method through type assertion for testing
      const validateCustomFields = (userSyncServiceInstance as any).validateCustomFields

      // Valid custom fields
      const validFields = {
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        phoneNumber: '+1-555-123-4567',
        dateOfBirth: '1990-01-01',
        emergencyContact: {
          name: 'John Doe',
          phone: '+1-555-987-6543'
        }
      }

      const validResult = validateCustomFields(validFields)
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      // Invalid custom fields
      const invalidFields = {
        unknownField: 'value', // Unknown field
        department: 'A'.repeat(101), // Too long
        phoneNumber: 'invalid-phone', // Invalid format
        dateOfBirth: 'invalid-date', // Invalid format
        emergencyContact: {
          name: 'A'.repeat(101), // Too long
          phone: 'invalid-phone' // Invalid format
        }
      }

      const invalidResult = validateCustomFields(invalidFields)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
      expect(invalidResult.errors).toContain('Unknown custom field: unknownField')
      expect(invalidResult.errors.some((e: string) => e.includes('department'))).toBe(true)
      expect(invalidResult.errors.some((e: string) => e.includes('phoneNumber'))).toBe(true)
      expect(invalidResult.errors.some((e: string) => e.includes('dateOfBirth'))).toBe(true)
    })
  })
})