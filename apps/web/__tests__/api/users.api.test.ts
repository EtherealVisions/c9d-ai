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

// Import the actual route handlers
import { GET, PUT } from '@/app/api/users/route'

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return users list', async () => {
      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any)

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        data: [
          {
            id: 'user-1',
            clerkUserId: 'clerk_123',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: 'One',
            avatarUrl: undefined,
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        error: undefined
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toHaveLength(1)
      expect(responseData[0]).toHaveProperty('id', 'user-1')
    })

    it('should return 401 when user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/users', () => {
    it('should successfully update a user', async () => {
      const userData = {
        firstName: 'Updated',
        lastName: 'User'
      }

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.updateUserProfile).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'user@example.com',
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatarUrl: undefined,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        error: undefined
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(userData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.user.firstName).toBe(userData.firstName)
    })

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
    })
  })
})