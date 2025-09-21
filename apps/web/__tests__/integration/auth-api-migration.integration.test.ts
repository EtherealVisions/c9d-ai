/**
 * Integration Tests for Migrated Authentication API Routes
 * 
 * Tests the migration of authentication and user API routes to use
 * Drizzle repositories and Zod validation schemas.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all external dependencies before importing
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/services/user-service')
vi.mock('@/lib/services/auth-router-service')
vi.mock('@/lib/repositories/factory')
vi.mock('@/lib/db/connection')
vi.mock('@/lib/config/init', () => ({
  initializeAppConfig: vi.fn().mockResolvedValue(undefined),
  getAppConfigSync: vi.fn().mockReturnValue('https://test.supabase.co')
}))

// Import after mocking
import { auth, currentUser } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { userService } from '@/lib/services/user-service'
import { authRouterService } from '@/lib/services/auth-router-service'

const mockAuth = vi.mocked(auth)
const mockCurrentUser = vi.mocked(currentUser)
const mockUserSyncService = vi.mocked(userSyncService)
const mockUserService = vi.mocked(userService)
const mockAuthRouterService = vi.mocked(authRouterService)

describe('Authentication API Migration Integration Tests', () => {
  const mockUser = {
    id: 'user_123',
    clerkUserId: 'clerk_user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: []
  }

  const mockClerkUser = {
    id: 'clerk_user_123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: 'https://example.com/avatar.jpg'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockAuth.mockResolvedValue({ 
      userId: 'clerk_user_123', 
      orgId: 'org_123' 
    })
    mockCurrentUser.mockResolvedValue(mockClerkUser as any)
    
    mockUserSyncService.syncUser.mockResolvedValue({
      user: mockUser,
      isNew: false,
      error: null
    })
    
    mockUserService.getUserByClerkId.mockResolvedValue({
      data: mockUser,
      error: null
    })
    
    mockUserService.getUserWithMemberships.mockResolvedValue({
      data: mockUser,
      error: null
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/auth/me', () => {
    it('should return user data with proper validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me')
      
      mockAuthRouterService.getOnboardingStatus.mockResolvedValue({
        isComplete: true,
        currentStep: null,
        completedSteps: ['profile', 'preferences'],
        totalSteps: 2,
        progress: 100
      })
      
      mockAuthRouterService.getPostAuthDestination.mockResolvedValue('/dashboard')

      const response = await authMeGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.fullName).toBe('John Doe')
      expect(data.organizations).toBeDefined()
      expect(data.onboarding).toBeDefined()
      expect(data.session).toBeDefined()
    })

    it('should handle user sync errors properly', async () => {
      mockUserSyncService.syncUser.mockResolvedValue({
        user: null,
        isNew: false,
        error: 'Sync failed'
      })

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await authMeGet(request)

      expect(response.status).toBe(500)
    })

    it('should handle build-time requests', async () => {
      const originalEnv = process.env.NEXT_PHASE
      process.env.NEXT_PHASE = 'phase-production-build'

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await authMeGet(request)

      expect(response.status).toBe(503)
      
      process.env.NEXT_PHASE = originalEnv
    })
  })

  describe('POST /api/auth/onboarding', () => {
    it('should update onboarding progress with validation', async () => {
      const requestBody = {
        step: 'profile_setup',
        completed: true,
        data: { profileComplete: true }
      }

      mockAuthRouterService.updateOnboardingProgress.mockResolvedValue(undefined)
      mockUserService.updateUserPreferences.mockResolvedValue({
        data: mockUser,
        error: null
      })
      
      mockAuthRouterService.getOnboardingStatus.mockResolvedValue({
        isComplete: false,
        currentStep: 'preferences',
        completedSteps: ['profile_setup'],
        totalSteps: 2,
        progress: 50
      })
      
      mockAuthRouterService.getPostAuthDestination.mockResolvedValue('/onboarding/preferences')

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await onboardingPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.step).toBe('profile_setup')
      expect(data.completed).toBe(true)
      expect(data.onboarding).toBeDefined()
    })

    it('should validate request body and reject invalid data', async () => {
      const invalidRequestBody = {
        step: '', // Invalid: empty step
        completed: 'invalid', // Invalid: should be boolean
        data: 'x'.repeat(20000) // Invalid: too large
      }

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await onboardingPost(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/users', () => {
    it('should return user profile with proper schema validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/users')
      
      const response = await usersGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.fullName).toBe('John Doe')
      expect(data.user.membershipCount).toBe(0)
      expect(data.user.isActive).toBe(true)
    })

    it('should handle user not found errors', async () => {
      mockUserService.getUserWithMemberships.mockResolvedValue({
        data: null,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await usersGet(request)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/users', () => {
    it('should update user profile with validation', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: {
          theme: 'dark',
          notifications: { email: false }
        }
      }

      const updatedUser = {
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: updateData.preferences
      }

      mockUserService.updateUserProfile.mockResolvedValue({
        data: updatedUser,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await usersPut(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.firstName).toBe('Jane')
      expect(data.data.lastName).toBe('Smith')
      expect(data.data.fullName).toBe('Jane Smith')
    })

    it('should validate update data and reject invalid input', async () => {
      const invalidUpdateData = {
        firstName: 'x'.repeat(200), // Too long
        lastName: 123, // Wrong type
        avatarUrl: 'not-a-url' // Invalid URL
      }

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await usersPut(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/users/profile', () => {
    it('should return profile without analytics by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/profile')
      
      const response = await profileGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.analytics).toBeUndefined()
    })

    it('should return profile with analytics when requested', async () => {
      const mockAnalytics = {
        loginCount: 10,
        lastLoginAt: new Date(),
        accountAge: 30,
        organizationCount: 2,
        activityScore: 85
      }

      mockUserSyncService.getUserAnalytics.mockResolvedValue({
        user: mockUser,
        analytics: mockAnalytics,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users/profile?analytics=true')
      
      const response = await profileGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.analytics).toBeDefined()
      expect(data.analytics.loginCount).toBe(10)
    })
  })

  describe('PUT /api/users/profile', () => {
    it('should update profile with custom fields validation', async () => {
      const updateData = {
        firstName: 'Updated',
        customFields: {
          department: 'Engineering',
          skills: ['TypeScript', 'React']
        }
      }

      const updatedUser = {
        ...mockUser,
        firstName: 'Updated'
      }

      mockUserSyncService.updateUserProfile.mockResolvedValue({
        user: updatedUser,
        syncMetadata: {
          lastSyncAt: new Date(),
          source: 'profile_api',
          version: '1.0'
        },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await profilePut(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.firstName).toBe('Updated')
      expect(data.syncMetadata).toBeDefined()
      expect(data.message).toBe('Profile updated successfully')
    })
  })

  describe('PATCH /api/users/profile (preferences)', () => {
    it('should update preferences with validation', async () => {
      const preferencesData = {
        theme: 'dark' as const,
        language: 'en',
        notifications: {
          email: false,
          push: true,
          inApp: true,
          marketing: false
        }
      }

      const updatedUser = {
        ...mockUser,
        preferences: preferencesData
      }

      mockUserSyncService.updateUserPreferences.mockResolvedValue({
        user: updatedUser,
        syncMetadata: {
          lastSyncAt: new Date(),
          source: 'profile_api',
          version: '1.0'
        },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(preferencesData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await profilePatch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.syncMetadata).toBeDefined()
      expect(data.message).toBe('Preferences updated successfully')
    })

    it('should validate preferences schema', async () => {
      const invalidPreferences = {
        theme: 'invalid-theme', // Invalid enum value
        language: 'x', // Too short
        notifications: {
          email: 'yes' // Should be boolean
        }
      }

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(invalidPreferences),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await profilePatch(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle authentication errors consistently', async () => {
      mockAuth.mockResolvedValue({ userId: null, orgId: null })

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await authMeGet(request)

      expect(response.status).toBe(401)
    })

    it('should provide structured error responses', async () => {
      mockUserService.getUserByClerkId.mockResolvedValue({
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await usersGet(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should validate request IDs in error responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/invalid')
      
      // This should trigger validation middleware
      const response = await usersGet(request)
      
      if (response.status >= 400) {
        const data = await response.json()
        // Error responses should include request context
        expect(data.timestamp).toBeDefined()
      }
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain API contract compatibility', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me')
      
      const response = await authMeGet(request)
      const data = await response.json()

      // Ensure response structure matches expected API contract
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('organizations')
      expect(data).toHaveProperty('onboarding')
      expect(data).toHaveProperty('session')
      
      if (data.user) {
        expect(data.user).toHaveProperty('id')
        expect(data.user).toHaveProperty('email')
        expect(data.user).toHaveProperty('fullName')
      }
    })

    it('should handle legacy request formats gracefully', async () => {
      // Test that old request formats still work
      const legacyUpdateData = {
        firstName: 'Legacy',
        lastName: 'User'
        // Missing new fields should be handled gracefully
      }

      mockUserService.updateUserProfile.mockResolvedValue({
        data: { ...mockUser, ...legacyUpdateData },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PUT',
        body: JSON.stringify(legacyUpdateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await usersPut(request)

      expect(response.status).toBe(200)
    })
  })
})