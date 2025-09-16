/**
 * Organizations API Route Tests
 * Tests the /api/organizations endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock external dependencies
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/services/organization-service')
vi.mock('@/lib/services/user-service')
vi.mock('@/lib/services/rbac-service')
vi.mock('@/lib/services/security-audit-service')
vi.mock('@/lib/middleware/tenant-isolation')

// Import the actual route handlers
import { GET, POST } from '@/app/api/organizations/route'

describe('Organizations API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      // Mock tenant isolation middleware
      const { tenantIsolation } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(tenantIsolation.authenticated).mockReturnValue(() => async (request: any) => {
        const mockRequest = {
          ...request,
          user: {
            id: 'user-123',
            clerkUserId: 'clerk_123',
            email: 'user@example.com'
          }
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        vi.mocked(organizationService.getUserOrganizations).mockResolvedValue({
          data: [
            {
              id: 'org-1',
              name: 'Test Organization',
              slug: 'test-org',
              description: 'Test description',
              avatarUrl: undefined,
              metadata: {},
              settings: {},
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          error: undefined
        })

        const result = await organizationService.getUserOrganizations(mockRequest.user.id)
        
        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.data, { status: 200 })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toHaveLength(1)
      expect(responseData[0]).toHaveProperty('id', 'org-1')
    })

    it('should return 401 when user is not authenticated', async () => {
      const { tenantIsolation } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(tenantIsolation.authenticated).mockReturnValue(() => async () => {
        return NextResponse.json({ error: 'User not found' },{ status: 401 })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('User not found')
    })
  })

  describe('POST /api/organizations', () => {
    it('should successfully create an organization', async () => {
      const organizationData = {
        name: 'New Organization',
        slug: 'new-org',
        description: 'New organization description'
      }

      const { tenantIsolation } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(tenantIsolation.authenticated).mockReturnValue(() => async (request: any) => {
        const mockRequest = {
          ...request,
          user: {
            id: 'user-123',
            clerkUserId: 'clerk_123',
            email: 'user@example.com'
          }
        }

        const { organizationService } = await import('@/lib/services/organization-service')
        vi.mocked(organizationService.createOrganization).mockResolvedValue({
          data: {
            id: 'org-new',
            name: organizationData.name,
            slug: organizationData.slug,
            description: organizationData.description,
            avatarUrl: undefined,
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          error: undefined
        })

        const body = await request.json()
        const result = await organizationService.createOrganization(
          mockRequest.user.id,
          body
        )

        if (result.error) {
          return NextResponse.json({ error: result.error },{ status: 400 })
        }

        return NextResponse.json(result.data,{ status: 201 })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData).toHaveProperty('id', 'org-new')
      expect(responseData.name).toBe(organizationData.name)
    })

    it('should return 401 when user is not authenticated', async () => {
      const { tenantIsolation } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(tenantIsolation.authenticated).mockReturnValue(() => async () => {
        return NextResponse.json({ error: 'User not found' },{ status: 401 })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('User not found')
    })
  })
})