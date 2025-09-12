/**
 * Organizations API Route Tests
 * Tests the /api/organizations endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock external dependencies
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/services/organization-service')
vi.mock('@/lib/services/user-service')
vi.mock('@/lib/services/rbac-service')

describe('/api/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
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

      // Mock organization service
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue({
        data: [
          {
            id: 'org-1',
            name: 'Organization 1',
            slug: 'org-1',
            description: null,
            avatarUrl: null,
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'org-2',
            name: 'Organization 2',
            slug: 'org-2',
            description: null,
            avatarUrl: null,
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      })

      // Mock the organizations API route
      const organizationsHandler = async (request: NextRequest) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const { userService } = await import('@/lib/services/user-service')
        const userResult = await userService.getUserByClerkId(userId)
        
        if (userResult.error) {
          return Response.json(
            { success: false, error: { code: userResult.code } },
            { status: 500 }
          )
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        const result = await organizationService.getUserOrganizations(userResult.data!.id)
        
        if (result.error) {
          return Response.json(
            { success: false, error: { code: result.code } },
            { status: 500 }
          )
        }

        return Response.json({ success: true, data: result.data })
      }

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await organizationsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('Organization 1')
    })

    it('should return 401 when user not authenticated', async () => {
      // Mock unauthenticated state
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: null })

      const organizationsHandler = async (request: NextRequest) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        return Response.json({ success: true, data: [] })
      }

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await organizationsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AUTHENTICATION_REQUIRED')
    })
  })

  describe('POST /api/organizations', () => {
    it('should create organization successfully', async () => {
      const orgData = {
        name: 'New Organization',
        description: 'A new organization for testing'
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

      // Mock organization service
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.createOrganization).mockResolvedValue({
        data: {
          id: 'org-123',
          name: orgData.name,
          description: orgData.description,
          slug: 'new-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const createOrganizationHandler = async (request: NextRequest) => {
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

          const { organizationService } = await import('@/lib/services/organization-service')
          const result = await organizationService.createOrganization(userResult.data!.id, body)
          
          if (result.error) {
            return Response.json(
              { success: false, error: { code: result.code } },
              { status: 400 }
            )
          }

          return Response.json({ success: true, data: result.data }, { status: 201 })
        } catch (error) {
          return Response.json(
            { success: false, error: { code: 'INVALID_JSON' } },
            { status: 400 }
          )
        }
      }

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await createOrganizationHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('New Organization')
      expect(data.data.slug).toBe('new-organization')
    })

    it('should return 400 for invalid organization data', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        description: 'A' // Too short
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

      // Mock organization service validation error
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.createOrganization).mockResolvedValue({
        error: 'Validation failed: Organization name is required',
        code: 'VALIDATION_ERROR'
      })

      const createOrganizationHandler = async (request: NextRequest) => {
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

          const { organizationService } = await import('@/lib/services/organization-service')
          const result = await organizationService.createOrganization(userResult.data!.id, body)
          
          if (result.error) {
            return Response.json(
              { success: false, error: { code: result.code, message: result.error } },
              { status: 400 }
            )
          }

          return Response.json({ success: true, data: result.data }, { status: 201 })
        } catch (error) {
          return Response.json(
            { success: false, error: { code: 'INVALID_JSON' } },
            { status: 400 }
          )
        }
      }

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await createOrganizationHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/organizations/[id]', () => {
    it('should return organization details', async () => {
      const orgId = 'org-123'

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

      // Mock organization service
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.getOrganization).mockResolvedValue({
        data: {
          id: orgId,
          name: 'Test Organization',
          description: 'A test organization',
          slug: 'test-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const getOrganizationHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const { userService } = await import('@/lib/services/user-service')
        const userResult = await userService.getUserByClerkId(userId)
        
        if (userResult.error) {
          return Response.json(
            { success: false, error: { code: userResult.code } },
            { status: 500 }
          )
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        const result = await organizationService.getOrganization(params.id, userResult.data!.id)
        
        if (result.error) {
          const status = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
          return Response.json(
            { success: false, error: { code: result.code } },
            { status }
          )
        }

        return Response.json({ success: true, data: result.data })
      }

      const request = new NextRequest(`http://localhost:3000/api/organizations/${orgId}`)
      const response = await getOrganizationHandler(request, { params: { id: orgId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(orgId)
      expect(data.data.name).toBe('Test Organization')
    })

    it('should return 404 for non-existent organization', async () => {
      const orgId = 'nonexistent-org'

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

      // Mock organization service not found
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.getOrganization).mockResolvedValue({
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      })

      const getOrganizationHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const { userService } = await import('@/lib/services/user-service')
        const userResult = await userService.getUserByClerkId(userId)
        
        if (userResult.error) {
          return Response.json(
            { success: false, error: { code: userResult.code } },
            { status: 500 }
          )
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        const result = await organizationService.getOrganization(params.id, userResult.data!.id)
        
        if (result.error) {
          const status = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
          return Response.json(
            { success: false, error: { code: result.code } },
            { status }
          )
        }

        return Response.json({ success: true, data: result.data })
      }

      const request = new NextRequest(`http://localhost:3000/api/organizations/${orgId}`)
      const response = await getOrganizationHandler(request, { params: { id: orgId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('ORGANIZATION_NOT_FOUND')
    })

    it('should return 403 for access denied', async () => {
      const orgId = 'restricted-org'

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

      // Mock organization service access denied
      const { organizationService } = await import('@/lib/services/organization-service')
      vi.mocked(organizationService.getOrganization).mockResolvedValue({
        error: 'Access denied to organization',
        code: 'TENANT_ACCESS_DENIED'
      })

      const getOrganizationHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const { userService } = await import('@/lib/services/user-service')
        const userResult = await userService.getUserByClerkId(userId)
        
        if (userResult.error) {
          return Response.json(
            { success: false, error: { code: userResult.code } },
            { status: 500 }
          )
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        const result = await organizationService.getOrganization(params.id, userResult.data!.id)
        
        if (result.error) {
          const status = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
          return Response.json(
            { success: false, error: { code: result.code } },
            { status }
          )
        }

        return Response.json({ success: true, data: result.data })
      }

      const request = new NextRequest(`http://localhost:3000/api/organizations/${orgId}`)
      const response = await getOrganizationHandler(request, { params: { id: orgId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('TENANT_ACCESS_DENIED')
    })
  })
})