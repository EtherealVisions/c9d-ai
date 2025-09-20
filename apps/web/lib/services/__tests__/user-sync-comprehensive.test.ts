import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserSyncService, userSyncService, AuthEventType } from '../user-sync'
import { transformUserRow } from '../../models/transformers'
import type { User } from '../../models/types'

// Mock dependencies
vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn()
          }))
        })),
        count: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    raw: vi.fn()
  })
}))

vi.mock('../../models/transformers', () => ({
  transformUserRow: vi.fn()
}))

describe('UserSyncService - Comprehensive Coverage', () => {
  let service: UserSyncService
  let mockSupabase: any
  let mockClerkUser: any
  let mockUserResource: any
  let mockUserRow: any
  let mockUser: User

  beforeEach(() => {
    vi.clearAllMocks()
    
    service = new UserSyncService()
    
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          })),
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
          })),
          count: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null })
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      })),
      raw: vi.fn()
    }

    // Replace the service's supabase instance
    ;(service as any).supabase = mockSupabase

    // Mock Clerk user objects
    mockClerkUser = {
      id: 'clerk-user-123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      externalAccounts: []
    }

    mockUserResource = {
      id: 'clerk-user-123',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      externalAccounts: []
    }

    mockUserRow = {
      id: 'user-123',
      clerk_user_id: 'clerk-user-123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://example.com/avatar.jpg',
      preferences: {
        onboardingCompleted: false,
        theme: 'system'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    mockUser = {
      id: 'user-123',
      clerkUserId: 'clerk-user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      emailVerified: true,
      lastSignInAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        onboardingCompleted: false,
        theme: 'system'
      }
    }

    vi.mocked(transformUserRow).mockReturnValue(mockUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('syncUser', () => {
    it('should create new user when user does not exist', async () => {
      // Mock user not found
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' } // Not found error
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.isNew).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should update existing user when user exists', async () => {
      // Mock existing user found
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: mockUserRow, 
              error: null 
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ 
              data: mockUserRow, 
              error: null 
            })
          }))
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.isNew).toBe(false)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should handle UserResource type (Clerk client-side)', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      const result = await service.syncUser(mockUserResource)

      expect(result.isNew).toBe(true)
      expect(result.user).toEqual(mockUser)
    })

    it('should handle missing email addresses gracefully', async () => {
      const clerkUserWithoutEmail = {
        ...mockClerkUser,
        emailAddresses: []
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: { ...mockUserRow, email: '' }, 
            error: null 
          })
        }))
      })

      const result = await service.syncUser(clerkUserWithoutEmail)

      expect(result.isNew).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should preserve existing preferences when updating', async () => {
      const existingUserWithPreferences = {
        ...mockUserRow,
        preferences: {
          onboardingCompleted: true,
          theme: 'dark',
          customSettings: { setting1: 'value1' }
        }
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: existingUserWithPreferences, 
              error: null 
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ 
              data: existingUserWithPreferences, 
              error: null 
            })
          }))
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.isNew).toBe(false)
      // Should preserve existing preferences
      expect(result.user.preferences?.onboardingCompleted).toBe(true)
      expect(result.user.preferences?.theme).toBe('dark')
    })

    it('should handle database fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database connection failed' }
            })
          }))
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.error).toBe('Failed to fetch user: Database connection failed')
      expect(result.isNew).toBe(false)
    })

    it('should handle database insert errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Insert failed' }
          })
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.error).toBe('Failed to create user: Insert failed')
    })

    it('should handle database update errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: mockUserRow, 
              error: null 
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Update failed' }
            })
          }))
        }))
      })

      const result = await service.syncUser(mockClerkUser)

      expect(result.error).toBe('Failed to update user: Update failed')
    })

    it('should log auth events for user creation and updates', async () => {
      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      // Test user creation
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      await service.syncUser(mockClerkUser, { source: 'webhook' })

      expect(logSpy).toHaveBeenCalledWith(
        mockUserRow.id,
        AuthEventType.USER_CREATED,
        expect.objectContaining({
          source: 'webhook',
          clerkUserId: mockClerkUser.id,
          email: mockClerkUser.emailAddresses[0].emailAddress,
          signUpMethod: 'email'
        })
      )
    })

    it('should detect social sign-up method', async () => {
      const socialClerkUser = {
        ...mockClerkUser,
        externalAccounts: [{ provider: 'google' }]
      }

      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      await service.syncUser(socialClerkUser)

      expect(logSpy).toHaveBeenCalledWith(
        mockUserRow.id,
        AuthEventType.USER_CREATED,
        expect.objectContaining({
          signUpMethod: 'social'
        })
      )
    })
  })

  describe('getUserByClerkId', () => {
    it('should return user when found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: mockUserRow, 
              error: null 
            })
          }))
        }))
      })

      const result = await service.getUserByClerkId('clerk-user-123')

      expect(result).toEqual(mockUser)
      expect(transformUserRow).toHaveBeenCalledWith(mockUserRow)
    })

    it('should return null when user not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        }))
      })

      const result = await service.getUserByClerkId('nonexistent-user')

      expect(result).toBeNull()
    })

    it('should return null on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' }
            })
          }))
        }))
      })

      const result = await service.getUserByClerkId('clerk-user-123')

      expect(result).toBeNull()
    })
  })

  describe('getUserWithMemberships', () => {
    it('should return user with organization memberships', async () => {
      const userWithMemberships = {
        ...mockUserRow,
        organization_memberships: [
          {
            id: 'membership-1',
            organization: { id: 'org-1', name: 'Test Org' },
            role: { id: 'role-1', name: 'admin' }
          }
        ]
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: userWithMemberships, 
              error: null 
            })
          }))
        }))
      })

      const result = await service.getUserWithMemberships('clerk-user-123')

      expect(result).toEqual(userWithMemberships)
    })

    it('should return null on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' }
            })
          }))
        }))
      })

      const result = await service.getUserWithMemberships('clerk-user-123')

      expect(result).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Mock getUserByClerkId to return user
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      })

      const result = await service.deleteUser('clerk-user-123')

      expect(result).toBe(true)
    })

    it('should return false when user not found', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(null)

      const result = await service.deleteUser('nonexistent-user')

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
        }))
      })

      const result = await service.deleteUser('clerk-user-123')

      expect(result).toBe(false)
    })
  })

  describe('logAuthEvent', () => {
    it('should log authentication event to audit logs', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ data: [], error: null })
      mockSupabase.from.mockReturnValue({
        insert: insertSpy
      })

      await service.logAuthEvent(
        'user-123',
        AuthEventType.SIGN_IN,
        { sessionId: 'session-123' },
        '192.168.1.1',
        'Mozilla/5.0...'
      )

      expect(insertSpy).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: AuthEventType.SIGN_IN,
        resource_type: 'authentication',
        resource_id: 'user-123',
        metadata: expect.objectContaining({
          sessionId: 'session-123',
          eventType: AuthEventType.SIGN_IN,
          timestamp: expect.any(String)
        }),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      })
    })

    it('should not throw error when logging fails', async () => {
      const insertSpy = vi.fn().mockRejectedValue(new Error('Database error'))
      mockSupabase.from.mockReturnValue({
        insert: insertSpy
      })

      // Should not throw
      await expect(service.logAuthEvent('user-123', AuthEventType.SIGN_IN))
        .resolves.not.toThrow()
    })
  })

  describe('handleSessionCreated', () => {
    it('should handle session created event', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)
      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      await service.handleSessionCreated('clerk-user-123', 'session-123', { device: 'mobile' })

      expect(logSpy).toHaveBeenCalledWith(
        mockUser.id,
        AuthEventType.SESSION_CREATED,
        expect.objectContaining({
          device: 'mobile',
          sessionId: 'session-123',
          clerkUserId: 'clerk-user-123'
        })
      )
    })

    it('should handle user not found gracefully', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(null)
      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      await expect(service.handleSessionCreated('nonexistent-user', 'session-123'))
        .resolves.not.toThrow()

      expect(logSpy).not.toHaveBeenCalled()
    })
  })

  describe('handleSessionEnded', () => {
    it('should handle session ended event', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)
      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      await service.handleSessionEnded('clerk-user-123', 'session-123', { reason: 'logout' })

      expect(logSpy).toHaveBeenCalledWith(
        mockUser.id,
        AuthEventType.SESSION_ENDED,
        expect.objectContaining({
          reason: 'logout',
          sessionId: 'session-123',
          clerkUserId: 'clerk-user-123'
        })
      )
    })
  })

  describe('updateLastSignIn', () => {
    it('should update last sign-in timestamp', async () => {
      const updateSpy = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      await service.updateLastSignIn('clerk-user-123', { device: 'desktop' })

      expect(updateSpy).toHaveBeenCalledWith({
        preferences: expect.any(Object)
      })
    })

    it('should handle update errors gracefully', async () => {
      const updateSpy = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      // Should not throw
      await expect(service.updateLastSignIn('clerk-user-123'))
        .resolves.not.toThrow()
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile with change tracking', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: { ...mockUserRow, first_name: 'Jane' }, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      const result = await service.updateUserProfile('clerk-user-123', {
        firstName: 'Jane',
        customFields: { department: 'Engineering' }
      })

      expect(result.isNew).toBe(false)
      expect(result.syncMetadata?.changes).toContain('firstName')
      expect(result.syncMetadata?.changes).toContain('customFields')
      expect(result.syncMetadata?.previousValues?.firstName).toBe('John')
      expect(logSpy).toHaveBeenCalled()
    })

    it('should handle user not found', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(null)

      const result = await service.updateUserProfile('nonexistent-user', {
        firstName: 'Jane'
      })

      expect(result.error).toBe('User not found')
    })

    it('should handle deep merge of preferences', async () => {
      const userWithPreferences = {
        ...mockUser,
        preferences: {
          theme: 'dark',
          notifications: { email: true, push: false }
        }
      }

      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(userWithPreferences)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      await service.updateUserProfile('clerk-user-123', {
        preferences: {
          notifications: { email: false, sms: true }
        }
      })

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            theme: 'dark', // Preserved
            notifications: { email: false, sms: true } // Merged
          })
        })
      )
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences with validation', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      const result = await service.updateUserPreferences('clerk-user-123', {
        theme: 'dark',
        customFields: {
          department: 'Engineering',
          jobTitle: 'Senior Developer'
        }
      })

      expect(result.isNew).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('should validate custom fields when enabled', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const result = await service.updateUserPreferences('clerk-user-123', {
        customFields: {
          department: 'A'.repeat(101), // Too long
          invalidField: 'value'
        }
      }, true)

      expect(result.error).toContain('Custom field validation failed')
    })

    it('should skip validation when disabled', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      const result = await service.updateUserPreferences('clerk-user-123', {
        customFields: {
          invalidField: 'value'
        }
      }, false)

      expect(result.error).toBeUndefined()
    })
  })

  describe('getUserAnalytics', () => {
    it('should return user analytics', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      // Mock audit logs query
      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({
            data: [
              { action: AuthEventType.SIGN_IN, created_at: new Date().toISOString() },
              { action: AuthEventType.SESSION_CREATED, created_at: new Date().toISOString() }
            ],
            error: null
          })
        }))
      }))

      // Mock membership count query
      const countSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 2, error: null })
        }))
      }))

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { select: selectSpy }
        } else if (table === 'organization_memberships') {
          return { select: countSpy }
        }
        return { select: vi.fn() }
      })

      const result = await service.getUserAnalytics('clerk-user-123')

      expect(result.user).toEqual(mockUser)
      expect(result.analytics.signInCount).toBe(1)
      expect(result.analytics.sessionCount).toBe(1)
      expect(result.analytics.organizationMemberships).toBe(2)
      expect(result.analytics.accountAge).toBeGreaterThanOrEqual(0)
    })

    it('should handle user not found', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(null)

      const result = await service.getUserAnalytics('nonexistent-user')

      expect(result.user).toBeNull()
      expect(result.error).toBe('User not found')
      expect(result.analytics.signInCount).toBe(0)
    })
  })

  describe('updateUserStatus', () => {
    it('should update user account status', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      const logSpy = vi.spyOn(service, 'logAuthEvent').mockResolvedValue()

      const result = await service.updateUserStatus(
        'clerk-user-123',
        'suspended',
        'Violation of terms',
        'admin-user-123'
      )

      expect(result.isNew).toBe(false)
      expect(result.error).toBeUndefined()
      expect(logSpy).toHaveBeenCalledWith(
        mockUser.id,
        AuthEventType.USER_UPDATED,
        expect.objectContaining({
          action: 'status_updated',
          newStatus: 'suspended',
          reason: 'Violation of terms',
          adminUserId: 'admin-user-123'
        })
      )
    })

    it('should handle different status values', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockResolvedValue(mockUser)

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      }))
      mockSupabase.from.mockReturnValue({
        update: updateSpy
      })

      const statuses = ['active', 'suspended', 'deactivated'] as const

      for (const status of statuses) {
        const result = await service.updateUserStatus('clerk-user-123', status)
        expect(result.error).toBeUndefined()
      }
    })
  })

  describe('validateCustomFields', () => {
    it('should validate valid custom fields', () => {
      const validFields = {
        department: 'Engineering',
        jobTitle: 'Senior Developer',
        phoneNumber: '+1-555-123-4567',
        dateOfBirth: '1990-01-01',
        emergencyContact: {
          name: 'John Doe',
          phone: '+1-555-987-6543'
        }
      }

      const result = (service as any).validateCustomFields(validFields)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject unknown fields', () => {
      const invalidFields = {
        unknownField: 'value'
      }

      const result = (service as any).validateCustomFields(invalidFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unknown custom field: unknownField')
    })

    it('should validate string length limits', () => {
      const invalidFields = {
        department: 'A'.repeat(101) // Too long
      }

      const result = (service as any).validateCustomFields(invalidFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Field department exceeds maximum length of 100')
    })

    it('should validate string patterns', () => {
      const invalidFields = {
        phoneNumber: 'not-a-phone-number',
        dateOfBirth: 'not-a-date'
      }

      const result = (service as any).validateCustomFields(invalidFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Field phoneNumber has invalid format')
      expect(result.errors).toContain('Field dateOfBirth has invalid format')
    })

    it('should validate object properties', () => {
      const invalidFields = {
        emergencyContact: {
          name: 'A'.repeat(101), // Too long
          phone: 'invalid-phone'
        }
      }

      const result = (service as any).validateCustomFields(invalidFields)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Property emergencyContact.name exceeds maximum length')
      expect(result.errors).toContain('Property emergencyContact.phone has invalid format')
    })

    it('should handle null and undefined values', () => {
      const fieldsWithNulls = {
        department: null,
        jobTitle: undefined
      }

      const result = (service as any).validateCustomFields(fieldsWithNulls)

      expect(result.isValid).toBe(true) // Optional fields can be null/undefined
    })

    it('should validate type requirements', () => {
      const invalidTypes = {
        department: 123, // Should be string
        emergencyContact: 'string' // Should be object
      }

      const result = (service as any).validateCustomFields(invalidTypes)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Field department must be a string')
      expect(result.errors).toContain('Field emergencyContact must be an object')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.spyOn(service, 'getUserByClerkId').mockRejectedValue(new Error('Unexpected error'))

      const result = await service.updateUserProfile('clerk-user-123', { firstName: 'Jane' })

      expect(result.error).toBe('Unexpected error')
    })

    it('should handle malformed Clerk user objects', async () => {
      const malformedClerkUser = {
        id: 'clerk-user-123'
        // Missing required fields
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      const result = await service.syncUser(malformedClerkUser as any)

      expect(result.isNew).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle concurrent sync operations', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' }
            })
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ 
            data: mockUserRow, 
            error: null 
          })
        }))
      })

      // Simulate concurrent sync operations
      const promises = Array.from({ length: 5 }, () => 
        service.syncUser(mockClerkUser)
      )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.error).toBeUndefined()
      })
    })
  })
})