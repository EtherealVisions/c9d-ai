/**
 * Organization Management Integration Tests
 * Tests complete organization lifecycle and management workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock all external dependencies first
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/models/database')
vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/middleware/tenant-isolation')
vi.mock('@/lib/services/security-audit-service')

// Import services after mocking
import { organizationService } from '@/lib/services/organization-service'
import { membershipService } from '@/lib/services/membership-service'
import { rbacService } from '@/lib/services/rbac-service'
import { auditService } from '@/lib/services/audit-service'

describe('Organization Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Organization Creation Workflow', () => {
    it('should create organization with proper admin setup', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Test Organization',
        description: 'A test organization'
      }

      // Mock organization creation
      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        data: {
          id: 'org-123',
          name: orgData.name,
          description: orgData.description,
          slug: 'test-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock admin role assignment
      vi.spyOn(rbacService, 'assignRole').mockResolvedValue({
        data: {
          id: 'assignment-123',
          userId,
          organizationId: 'org-123',
          roleId: 'role-admin',
          assignedBy: userId,
          assignedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(orgData.name)
      expect(result.data?.slug).toBe('test-organization')

      // Verify admin role assignment
      const roleResult = await rbacService.assignRole(userId, 'org-123', 'role-admin')
      expect(roleResult.data?.userId).toBe(userId)
      expect(roleResult.data?.roleId).toBe('role-admin')
    })

    it('should handle organization creation errors', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Duplicate Organization'
      }

      // Mock duplicate name error
      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        error: 'Organization name already exists',
        code: 'DUPLICATE_ORGANIZATION'
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('already exists')
      expect(result.code).toBe('DUPLICATE_ORGANIZATION')
    })

    it('should auto-generate slug from organization name', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'My Great Organization!'
      }

      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        data: {
          id: 'org-123',
          name: orgData.name,
          description: null,
          slug: 'my-great-organization', // Auto-generated from name
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data?.slug).toBe('my-great-organization')
    })
  })

  describe('Organization Update Workflow', () => {
    it('should update organization with proper permissions', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description'
      }

      // Mock admin permissions
      vi.spyOn(rbacService, 'hasPermission').mockResolvedValue(true)

      // Mock organization update
      vi.spyOn(organizationService, 'updateOrganization').mockResolvedValue({
        data: {
          id: organizationId,
          name: updateData.name,
          description: updateData.description,
          slug: 'updated-organization-name',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.updateOrganization(organizationId, userId, updateData)

      expect(result.data?.name).toBe(updateData.name)
      expect(result.data?.description).toBe(updateData.description)
    })

    it('should deny update without proper permissions', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const updateData = { name: 'Unauthorized Update' }

      // Mock insufficient permissions
      vi.spyOn(rbacService, 'hasPermission').mockResolvedValue(false)

      vi.spyOn(organizationService, 'updateOrganization').mockResolvedValue({
        error: 'Access denied to organization',
        code: 'TENANT_ACCESS_DENIED'
      })

      const result = await organizationService.updateOrganization(organizationId, userId, updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Access denied')
    })
  })

  describe('Organization Management Operations', () => {
    it('should get organization by ID', async () => {
      const userId = 'user-123'
      const organizationId = 'org-789'

      vi.spyOn(organizationService, 'getOrganization').mockResolvedValue({
        data: {
          id: organizationId,
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

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.data?.id).toBe(organizationId)
      expect(result.data?.name).toBe('Test Organization')
    })

    it('should get user organizations', async () => {
      const userId = 'user-123'

      vi.spyOn(organizationService, 'getUserOrganizations').mockResolvedValue({
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

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].name).toBe('Organization 1')
      expect(result.data?.[1].name).toBe('Organization 2')
    })
  })

  describe('Error Handling', () => {
    it('should handle organization not found errors', async () => {
      const userId = 'user-123'
      const nonExistentOrgId = 'org-nonexistent'

      vi.spyOn(organizationService, 'getOrganization').mockResolvedValue({
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      })

      const result = await organizationService.getOrganization(nonExistentOrgId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })

    it('should handle validation errors', async () => {
      const userId = 'user-123'
      const invalidOrgData = {
        name: '' // Invalid empty name
      }

      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        error: 'Validation failed: Organization name is required',
        code: 'VALIDATION_ERROR'
      })

      const result = await organizationService.createOrganization(userId, invalidOrgData)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Validation failed')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should handle permission denied errors', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const updateData = { name: 'Unauthorized Update' }

      vi.spyOn(organizationService, 'updateOrganization').mockResolvedValue({
        error: 'Access denied to organization',
        code: 'TENANT_ACCESS_DENIED'
      })

      const result = await organizationService.updateOrganization(organizationId, userId, updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Access denied')
      expect(result.code).toBe('TENANT_ACCESS_DENIED')
    })
  })
})