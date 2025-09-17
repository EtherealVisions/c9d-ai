/**
 * Organization Service Unit Tests
 * Tests all organization service methods with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/models/database')
vi.mock('@/lib/services/security-audit-service')
vi.mock('@/lib/middleware/tenant-isolation')

// Import after mocking
import { organizationService } from '@/lib/services/organization-service'

describe('OrganizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Test Organization',
        description: 'A test organization'
      }

      const createdOrg = {
        id: 'org-123',
        name: orgData.name,
        description: orgData.description,
        slug: 'test-organization',
        avatarUrl: undefined,
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(organizationService['db'], 'createOrganization').mockResolvedValue(createdOrg)
      vi.spyOn(organizationService['db'], 'createAuditLog').mockResolvedValue({
        id: 'audit-1',
        userId,
        organizationId: createdOrg.id,
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: createdOrg.id,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      })
      vi.spyOn(organizationService as any, 'generateUniqueSlug').mockResolvedValue('test-organization')

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toEqual(createdOrg)
      expect(result.error).toBeUndefined()
      expect(organizationService['db'].createAuditLog).toHaveBeenCalled()
    })

    it('should handle duplicate organization names', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Existing Organization'
      }

      const DatabaseError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      vi.spyOn(organizationService as any, 'generateUniqueSlug').mockResolvedValue('existing-organization')
      vi.spyOn(organizationService['db'], 'createOrganization').mockRejectedValue(
        new DatabaseError('duplicate key value violates unique constraint')
      )

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization name or slug already exists')
      expect(result.code).toBe('DUPLICATE_ORGANIZATION')
    })

    it('should handle validation errors', async () => {
      const userId = 'user-123'
      const invalidOrgData = {
        name: '' // Invalid empty name
      }

      const ValidationError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'ValidationError'
        }
      }

      vi.spyOn(organizationService['db'], 'createOrganization').mockRejectedValue(
        new ValidationError('Organization name is required')
      )

      const result = await organizationService.createOrganization(userId, invalidOrgData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization name is required')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('getOrganization', () => {
    it('should return organization when found and user has access', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'

      const mockOrg = {
        id: orgId,
        name: 'Test Organization',
        description: 'A test organization',
        slug: 'test-organization',
        avatarUrl: undefined,
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock tenant access validation
      const { validateServiceTenantAccess } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(validateServiceTenantAccess).mockResolvedValue(true)

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(mockOrg)

      const result = await organizationService.getOrganization(orgId, userId)

      expect(result.data).toEqual(mockOrg)
      expect(result.error).toBeUndefined()
    })

    it('should deny access when user lacks permissions', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'

      // Mock tenant access validation failure
      const { validateServiceTenantAccess } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(validateServiceTenantAccess).mockResolvedValue(false)

      const result = await organizationService.getOrganization(orgId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Access denied to organization')
      expect(result.code).toBe('TENANT_ACCESS_DENIED')
    })

    it('should return error when organization not found', async () => {
      const orgId = 'nonexistent-org'
      const userId = 'user-123'

      const { validateServiceTenantAccess } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(validateServiceTenantAccess).mockResolvedValue(true)

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(null)

      const result = await organizationService.getOrganization(orgId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'
      const updateData = {
        name: 'Updated Organization',
        description: 'Updated description'
      }

      const existingOrg = {
        id: orgId,
        name: 'Original Organization',
        description: 'Original description',
        slug: 'original-organization',
        avatarUrl: undefined,
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedOrg = {
        ...existingOrg,
        ...updateData,
        updatedAt: new Date()
      }

      // Mock tenant access validation
      const { validateServiceTenantAccess } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(validateServiceTenantAccess).mockResolvedValue(true)

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(existingOrg)
      vi.spyOn(organizationService['db'], 'updateOrganization').mockResolvedValue(updatedOrg)

      const result = await organizationService.updateOrganization(orgId, userId, updateData)

      expect(result.data).toEqual(updatedOrg)
      expect(result.error).toBeUndefined()
    })

    it('should deny update without proper permissions', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'
      const updateData = { name: 'Unauthorized Update' }

      // Mock tenant access validation failure
      const { validateServiceTenantAccess } = await import('@/lib/middleware/tenant-isolation')
      vi.mocked(validateServiceTenantAccess).mockResolvedValue(false)

      const result = await organizationService.updateOrganization(orgId, userId, updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Access denied to organization')
      expect(result.code).toBe('TENANT_ACCESS_DENIED')
    })
  })

  describe('updateOrganizationMetadata', () => {
    it('should update organization metadata successfully', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'
      const metadata = {
        industry: 'Technology',
        companySize: '50-100',
        customFields: {
          department: 'Engineering'
        }
      }

      const existingOrg = {
        id: orgId,
        name: 'Test Organization',
        description: 'A test organization',
        slug: 'test-organization',
        avatarUrl: undefined,
        metadata: { existingField: 'value' },
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedOrg = {
        ...existingOrg,
        metadata: {
          ...existingOrg.metadata,
          ...metadata
        },
        updatedAt: new Date()
      }

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(existingOrg)
      vi.spyOn(organizationService['db'], 'updateOrganization').mockResolvedValue(updatedOrg)
      vi.spyOn(organizationService['db'], 'createAuditLog').mockResolvedValue({
        id: 'audit-2',
        userId,
        organizationId: orgId,
        action: 'organization.metadata_updated',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const result = await organizationService.updateOrganizationMetadata(orgId, userId, metadata)

      expect(result.data?.metadata.industry).toBe('Technology')
      expect(result.data?.metadata.existingField).toBe('value') // Should preserve existing
      expect(organizationService['db'].createAuditLog).toHaveBeenCalled()
    })
  })

  describe('updateOrganizationSettings', () => {
    it('should update organization settings successfully', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'
      const settings = {
        allowPublicInvites: false,
        defaultRole: 'member',
        dataRetentionDays: 90
      }

      const existingOrg = {
        id: orgId,
        name: 'Test Organization',
        description: 'A test organization',
        slug: 'test-organization',
        avatarUrl: undefined,
        metadata: {},
        settings: { existingSetting: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedOrg = {
        ...existingOrg,
        settings: {
          ...existingOrg.settings,
          ...settings
        },
        updatedAt: new Date()
      }

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(existingOrg)
      vi.spyOn(organizationService['db'], 'updateOrganization').mockResolvedValue(updatedOrg)
      vi.spyOn(organizationService['db'], 'createAuditLog').mockResolvedValue({
        id: 'audit-3',
        userId,
        organizationId: orgId,
        action: 'organization.settings_updated',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const result = await organizationService.updateOrganizationSettings(orgId, userId, settings)

      expect(result.data?.settings.allowPublicInvites).toBe(false)
      expect(result.data?.settings.existingSetting).toBe(true) // Should preserve existing
    })
  })

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      const userId = 'user-123'
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Organization 1',
          slug: 'org-1',
          description: undefined,
          avatarUrl: undefined,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          slug: 'org-2',
          description: undefined,
          avatarUrl: undefined,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.spyOn(organizationService['db'], 'getUserOrganizations').mockResolvedValue(mockOrganizations)

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.data).toEqual(mockOrganizations)
      expect(result.data).toHaveLength(2)
    })

    it('should handle empty organization list', async () => {
      const userId = 'user-123'

      vi.spyOn(organizationService['db'], 'getUserOrganizations').mockResolvedValue([])

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })
  })

  describe('isOrganizationActive', () => {
    it('should return true for active organization', async () => {
      const orgId = 'org-123'

      const activeOrg = {
        id: orgId,
        name: 'Active Organization',
        description: 'An active organization',
        slug: 'active-organization',
        avatarUrl: undefined,
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(activeOrg)

      const result = await organizationService.isOrganizationActive(orgId)

      expect(result.data).toBe(true)
    })

    it('should return false for deleted organization', async () => {
      const orgId = 'org-123'

      const deletedOrg = {
        id: orgId,
        name: 'Deleted Organization',
        description: 'A deleted organization',
        slug: 'deleted-organization',
        avatarUrl: undefined,
        metadata: { 
          deleted: true,
          deletedAt: new Date().toISOString()
        },
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(organizationService['db'], 'getOrganization').mockResolvedValue(deletedOrg)

      const result = await organizationService.isOrganizationActive(orgId)

      expect(result.data).toBe(false)
    })
  })

  describe('generateUniqueSlug', () => {
    it('should generate slug from organization name', async () => {
      const orgName = 'My Great Organization!'

      vi.spyOn(organizationService as any, 'isSlugTaken').mockResolvedValue(false)

      const slug = await (organizationService as any).generateUniqueSlug(orgName)

      expect(slug).toBe('my-great-organization')
    })

    it('should append counter for duplicate slugs', async () => {
      const orgName = 'Duplicate Organization'

      vi.spyOn(organizationService as any, 'isSlugTaken')
        .mockResolvedValueOnce(true)  // First slug is taken
        .mockResolvedValueOnce(false) // Second slug is available

      const slug = await (organizationService as any).generateUniqueSlug(orgName)

      expect(slug).toBe('duplicate-organization-1')
    })

    it('should handle empty organization name', async () => {
      const orgName = '!@#$%' // Only special characters

      vi.spyOn(organizationService as any, 'isSlugTaken').mockResolvedValue(false)

      const slug = await (organizationService as any).generateUniqueSlug(orgName)

      expect(slug).toBe('organization')
    })
  })
})