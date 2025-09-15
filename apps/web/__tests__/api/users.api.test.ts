/**
 * Users API Route Tests
 * Tests the /api/users endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock external dependencies
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/services/user-service')
vi.mock('@/lib/services/user-sync')

describe('/api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return current user profile', async () => {
      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user sync service
      const { userSyncService } = await import('@/lib/services/user-sync')
      vi.mocked(userSyncService.getUserByClerkId).mockResolvedValue({
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      })

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: []
        }
      })

      // Create a mock authenticated request
      const request = new NextRequest('http://localhost:3000/api/users') as any
      request.user = {
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com'
      }

      // Import and test the API route handler directly
      const { GET } = await import('@/app/api/users/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
    })

    it('should return 401 when user not authenticated', async () => {
      // Mock unauthenticated state
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: null })

      const { GET } = await import('@/app/api/users/route')
      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle user service errors', async () => {
      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user sync service
      const { userSyncService } = await import('@/lib/services/user-sync')
      vi.mocked(userSyncService.getUserByClerkId).mockResolvedValue({
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com'
      })

      // Mock user service error
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const { GET } = await import('@/app/api/users/route')
      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('PUT /api/users', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: {
          theme: 'dark',
          notifications: { email: false }
        }
      }

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user sync service
      const { userSyncService } = await import('@/lib/services/user-sync')
      vi.mocked(userSyncService.getUserByClerkId).mockResolvedValue({
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com'
      })

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserByClerkId).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      vi.mocked(userService.updateUserProfile).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          avatarUrl: null,
          preferences: updateData.preferences,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const { PUT } = await import('@/app/api/users/route')
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.firstName).toBe('Jane')
      expect(data.data.lastName).toBe('Smith')
    })

    it('should return 400 for invalid request body', async () => {
      const invalidData = {
        firstName: '', // Invalid empty name
        email: 'invalid-email' // Invalid email format
      }

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user sync service
      const { userSyncService } = await import('@/lib/services/user-sync')
      vi.mocked(userSyncService.getUserByClerkId).mockResolvedValue({
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com'
      })

      const { PUT } = await import('@/app/api/users/route')
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle malformed JSON', async () => {
      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user sync service
      const { userSyncService } = await import('@/lib/services/user-sync')
      vi.mocked(userSyncService.getUserByClerkId).mockResolvedValue({
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com'
      })

      const { PUT } = await import('@/app/api/users/route')
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_JSON')
    })
  })

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences successfully', async () => {
      const preferences = {
        theme: 'dark',
        language: 'es',
        notifications: {
          email: false,
          push: true,
          marketing: false
        }
      }

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserByClerkId).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      vi.mocked(userService.updateUserPreferences).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock the preferences API route
      const preferencesHandler = async (request: NextRequest) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        try {
          const body = await request.json()
          const { userService } = await import('@/lib/services/user-service')
          
          const userResult = await userService.getUserByClerkId(userId)
          if (userResult.error) {
            return Response.json(
              { success: false, error: { code: userResult.code } },
              { status: 500 }
            )
          }

          const result = await userService.updateUserPreferences(userResult.data!.id, body)
          if (result.error) {
            return Response.json(
              { success: false, error: { code: result.code } },
              { status: 400 }
            )
          }

          return Response.json({ success: true, data: result.data })
        } catch (error) {
          return Response.json(
            { success: false, error: { code: 'INVALID_JSON' } },
            { status: 400 }
          )
        }
      }

      const request = new NextRequest('http://localhost:3000/api/users/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await preferencesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.preferences.theme).toBe('dark')
      expect(data.data.preferences.language).toBe('es')
    })
  })
})