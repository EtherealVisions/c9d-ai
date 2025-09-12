/**
 * Integration tests for user preferences API endpoints
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { GET, PUT, DELETE } from '../route'
import { userService } from '@/lib/services/user-service'
import type { User } from '@/lib/models/types'

// Mock the user service
vi.mock('@/lib/services/user-service', () => ({
  userService: {
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    resetUserPreferences: vi.fn()
  }
}))

// Mock the auth middleware
vi.mock('@/lib/middleware/auth', () => ({
  withUserSync: (handler: Function) => handler
}))

describe('/api/users/preferences', () => {
  const mockUser: User = {
    id: 'user-123',
    clerkUserId: 'clerk-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: {
      theme: 'dark',
      language: 'en'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockPreferences = {
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      marketing: false
    },
    dashboard: {
      defaultView: 'overview',
      itemsPerPage: 10
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users/preferences', () => {
    it('should return user preferences successfully', async () => {
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.getUserPreferences as Mock).mockResolvedValue({
        data: mockPreferences
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.preferences).toEqual(mockPreferences)
      expect(userService.getUserPreferences).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 when user not authenticated', async () => {
      const mockRequest = {
        user: undefined
      } as any

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
      expect(responseData.error.message).toBe('User not authenticated')
    })

    it('should return 404 when user not found', async () => {
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.getUserPreferences as Mock).mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
      expect(responseData.error.message).toBe('User not found')
    })
  })

  describe('PUT /api/users/preferences', () => {
    const updatePreferences = {
      theme: 'light',
      notifications: {
        email: false
      }
    }

    it('should update user preferences successfully', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          ...updatePreferences
        }
      }
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updatePreferences)
      } as any

      ;(userService.updateUserPreferences as Mock).mockResolvedValue({
        data: updatedUser
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.user).toMatchObject({
        id: updatedUser.id,
        preferences: expect.objectContaining(updatePreferences)
      })
      expect(responseData.message).toBe('Preferences updated successfully')
      expect(userService.updateUserPreferences).toHaveBeenCalledWith('user-123', updatePreferences)
    })

    it('should return 401 when user not authenticated', async () => {
      const mockRequest = {
        user: undefined,
        json: vi.fn().mockResolvedValue(updatePreferences)
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
      expect(responseData.error.message).toBe('User not authenticated')
    })

    it('should return 400 when preferences is not an object', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue('invalid')
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toBe('Preferences must be an object')
    })

    it('should return 400 when preferences is null', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(null)
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toBe('Preferences must be an object')
    })

    it('should return 404 when user not found', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updatePreferences)
      } as any

      ;(userService.updateUserPreferences as Mock).mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
      expect(responseData.error.message).toBe('User not found')
    })
  })

  describe('DELETE /api/users/preferences', () => {
    it('should reset user preferences successfully', async () => {
      const resetUser = {
        ...mockUser,
        preferences: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            marketing: false
          },
          dashboard: {
            defaultView: 'overview',
            itemsPerPage: 10
          }
        }
      }
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.resetUserPreferences as Mock).mockResolvedValue({
        data: resetUser
      })

      const response = await DELETE(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.user).toMatchObject({
        id: resetUser.id,
        preferences: expect.objectContaining({
          theme: 'system',
          language: 'en'
        })
      })
      expect(responseData.message).toBe('Preferences reset to defaults successfully')
      expect(userService.resetUserPreferences).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 when user not authenticated', async () => {
      const mockRequest = {
        user: undefined
      } as any

      const response = await DELETE(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
      expect(responseData.error.message).toBe('User not authenticated')
    })

    it('should return 404 when user not found', async () => {
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.resetUserPreferences as Mock).mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await DELETE(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
      expect(responseData.error.message).toBe('User not found')
    })
  })
})