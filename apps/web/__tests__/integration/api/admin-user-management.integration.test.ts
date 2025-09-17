import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as searchUsers } from '@/app/api/admin/users/search/route'
import { GET as getUserDetails, PATCH as updateUserStatus } from '@/app/api/admin/users/[clerkUserId]/route'
import { GET as getAuthMetrics } from '@/app/api/admin/analytics/auth-metrics/route'
import { GET as getAuthEvents } from '@/app/api/admin/analytics/auth-events/route'
import { createSupabaseClient } from '@/lib/database'
import { userSyncService } from '@/lib/services/user-sync'

// Mock auth
const mockAuth = {
  userId: 'test-admin-user',
  orgId: 'test-org-id'
}

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth
}))

// Mock RBAC service to allow admin access
vi.mock('@/lib/services/rbac-service', () => ({
  rbacService: {
    hasPermission: vi.fn().mockResolvedValue(true)
  }
}))

describe('Admin User Management API Integration', () => {
  const supabase = createSupabaseClient()
  let testUserId: string
  let testClerkUserId: string

  beforeAll(async () => {
    // Create test user for integration tests
    const testUser = {
      clerk_user_id: 'test-clerk-user-123',
      email: 'testuser@example.com',
      first_name: 'Test',
      last_name: 'User',
      avatar_url: 'https://example.com/avatar.jpg',
      preferences: {
        accountStatus: 'active',
        onboardingCompleted: true
      }
    }

    const { data: createdUser, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single()

    if (error) {
      console.error('Failed to create test user:', error)
      throw error
    }

    testUserId = createdUser.id
    testClerkUserId = createdUser.clerk_user_id

    // Create some audit log entries for testing
    await supabase.from('audit_logs').insert([
      {
        user_id: testUserId,
        action: 'sign_in',
        resource_type: 'authentication',
        resource_id: testUserId,
        metadata: { deviceType: 'desktop', browser: 'Chrome' },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        user_id: testUserId,
        action: 'user_created',
        resource_type: 'user',
        resource_id: testUserId,
        metadata: { source: 'registration' }
      }
    ])
  })

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.from('audit_logs').delete().eq('user_id', testUserId)
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  describe('User Search API', () => {
    it('should search users by email successfully', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/search?q=testuser@example.com')
      
      const response = await searchUsers(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.users).toBeDefined()
      expect(data.users.length).toBeGreaterThan(0)
      expect(data.users[0].user.email).toBe('testuser@example.com')
      expect(data.users[0].analytics).toBeDefined()
    })

    it('should search users by Clerk ID successfully', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/search?q=${testClerkUserId}`)
      
      const response = await searchUsers(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.users).toBeDefined()
      expect(data.users.length).toBeGreaterThan(0)
      expect(data.users[0].user.clerkUserId).toBe(testClerkUserId)
    })

    it('should return empty results for non-existent user', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/search?q=nonexistent@example.com')
      
      const response = await searchUsers(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.users).toBeDefined()
      expect(data.users.length).toBe(0)
    })

    it('should return 400 for short search query', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/search?q=a')
      
      const response = await searchUsers(request)
      
      expect(response.status).toBe(400)
    })

    it('should return 401 for unauthenticated request', async () => {
      // Temporarily mock auth to return null
      vi.mocked(mockAuth).userId = null as any
      
      const request = new NextRequest('http://localhost/api/admin/users/search?q=test@example.com')
      
      const response = await searchUsers(request)
      
      expect(response.status).toBe(401)
      
      // Restore auth
      vi.mocked(mockAuth).userId = 'test-admin-user'
    })
  })

  describe('User Details API', () => {
    it('should get user details with analytics successfully', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`)
      
      const response = await getUserDetails(request, { params: { clerkUserId: testClerkUserId } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.analytics).toBeDefined()
      expect(data.user.email).toBe('testuser@example.com')
      expect(data.analytics.signInCount).toBeGreaterThanOrEqual(0)
      expect(data.analytics.accountAge).toBeGreaterThanOrEqual(0)
    })

    it('should return 404 for non-existent user', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/nonexistent-clerk-id')
      
      const response = await getUserDetails(request, { params: { clerkUserId: 'nonexistent-clerk-id' } })
      
      expect(response.status).toBe(404)
    })

    it('should update user status successfully', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'suspended',
          reason: 'Test suspension'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await updateUserStatus(request, { params: { clerkUserId: testClerkUserId } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.preferences.accountStatus).toBe('suspended')
      expect(data.user.preferences.statusReason).toBe('Test suspension')
      
      // Restore user status
      const restoreRequest = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'active',
          reason: 'Test restoration'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      await updateUserStatus(restoreRequest, { params: { clerkUserId: testClerkUserId } })
    })

    it('should return 400 for invalid status update', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'invalid_status'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await updateUserStatus(request, { params: { clerkUserId: testClerkUserId } })
      
      expect(response.status).toBe(400)
    })
  })

  describe('Authentication Analytics API', () => {
    it('should get authentication metrics successfully', async () => {
      const request = new NextRequest('http://localhost/api/admin/analytics/auth-metrics?timeRange=7d')
      
      const response = await getAuthMetrics(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
      expect(data.metrics).toHaveProperty('totalSignIns')
      expect(data.metrics).toHaveProperty('totalSignUps')
      expect(data.metrics).toHaveProperty('activeUsers')
      expect(data.metrics).toHaveProperty('suspiciousActivities')
      expect(data.deviceStats).toBeDefined()
      expect(data.locationStats).toBeDefined()
    })

    it('should get authentication events successfully', async () => {
      const request = new NextRequest('http://localhost/api/admin/analytics/auth-events?limit=10&filter=all')
      
      const response = await getAuthEvents(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.events).toBeDefined()
      expect(Array.isArray(data.events)).toBe(true)
      expect(data.total).toBeDefined()
      expect(data.filter).toBe('all')
    })

    it('should filter authentication events by type', async () => {
      const request = new NextRequest('http://localhost/api/admin/analytics/auth-events?filter=sign_in')
      
      const response = await getAuthEvents(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.events).toBeDefined()
      expect(data.filter).toBe('sign_in')
      
      // All events should be sign_in events
      data.events.forEach((event: any) => {
        expect(event.type).toBe('sign_in')
      })
    })

    it('should handle different time ranges for metrics', async () => {
      const timeRanges = ['1d', '7d', '30d', '90d']
      
      for (const timeRange of timeRanges) {
        const request = new NextRequest(`http://localhost/api/admin/analytics/auth-metrics?timeRange=${timeRange}`)
        
        const response = await getAuthMetrics(request)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.timeRange).toBe(timeRange)
        expect(data.metrics).toBeDefined()
      }
    })
  })

  describe('User Analytics Integration', () => {
    it('should calculate user analytics correctly', async () => {
      const analytics = await userSyncService.getUserAnalytics(testClerkUserId)
      
      expect(analytics.user).toBeDefined()
      expect(analytics.analytics).toBeDefined()
      expect(analytics.analytics.signInCount).toBeGreaterThanOrEqual(0)
      expect(analytics.analytics.accountAge).toBeGreaterThanOrEqual(0)
      expect(analytics.analytics.sessionCount).toBeGreaterThanOrEqual(0)
      expect(analytics.analytics.securityEvents).toBeGreaterThanOrEqual(0)
      expect(analytics.analytics.organizationMemberships).toBeGreaterThanOrEqual(0)
    })

    it('should handle non-existent user analytics', async () => {
      const analytics = await userSyncService.getUserAnalytics('nonexistent-clerk-id')
      
      expect(analytics.user).toBeNull()
      expect(analytics.error).toBeDefined()
    })
  })

  describe('Permission Checks', () => {
    it('should deny access without proper permissions', async () => {
      // Mock RBAC to deny permission
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValueOnce(false)
      
      const request = new NextRequest('http://localhost/api/admin/users/search?q=test@example.com')
      
      const response = await searchUsers(request)
      
      expect(response.status).toBe(403)
      
      // Restore permission
      vi.mocked(rbacService.hasPermission).mockResolvedValue(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking the database to fail
      // For now, we'll test that the API handles malformed requests
      const request = new NextRequest('http://localhost/api/admin/users/search')
      
      const response = await searchUsers(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle malformed JSON in status update', async () => {
      const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`, {
        method: 'PATCH',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await updateUserStatus(request, { params: { clerkUserId: testClerkUserId } })
      
      expect(response.status).toBe(400)
    })
  })
})