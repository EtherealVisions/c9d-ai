/**
 * Integration tests for user API endpoints - Drizzle Migration
 * Tests the complete API flow including authentication and validation
 * Requirements: 5.4 - Update tests to use new database layer
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { createMockDatabase } from '../../../__tests__/setup/drizzle-testing-setup'
import type { User } from '@/lib/models/types'
import type { DrizzleDatabase } from '@/lib/db/connection'

// Mock Drizzle database
const mockDatabase = createMockDatabase()

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => mockDatabase
}))

// Mock repository factory with repository mocks
const mockUserRepository = {
  findById: vi.fn(),
  findByClerkId: vi.fn(),
  findWithMemberships: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  delete: vi.fn()
}

vi.mock('@/lib/repositories/factory', () => ({
  getRepositoryFactory: () => ({
    getUserRepository: () => mockUserRepository
  })
}))

// Mock the user service to use repository
vi.mock('@/lib/services/user-service', () => ({
  userService: {
    getUserWithMemberships: vi.fn(),
    updateUserProfile: vi.fn()
  }
}))

// Mock the auth middleware
vi.mock('@/lib/middleware/auth', () => ({
  withUserSync: (handler: Function) => handler,
  type: {} // For TypeScript
}))

// Mock validation schemas
vi.mock('@/lib/validation/schemas/users', () => ({
  updateUserSchema: {
    parse: vi.fn((data) => data),
    safeParse: vi.fn((data) => ({ success: true, data }))
  }
}))

describe('/api/users', () => {
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

  const mockUserWithMemberships = {
    ...mockUser,
    memberships: [
      {
        id: 'membership-123',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-123',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org'
        },
        role: {
          id: 'role-123',
          name: 'Member'
        }
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return user with memberships successfully', async () => {
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.getUserWithMemberships as Mock).mockResolvedValue({
        data: mockUserWithMemberships
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.user).toMatchObject({
        id: mockUserWithMemberships.id,
        email: mockUserWithMemberships.email,
        firstName: mockUserWithMemberships.firstName,
        lastName: mockUserWithMemberships.lastName
      })
      expect(userService.getUserWithMemberships).toHaveBeenCalledWith('user-123')
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

      ;(userService.getUserWithMemberships as Mock).mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
      expect(responseData.error.message).toBe('User not found')
    })

    it('should return 500 on service error', async () => {
      const mockRequest = {
        user: mockUser
      } as any

      ;(userService.getUserWithMemberships as Mock).mockResolvedValue({
        error: 'Database error',
        code: 'DATABASE_ERROR'
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
      expect(responseData.error.message).toBe('Database error')
    })
  })

  describe('PUT /api/users', () => {
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith',
      avatarUrl: 'https://example.com/new-avatar.jpg'
    }

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData }
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updateData)
      } as any

      ;(userService.updateUserProfile as Mock).mockResolvedValue({
        data: updatedUser
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toMatchObject({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl
      })
      expect(responseData.message).toBe('Profile updated successfully')
      expect(userService.updateUserProfile).toHaveBeenCalledWith('user-123', updateData)
    })

    it('should return 401 when user not authenticated', async () => {
      const mockRequest = {
        user: undefined,
        json: vi.fn().mockResolvedValue(updateData)
      } as any

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')
      expect(responseData.error.message).toBe('User not authenticated')
    })

    it('should return 400 on validation error', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updateData)
      } as any

      const { validateUpdateUser } = await import('@/lib/models/schemas')
      ;(validateUpdateUser as Mock).mockImplementation(() => {
        throw new Error('Validation failed')
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toBe('Invalid request data')
    })

    it('should return 404 when user not found', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updateData)
      } as any

      // Reset validation mock to not throw
      const { validateUpdateUser } = await import('@/lib/models/schemas')
      ;(validateUpdateUser as Mock).mockImplementation((data) => data)

      ;(userService.updateUserProfile as Mock).mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
      expect(responseData.error.message).toBe('User not found')
    })

    it('should return 500 on service error', async () => {
      const mockRequest = {
        user: mockUser,
        json: vi.fn().mockResolvedValue(updateData)
      } as any

      // Reset validation mock to not throw
      const { validateUpdateUser } = await import('@/lib/models/schemas')
      ;(validateUpdateUser as Mock).mockImplementation((data) => data)

      ;(userService.updateUserProfile as Mock).mockResolvedValue({
        error: 'Database error',
        code: 'DATABASE_ERROR'
      })

      const response = await PUT(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
      expect(responseData.error.message).toBe('Database error')
    })
  })
})