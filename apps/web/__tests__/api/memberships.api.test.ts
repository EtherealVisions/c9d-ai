/**
 * Memberships API Route Tests
 * Tests the /api/memberships endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock external dependencies
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/services/membership-service')
vi.mock('@/lib/services/user-service')
vi.mock('@/lib/services/rbac-service')

// Import the actual route handlers
import { GET, POST } from '@/app/api/memberships/route'

describe('Memberships API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/memberships', () => {
    it('should successfully create a membership', async () => {
      const membershipData = {
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-member'
      }

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any)

      // Mock membership service
      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.createMembership).mockResolvedValue({
        data: {
          id: 'membership-123',
          userId: membershipData.userId,
          organizationId: membershipData.organizationId,
          roleId: membershipData.roleId,
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        error: undefined
      })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify(membershipData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData).toHaveProperty('id', 'membership-123')
    })

    it('should return 401 when user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid data', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any)

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
    })
  })

  describe('GET /api/memberships', () => {
    it('should return organization members when organizationId is provided', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any)

      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.getOrganizationMembers).mockResolvedValue({
        data: [
          {
            id: 'membership-1',
            userId: 'user-1',
            organizationId: 'org-123',
            roleId: 'role-admin',
            status: 'active',
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        error: undefined
      })

      const request = new NextRequest('http://localhost:3000/api/memberships?organizationId=org-123', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toHaveLength(1)
      expect(responseData[0]).toHaveProperty('id', 'membership-1')
    })

    it('should return 401 when user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new NextRequest('http://localhost:3000/api/memberships?organizationId=org-123', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 when no query parameters provided', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any)

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Either organizationId or userId query parameter is required')
    })
  })
})