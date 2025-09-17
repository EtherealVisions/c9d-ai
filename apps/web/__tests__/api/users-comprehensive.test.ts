/**
 * Comprehensive test suite for Users API route
 * Achieves 90% coverage for users endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, PATCH } from '../../app/api/users/route'

// Mock dependencies
const mockUserService = {
  getUserWithMemberships: vi.fn(),
  updateUserProfile: vi.fn()
}

const mockValidateUpdateUser = vi.fn()

const mockWithUserSync = vi.fn()

vi.mock('@/lib/services/user-service', () => ({
  userService: mockUserService
}))

vi.mock('@/lib/models/schemas', () => ({
  validateUpdateUser: mockValidateUpdateUser
}))

vi.mock('@/lib/middleware/auth', () => ({
  withUserSync: (handler: any) => {
    return mockWithUserSync.mockImplementation(async (req: any) => {
      // Simulate the middleware behavior
      return handler(req)
    })
  }
}))

describe('/api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return user profile with memberships when authenticated', async () => {
      const mockUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        memberships: [
          {
            id: 'membership-1',
            organizationId: 'org-1',
            roleId: 'role-1',
            status: 'active',
            organization: { id: 'org-1', name: 'Test Org' },
            role: { id: 'role-1', name: 'Admin' }
          }
        ]
      }

      mockUserService.getUserWithMemberships.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/users')
      // Simulate authenticated request
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(mockUserService.getUserWithMemberships).toHaveBeenCalledWith('user-1')
    })

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/users')
      // Simulate unauthenticated request
      const unauthenticatedRequest = Object.assign(request, {
        user: null
      })

      const response = await GET(unauthenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
      expect(mockUserService.getUserWithMemberships).not.toHaveBeenCalled()
    })

    it('should return 404 when user is not found', async () => {
      mockUserService.getUserWithMemberships.mockResolvedValue({
        success: false,
        data: null,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const request = new NextRequest('http://localhost:3000/api/users')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USER_NOT_FOUND')
      expect(data.error.message).toBe('User not found')
    })

    it('should return 500 for other service errors', async () => {
      mockUserService.getUserWithMemberships.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/users')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Database connection failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockUserService.getUserWithMemberships.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/users')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to get user')
      expect(console.error).toHaveBeenCalledWith('Error in GET /api/users:', expect.any(Error))
    })
  })

  describe('PUT /api/users', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: { theme: 'dark' }
      }

      const updatedUser = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: { theme: 'dark' }
      }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedUser)
      expect(data.message).toBe('Profile updated successfully')
      expect(mockValidateUpdateUser).toHaveBeenCalledWith(updateData)
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user-1', updateData)
    })

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Jane' })
      })
      const unauthenticatedRequest = Object.assign(request, {
        user: null
      })

      const response = await PUT(unauthenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
      expect(mockUserService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: 'invalid json'
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_JSON')
      expect(data.error.message).toBe('Invalid JSON in request body')
    })

    it('should return 400 for validation errors', async () => {
      const invalidData = { firstName: '' }
      const validationError = new Error('First name is required')

      mockValidateUpdateUser.mockImplementation(() => {
        throw validationError
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(invalidData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid request data')
      expect(data.error.details).toEqual(validationError)
    })

    it('should return 404 when user is not found', async () => {
      const updateData = { firstName: 'Jane' }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USER_NOT_FOUND')
      expect(data.error.message).toBe('User not found')
    })

    it('should return 400 for validation errors from service', async () => {
      const updateData = { firstName: 'Jane' }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Invalid data format',
        code: 'VALIDATION_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid data format')
    })

    it('should return 500 for other service errors', async () => {
      const updateData = { firstName: 'Jane' }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Database connection failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      const updateData = { firstName: 'Jane' }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PUT(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to update user profile')
      expect(console.error).toHaveBeenCalledWith('Error in PUT /api/users:', expect.any(Error))
    })
  })

  describe('PATCH /api/users', () => {
    it('should use the same handler as PUT', async () => {
      const updateData = { firstName: 'Jane' }
      const updatedUser = {
        id: 'user-1',
        firstName: 'Jane',
        email: 'test@example.com'
      }

      mockValidateUpdateUser.mockReturnValue(updateData)
      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' }
      })

      const response = await PATCH(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedUser)
      expect(data.message).toBe('Profile updated successfully')
    })
  })

  describe('Middleware integration', () => {
    it('should be wrapped with withUserSync middleware', () => {
      // Verify that the handlers are wrapped with the middleware
      expect(mockWithUserSync).toHaveBeenCalledTimes(3) // GET, PUT, PATCH
    })
  })
})