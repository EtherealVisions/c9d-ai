import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserSyncService, AuthEventType } from '../user-sync'
import type { User as ClerkUser } from '@clerk/nextjs/server'

// Mock dependencies
vi.mock('../../database', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
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

describe('UserSyncService', () => {
  let userSyncService: UserSyncService
  let mockClerkUser: ClerkUser
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    userSyncService = new UserSyncService()
    
    mockClerkUser = {
      id: 'clerk-user-1',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
      externalAccounts: []
    } as any

    mockSupabase = require('../../database').createSupabaseClient()
  })

  describe('syncUser', () => {
    it('should create new user when user does not exist', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock successful user creation
      const mockNewUser = {
        id: 'user-1',
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        preferences: {
          onboardingCompleted: false,
          onboardingSteps: {},
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            marketing: false
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockNewUser,
        error: null
      })

      const result = await userSyncService.syncUser(mockClerkUser, {
        source: 'test',
        ipAddress: '127.0.0.1'
      })

      expect(result.isNew).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.clerkUserId).toBe('clerk-user-1')

      // Verify user creation was called with correct data
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        preferences: expect.objectContaining({
          onboardingCompleted: false,
          theme: 'system'
        })
      })
    })

    it('should update existing user when user exists', async () => {
      // Mock existing user
      const mockExistingUser = {
        id: 'user-1',
        clerk_user_id: 'clerk-user-1',
        email: 'old@example.com',
        first_name: 'Old',
        last_name: 'Name',
        avatar_url: null,
        preferences: { theme: 'dark' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockExistingUser,
        error: null
      })

      // Mock successful user update
      const mockUpdatedUser = {
        ...mockExistingUser,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null
      })

      const result = await userSyncService.syncUser(mockClerkUser, {
        source: 'test'
      })

      expect(result.isNew).toBe(false)
      expect(result.error).toBeUndefined()
      expect(result.user.email).toBe('test@example.com')

      // Verify user update was called
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' }
      })
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await userSyncService.syncUser(mockClerkUser)

      expect(result.isNew).toBe(false)
      expect(result.error).toBe('Failed to fetch user: Database connection failed')
      expect(result.user).toEqual({})
    })

    it('should detect social sign-up method', async () => {
      // Mock social sign-up
      const socialClerkUser = {
        ...mockClerkUser,
        externalAccounts: [{ provider: 'google' }]
      } as any

      // Mock user not found (new user)
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const mockNewUser = {
        id: 'user-1',
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        preferences: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockNewUser,
        error: null
      })

      const result = await userSyncService.syncUser(socialClerkUser)

      expect(result.isNew).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('logAuthEvent', () => {
    it('should log authentication events with metadata', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      await userSyncService.logAuthEvent(
        'user-1',
        AuthEventType.SIGN_IN,
        { source: 'test' },
        '127.0.0.1',
        'Mozilla/5.0'
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        action: AuthEventType.SIGN_IN,
        resource_type: 'authentication',
        resource_id: 'user-1',
        metadata: {
          source: 'test',
          eventType: AuthEventType.SIGN_IN,
          timestamp: expect.any(String)
        },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0'
      })
    })

    it('should handle logging errors gracefully', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Logging failed' }
      })

      // Should not throw error
      await expect(
        userSyncService.logAuthEvent('user-1', AuthEventType.SIGN_IN)
      ).resolves.toBeUndefined()
    })
  })

  describe('handleSessionCreated', () => {
    it('should log session creation for existing user', async () => {
      const mockUser = {
        id: 'user-1',
        clerkUserId: 'clerk-user-1',
        email: 'test@example.com'
      }

      // Mock getUserByClerkId
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-1',
          clerk_user_id: 'clerk-user-1',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      await userSyncService.handleSessionCreated(
        'clerk-user-1',
        'session-1',
        { source: 'test' }
      )

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        action: AuthEventType.SESSION_CREATED,
        resource_type: 'authentication',
        resource_id: 'user-1',
        metadata: {
          source: 'test',
          sessionId: 'session-1',
          clerkUserId: 'clerk-user-1',
          eventType: AuthEventType.SESSION_CREATED,
          timestamp: expect.any(String)
        },
        ip_address: undefined,
        user_agent: undefined
      })
    })

    it('should handle missing user gracefully', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Should not throw error
      await expect(
        userSyncService.handleSessionCreated('nonexistent-user', 'session-1')
      ).resolves.toBeUndefined()
    })
  })

  describe('updateLastSignIn', () => {
    it('should update user last sign-in timestamp', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      })

      await userSyncService.updateLastSignIn('clerk-user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        preferences: expect.any(Object) // Raw SQL for JSON merge
      })
    })

    it('should handle update errors gracefully', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      // Should not throw error
      await expect(
        userSyncService.updateLastSignIn('clerk-user-1')
      ).resolves.toBeUndefined()
    })
  })

  describe('deleteUser', () => {
    it('should delete user and log deletion event', async () => {
      // Mock user exists
      const mockUser = {
        id: 'user-1',
        clerk_user_id: 'clerk-user-1',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      })

      // Mock successful deletion
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await userSyncService.deleteUser('clerk-user-1')

      expect(result).toBe(true)
      expect(mockSupabase.from().delete).toHaveBeenCalled()
    })

    it('should return false for non-existent user', async () => {
      // Mock user not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await userSyncService.deleteUser('nonexistent-user')

      expect(result).toBe(false)
    })
  })
})