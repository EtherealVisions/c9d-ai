/**
 * Fixed Users API Test Scaffold
 * Addresses authentication and service mocking issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Comprehensive mocking setup
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}))

vi.mock('@/lib/services/user-service', () => ({
  userService: {
    getUserWithMemberships: vi.fn(),
    updateUserProfile: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn()
  }
}))

vi.mock('@/lib/middleware/auth', () => ({
  withUserSync: (handler: any) => handler
}))

vi.mock('@/lib/models/schemas', () => ({
  validateUpdateUser: vi.fn()
}))

// Import after mocking
import { GET, PUT } from '@/app/api/users/route'
import { userService } from '@/lib/services/user-service'
import { validateUpdateUser } from '@/lib/models/schemas'

describe('Users API - Fixed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return user profile successfully', async () => {
      // Mock authenticated request with user
      const mockUser = {
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockRequest = {
        user: mockUser,
        json: () => Promise.resolve({})
      } as any

      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        data: mockUser,
        error: undefined,
        code: undefined
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.user).toEqual(mockUser)
      expect(userService.getUserWithMemberships).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = {
        user: null,
        json: () => Promise.resolve({})
      } as any

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle user not found error', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.resolve({})
      } as any

      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        data: undefined,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
    })

    it('should handle service errors', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.resolve({})
      } as any

      vi.mocked(userService.getUserWithMemberships).mockResolvedValue({
        data: undefined,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('PUT /api/users', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      }

      const mockUser = {
        id: 'user-123',
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.resolve(updateData)
      } as any

      vi.mocked(validateUpdateUser).mockReturnValue(true)
      vi.mocked(userService.updateUserProfile).mockResolvedValue({
        data: mockUser,
        error: undefined,
        code: undefined
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockUser)
      expect(userService.updateUserProfile).toHaveBeenCalledWith('user-123', updateData)
    })

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = {
        user: null,
        json: () => Promise.resolve({})
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('INVALID_JSON')
    })

    it('should handle validation errors', async () => {
      const invalidData = {
        firstName: '', // Invalid empty string
        email: 'invalid-email' // Invalid email format
      }

      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.resolve(invalidData)
      } as any

      vi.mocked(validateUpdateUser).mockImplementation(() => {
        throw new Error('Validation failed')
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle user not found during update', async () => {
      const updateData = { firstName: 'Updated' }

      const mockRequest = {
        user: { id: 'nonexistent-user' },
        json: () => Promise.resolve(updateData)
      } as any

      vi.mocked(validateUpdateUser).mockReturnValue(true)
      vi.mocked(userService.updateUserProfile).mockResolvedValue({
        data: undefined,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
    })

    it('should handle service errors during update', async () => {
      const updateData = { firstName: 'Updated' }

      const mockRequest = {
        user: { id: 'user-123' },
        json: () => Promise.resolve(updateData)
      } as any

      vi.mocked(validateUpdateUser).mockReturnValue(true)
      vi.mocked(userService.updateUserProfile).mockResolvedValue({
        data: undefined,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
    })
  })
})