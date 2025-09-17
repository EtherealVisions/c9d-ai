import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, PATCH } from '@/app/api/users/profile/route'
import { GET as AdminGET, PATCH as AdminPATCH } from '@/app/api/admin/users/[clerkUserId]/route'
import { createTestDatabase, cleanupTestDatabase, clearTestData } from '../../setup/test-database'
import { createAuthenticatedRequest, createAdminRequest } from '../../setup/auth-helpers'
import { seedTestUser } from '../../setup/fixtures'

describe('User Profile Management API Integration Tests', () => {
  let testUserId: string
  let testClerkUserId: string

  beforeAll(async () => {
    await createTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearTestData(['users', 'audit_logs'])
    const testUser = await seedTestUser()
    testUserId = testUser.id
    testClerkUserId = testUser.clerk_user_id
  })

  describe('GET /api/users/profile', () => {
    it('should return user profile for authenticated request', async () => {
      const request = createAuthenticatedRequest('GET', '/api/users/profile', null, testClerkUserId)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user).toHaveProperty('id', testUserId)
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('clerkUserId', testClerkUserId)
    })

    it('should return user profile with analytics when requested', async () => {
      const request = createAuthenticatedRequest(
        'GET', 
        '/api/users/profile?analytics=true', 
        null, 
        testClerkUserId
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.analytics).toBeDefined()
      expect(data.analytics).toHaveProperty('signInCount')
      expect(data.analytics).toHaveProperty('lastSignInAt')
      expect(data.analytics).toHaveProperty('accountAge')
      expect(data.analytics).toHaveProperty('sessionCount')
      expect(data.analytics).toHaveProperty('securityEvents')
      expect(data.analytics).toHaveProperty('organizationMemberships')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost/api/users/profile')
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/users/profile', () => {
    it('should update user profile with valid data', async () => {
      const profileData = {
        firstName: 'Updated',
        lastName: 'Name',
        preferences: {
          theme: 'dark',
          language: 'es'
        },
        customFields: {
          department: 'Engineering',
          jobTitle: 'Senior Developer'
        }
      }

      const request = createAuthenticatedRequest(
        'PUT', 
        '/api/users/profile', 
        profileData, 
        testClerkUserId
      )
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user.firstName).toBe('Updated')
      expect(data.user.lastName).toBe('Name')
      expect(data.user.preferences.theme).toBe('dark')
      expect(data.user.preferences.language).toBe('es')
      expect(data.user.preferences.customFields.department).toBe('Engineering')
      expect(data.syncMetadata).toBeDefined()
      expect(data.syncMetadata.changes).toContain('firstName')
      expect(data.syncMetadata.changes).toContain('lastName')
      expect(data.syncMetadata.changes).toContain('preferences')
      expect(data.syncMetadata.changes).toContain('customFields')
      expect(data.message).toBe('Profile updated successfully')
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        firstName: '', // Empty string should fail validation
        avatarUrl: 'not-a-url' // Invalid URL should fail validation
      }

      const request = createAuthenticatedRequest(
        'PUT', 
        '/api/users/profile', 
        invalidData, 
        testClerkUserId
      )
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/users/profile', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer mock-token-${testClerkUserId}`
        },
        body: 'invalid-json'
      })
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost/api/users/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName: 'Test' })
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/users/profile/preferences', () => {
    it('should update user preferences with validation', async () => {
      const preferences = {
        theme: 'light',
        language: 'fr',
        notifications: {
          email: false,
          push: true,
          marketing: false
        },
        customFields: {
          department: 'Marketing',
          phoneNumber: '+1-555-123-4567'
        }
      }

      const request = createAuthenticatedRequest(
        'PATCH', 
        '/api/users/profile/preferences', 
        preferences, 
        testClerkUserId
      )
      
      const response = await PATCH(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user.preferences.theme).toBe('light')
      expect(data.user.preferences.language).toBe('fr')
      expect(data.user.preferences.notifications.email).toBe(false)
      expect(data.user.preferences.customFields.department).toBe('Marketing')
      expect(data.syncMetadata).toBeDefined()
      expect(data.message).toBe('Preferences updated successfully')
    })

    it('should validate custom fields by default', async () => {
      const preferences = {
        customFields: {
          invalidField: 'value', // Should fail validation
          phoneNumber: 'invalid-phone' // Should fail pattern validation
        }
      }

      const request = createAuthenticatedRequest(
        'PATCH', 
        '/api/users/profile/preferences', 
        preferences, 
        testClerkUserId
      )
      
      const response = await PATCH(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Custom field validation failed')
    })

    it('should skip validation when disabled', async () => {
      const preferences = {
        customFields: {
          invalidField: 'value' // Should pass when validation is disabled
        }
      }

      const request = createAuthenticatedRequest(
        'PATCH', 
        '/api/users/profile/preferences?validate=false', 
        preferences, 
        testClerkUserId
      )
      
      const response = await PATCH(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.user.preferences.customFields.invalidField).toBe('value')
    })

    it('should return 400 for invalid preferences data', async () => {
      const invalidPreferences = {
        theme: 'invalid-theme', // Should fail enum validation
        notifications: 'not-an-object' // Should fail object validation
      }

      const request = createAuthenticatedRequest(
        'PATCH', 
        '/api/users/profile/preferences', 
        invalidPreferences, 
        testClerkUserId
      )
      
      const response = await PATCH(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('Admin User Management API', () => {
    describe('GET /api/admin/users/[clerkUserId]', () => {
      it('should return user details with analytics for admin', async () => {
        const request = createAdminRequest(
          'GET', 
          `/api/admin/users/${testClerkUserId}`, 
          null, 
          'admin-user-1',
          'test-org-1'
        )
        
        const response = await AdminGET(request, { params: { clerkUserId: testClerkUserId } })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.user).toBeDefined()
        expect(data.analytics).toBeDefined()
        expect(data.analytics).toHaveProperty('signInCount')
        expect(data.analytics).toHaveProperty('accountAge')
        expect(data.memberships).toBeDefined()
      })

      it('should return 401 for unauthenticated request', async () => {
        const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}`)
        
        const response = await AdminGET(request, { params: { clerkUserId: testClerkUserId } })
        
        expect(response.status).toBe(401)
      })

      it('should return 403 for non-admin user', async () => {
        const request = createAuthenticatedRequest(
          'GET', 
          `/api/admin/users/${testClerkUserId}`, 
          null, 
          'regular-user-1'
        )
        
        const response = await AdminGET(request, { params: { clerkUserId: testClerkUserId } })
        
        expect(response.status).toBe(403)
      })

      it('should return 404 for non-existent user', async () => {
        const request = createAdminRequest(
          'GET', 
          '/api/admin/users/nonexistent-user', 
          null, 
          'admin-user-1',
          'test-org-1'
        )
        
        const response = await AdminGET(request, { params: { clerkUserId: 'nonexistent-user' } })
        
        expect(response.status).toBe(404)
      })
    })

    describe('PATCH /api/admin/users/[clerkUserId]/status', () => {
      it('should update user status for admin', async () => {
        const statusData = {
          status: 'suspended',
          reason: 'Policy violation'
        }

        const request = createAdminRequest(
          'PATCH', 
          `/api/admin/users/${testClerkUserId}/status`, 
          statusData, 
          'admin-user-1',
          'test-org-1'
        )
        
        const response = await AdminPATCH(request, { params: { clerkUserId: testClerkUserId } })
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.user.preferences.accountStatus).toBe('suspended')
        expect(data.user.preferences.statusReason).toBe('Policy violation')
        expect(data.user.preferences.statusUpdatedBy).toBe('admin-user-1')
        expect(data.syncMetadata).toBeDefined()
        expect(data.message).toBe('User status updated to suspended')
      })

      it('should return 400 for invalid status', async () => {
        const invalidStatusData = {
          status: 'invalid-status'
        }

        const request = createAdminRequest(
          'PATCH', 
          `/api/admin/users/${testClerkUserId}/status`, 
          invalidStatusData, 
          'admin-user-1',
          'test-org-1'
        )
        
        const response = await AdminPATCH(request, { params: { clerkUserId: testClerkUserId } })
        const data = await response.json()
        
        expect(response.status).toBe(400)
        expect(data.error).toBe('Validation failed')
      })

      it('should return 401 for unauthenticated request', async () => {
        const request = new NextRequest(`http://localhost/api/admin/users/${testClerkUserId}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'suspended' })
        })
        
        const response = await AdminPATCH(request, { params: { clerkUserId: testClerkUserId } })
        
        expect(response.status).toBe(401)
      })

      it('should return 403 for non-admin user', async () => {
        const request = createAuthenticatedRequest(
          'PATCH', 
          `/api/admin/users/${testClerkUserId}/status`, 
          { status: 'suspended' }, 
          'regular-user-1'
        )
        
        const response = await AdminPATCH(request, { params: { clerkUserId: testClerkUserId } })
        
        expect(response.status).toBe(403)
      })

      it('should return 404 for non-existent user', async () => {
        const request = createAdminRequest(
          'PATCH', 
          '/api/admin/users/nonexistent-user/status', 
          { status: 'suspended' }, 
          'admin-user-1',
          'test-org-1'
        )
        
        const response = await AdminPATCH(request, { params: { clerkUserId: 'nonexistent-user' } })
        
        expect(response.status).toBe(400)
      })
    })
  })
})