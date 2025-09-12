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

describe('/api/memberships', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/memberships/invite', () => {
    it('should invite user successfully', async () => {
      const inviteData = {
        organizationId: 'org-123',
        email: 'newuser@example.com',
        roleId: 'role-member'
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
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock RBAC service
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValue(true)

      // Mock membership service
      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.inviteUser).mockResolvedValue({
        data: {
          id: 'invitation-123',
          organizationId: inviteData.organizationId,
          email: inviteData.email,
          roleId: inviteData.roleId,
          invitedBy: 'user-123',
          token: 'invitation-token',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const inviteHandler = async (request: NextRequest) => {
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

          // Check permissions
          const { rbacService } = await import('@/lib/services/rbac-service')
          const hasPermission = await rbacService.hasPermission(
            userResult.data!.id,
            body.organizationId,
            'members.invite'
          )

          if (!hasPermission) {
            return Response.json(
              { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } },
              { status: 403 }
            )
          }

          const { membershipService } = await import('@/lib/services/membership-service')
          const result = await membershipService.inviteUser(
            body.organizationId,
            body.email,
            body.roleId
          )
          
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

      const request = new NextRequest('http://localhost:3000/api/memberships/invite', {
        method: 'POST',
        body: JSON.stringify(inviteData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await inviteHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(inviteData.email)
      expect(data.data.status).toBe('pending')
    })

    it('should return 403 for insufficient permissions', async () => {
      const inviteData = {
        organizationId: 'org-123',
        email: 'newuser@example.com',
        roleId: 'role-member'
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
          email: 'member@example.com',
          firstName: 'Member',
          lastName: 'User',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock RBAC service - no permission
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValue(false)

      const inviteHandler = async (request: NextRequest) => {
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

          // Check permissions
          const { rbacService } = await import('@/lib/services/rbac-service')
          const hasPermission = await rbacService.hasPermission(
            userResult.data!.id,
            body.organizationId,
            'members.invite'
          )

          if (!hasPermission) {
            return Response.json(
              { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } },
              { status: 403 }
            )
          }

          return Response.json({ success: true })
        } catch (error) {
          return Response.json(
            { success: false, error: { code: 'INVALID_JSON' } },
            { status: 400 }
          )
        }
      }

      const request = new NextRequest('http://localhost:3000/api/memberships/invite', {
        method: 'POST',
        body: JSON.stringify(inviteData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await inviteHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('PUT /api/memberships/[userId]/role', () => {
    it('should update member role successfully', async () => {
      const userId = 'user-456'
      const updateData = {
        organizationId: 'org-123',
        roleId: 'role-admin'
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
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock RBAC service
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValue(true)

      // Mock membership service
      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.updateMemberRole).mockResolvedValue({
        data: {
          id: 'membership-123',
          userId,
          organizationId: updateData.organizationId,
          roleId: updateData.roleId,
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const updateRoleHandler = async (request: NextRequest, { params }: { params: { userId: string } }) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId: clerkUserId } = auth()
        
        if (!clerkUserId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        try {
          const body = await request.json()
          
          const { userService } = await import('@/lib/services/user-service')
          const userResult = await userService.getUserByClerkId(clerkUserId)
          
          if (userResult.error) {
            return Response.json(
              { success: false, error: { code: userResult.code } },
              { status: 500 }
            )
          }

          // Check permissions
          const { rbacService } = await import('@/lib/services/rbac-service')
          const hasPermission = await rbacService.hasPermission(
            userResult.data!.id,
            body.organizationId,
            'members.manage'
          )

          if (!hasPermission) {
            return Response.json(
              { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } },
              { status: 403 }
            )
          }

          const { membershipService } = await import('@/lib/services/membership-service')
          const result = await membershipService.updateMemberRole(
            body.organizationId,
            params.userId,
            body.roleId
          )
          
          if (result.error) {
            return Response.json(
              { success: false, error: { code: result.code, message: result.error } },
              { status: 400 }
            )
          }

          return Response.json({ success: true, data: result.data })
        } catch (error) {
          return Response.json(
            { success: false, error: { code: 'INVALID_JSON' } },
            { status: 400 }
          )
        }
      }

      const request = new NextRequest(`http://localhost:3000/api/memberships/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await updateRoleHandler(request, { params: { userId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.roleId).toBe(updateData.roleId)
    })
  })

  describe('DELETE /api/memberships/[userId]', () => {
    it('should remove member successfully', async () => {
      const userId = 'user-456'
      const organizationId = 'org-123'

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserByClerkId).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock RBAC service
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValue(true)

      // Mock membership service
      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.removeMember).mockResolvedValue({
        data: undefined
      })

      const removeMemberHandler = async (request: NextRequest, { params }: { params: { userId: string } }) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId: clerkUserId } = auth()
        
        if (!clerkUserId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const organizationId = url.searchParams.get('organizationId')

        if (!organizationId) {
          return Response.json(
            { success: false, error: { code: 'MISSING_ORGANIZATION_ID' } },
            { status: 400 }
          )
        }

        const { userService } = await import('@/lib/services/user-service')
        const userResult = await userService.getUserByClerkId(clerkUserId)
        
        if (userResult.error) {
          return Response.json(
            { success: false, error: { code: userResult.code } },
            { status: 500 }
          )
        }

        // Check permissions
        const { rbacService } = await import('@/lib/services/rbac-service')
        const hasPermission = await rbacService.hasPermission(
          userResult.data!.id,
          organizationId,
          'members.manage'
        )

        if (!hasPermission) {
          return Response.json(
            { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } },
            { status: 403 }
          )
        }

        const { membershipService } = await import('@/lib/services/membership-service')
        const result = await membershipService.removeMember(organizationId, params.userId)
        
        if (result.error) {
          return Response.json(
            { success: false, error: { code: result.code, message: result.error } },
            { status: 400 }
          )
        }

        return new Response(null, { status: 204 })
      }

      const request = new NextRequest(`http://localhost:3000/api/memberships/${userId}?organizationId=${organizationId}`, {
        method: 'DELETE'
      })
      
      const response = await removeMemberHandler(request, { params: { userId } })

      expect(response.status).toBe(204)
    })
  })

  describe('GET /api/memberships', () => {
    it('should return organization members', async () => {
      const organizationId = 'org-123'

      // Mock Clerk authentication
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockReturnValue({ userId: 'clerk_123' })

      // Mock user service
      const { userService } = await import('@/lib/services/user-service')
      vi.mocked(userService.getUserByClerkId).mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock RBAC service
      const { rbacService } = await import('@/lib/services/rbac-service')
      vi.mocked(rbacService.hasPermission).mockResolvedValue(true)

      // Mock membership service
      const { membershipService } = await import('@/lib/services/membership-service')
      vi.mocked(membershipService.getOrganizationMembers).mockResolvedValue({
        data: [
          {
            id: 'membership-1',
            userId: 'user-1',
            organizationId,
            roleId: 'role-admin',
            status: 'active',
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User'
            },
            role: {
              id: 'role-admin',
              name: 'Admin'
            }
          }
        ]
      })

      const getMembersHandler = async (request: NextRequest) => {
        const { auth } = await import('@clerk/nextjs/server')
        const { userId } = auth()
        
        if (!userId) {
          return Response.json(
            { success: false, error: { code: 'AUTHENTICATION_REQUIRED' } },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const organizationId = url.searchParams.get('organizationId')

        if (!organizationId) {
          return Response.json(
            { success: false, error: { code: 'MISSING_ORGANIZATION_ID' } },
            { status: 400 }
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

        // Check permissions
        const { rbacService } = await import('@/lib/services/rbac-service')
        const hasPermission = await rbacService.hasPermission(
          userResult.data!.id,
          organizationId,
          'members.read'
        )

        if (!hasPermission) {
          return Response.json(
            { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } },
            { status: 403 }
          )
        }

        const { membershipService } = await import('@/lib/services/membership-service')
        const result = await membershipService.getOrganizationMembers(organizationId)
        
        if (result.error) {
          return Response.json(
            { success: false, error: { code: result.code } },
            { status: 500 }
          )
        }

        return Response.json({ success: true, data: result.data })
      }

      const request = new NextRequest(`http://localhost:3000/api/memberships?organizationId=${organizationId}`)
      
      const response = await getMembersHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].user.email).toBe('admin@example.com')
    })
  })
})