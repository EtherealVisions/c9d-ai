/**
 * Unit tests for OrganizationService
 * Tests all CRUD operations, slug generation, and error handling
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { OrganizationService } from '../organization-service'
import { createTypedSupabaseClient } from '../../models/database'
import { validateServiceTenantAccess } from '../../middleware/tenant-isolation'
import type { Organization } from '../../models/types'

// Mock the database client
vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: vi.fn(),
  TypedSupabaseClient: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public details?: any) {
      super(message)
      this.name = 'ValidationError'
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public code?: string, public details?: any) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} with id ${id} not found`)
      this.name = 'NotFoundError'
    }
  }
}))

// Mock the validation schemas
vi.mock('../../models/schemas', () => ({
  validateCreateOrganization: vi.fn((data) => data),
  validateUpdateOrganization: vi.fn((data) => data)
}))

// Mock the tenant isolation middleware
vi.mock('../../middleware/tenant-isolation', () => ({
  validateServiceTenantAccess: vi.fn(() => Promise.resolve(true))
}))

// Mock the security audit service
vi.mock('../security-audit-service', () => ({
  securityAuditService: {
    logOrganizationEvent: vi.fn(),
    logDataAccessEvent: vi.fn()
  }
}))

describe('OrganizationService', () => {
  let organizationService: OrganizationService
  let mockDb: any

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-organization',
    description: 'A test organization',
    avatarUrl: 'https://example.com/avatar.png',
    metadata: { industry: 'tech' },
    settings: { theme: 'dark' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockUser = {
    id: 'user-123',
    clerkUserId: 'clerk-123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock database client
    mockDb = {
      createOrganization: vi.fn(),
      getOrganization: vi.fn(),
      getOrganizationBySlug: vi.fn(),
      updateOrganization: vi.fn(),
      getUserOrganizations: vi.fn(),
      getOrganizationWithMembers: vi.fn(),
      createAuditLog: vi.fn()
    }

    // Mock the database client factory
    ;(createTypedSupabaseClient as Mock).mockReturnValue(mockDb)

    // Create service instance
    organizationService = new OrganizationService()
  })

  describe('createOrganization', () => {
    it('should create organization with generated slug', async () => {
      const createData = {
        name: 'My New Organization',
        description: 'A new organization',
        metadata: { type: 'startup' }
      }

      mockDb.getOrganizationBySlug.mockResolvedValue(null) // Slug is available
      mockDb.createOrganization.mockResolvedValue({
        ...mockOrganization,
        name: createData.name,
        slug: 'my-new-organization',
        description: createData.description,
        metadata: createData.metadata
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.createOrganization('user-123', createData)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(createData.name)
      expect(result.data?.slug).toBe('my-new-organization')
      expect(mockDb.createOrganization).toHaveBeenCalledWith({
        ...createData,
        slug: 'my-new-organization',
        metadata: createData.metadata,
        settings: {}
      })
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: result.data?.id,
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: result.data?.id,
        metadata: {
          organizationName: result.data?.name,
          slug: result.data?.slug
        }
      })
    })

    it('should generate unique slug when base slug is taken', async () => {
      const createData = {
        name: 'Test Organization'
      }

      // First slug is taken, second is available
      mockDb.getOrganizationBySlug
        .mockResolvedValueOnce(mockOrganization) // 'test-organization' is taken
        .mockResolvedValueOnce(null) // 'test-organization-1' is available

      mockDb.createOrganization.mockResolvedValue({
        ...mockOrganization,
        slug: 'test-organization-1'
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.createOrganization('user-123', createData)

      expect(result.error).toBeUndefined()
      expect(result.data?.slug).toBe('test-organization-1')
      expect(mockDb.getOrganizationBySlug).toHaveBeenCalledTimes(2)
    })

    it('should handle validation errors', async () => {
      const { validateCreateOrganization } = await import('../../models/schemas')
      const { ValidationError } = await import('../../models/database')
      ;(validateCreateOrganization as Mock).mockImplementation(() => {
        throw new ValidationError('Name is required')
      })

      const result = await organizationService.createOrganization('user-123', {})

      expect(result.error).toBe('Name is required')
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(mockDb.createOrganization).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const createData = { name: 'Test Org' }
      const { validateCreateOrganization } = await import('../../models/schemas')
      
      // Reset the validation mock to not throw
      ;(validateCreateOrganization as Mock).mockReturnValue(createData)
      
      mockDb.getOrganizationBySlug.mockResolvedValue(null)
      mockDb.createOrganization.mockRejectedValue(new Error('Database connection failed'))

      const result = await organizationService.createOrganization('user-123', createData)

      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('CREATE_ORGANIZATION_ERROR')
    })
  })

  describe('getOrganization', () => {
    it('should return organization when found', async () => {
      mockDb.getOrganization.mockResolvedValue(mockOrganization)

      const result = await organizationService.getOrganization('org-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockOrganization)
      expect(mockDb.getOrganization).toHaveBeenCalledWith('org-123', undefined)
    })

    it('should return error when organization not found', async () => {
      mockDb.getOrganization.mockResolvedValue(null)

      const result = await organizationService.getOrganization('nonexistent')

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
      expect(result.data).toBeUndefined()
    })

    it('should handle database errors', async () => {
      mockDb.getOrganization.mockRejectedValue(new Error('Database error'))

      const result = await organizationService.getOrganization('org-123')

      expect(result.error).toBe('Database error')
      expect(result.code).toBe('GET_ORGANIZATION_ERROR')
    })
  })

  describe('getOrganizationBySlug', () => {
    it('should return organization when found by slug', async () => {
      mockDb.getOrganizationBySlug.mockResolvedValue(mockOrganization)

      const result = await organizationService.getOrganizationBySlug('test-organization')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockOrganization)
      expect(mockDb.getOrganizationBySlug).toHaveBeenCalledWith('test-organization')
    })

    it('should return error when organization not found by slug', async () => {
      mockDb.getOrganizationBySlug.mockResolvedValue(null)

      const result = await organizationService.getOrganizationBySlug('nonexistent')

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Organization',
        description: 'Updated description'
      }

      mockDb.getOrganization.mockResolvedValue(mockOrganization)
      mockDb.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        ...updateData
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.updateOrganization('org-123', 'user-123', updateData)

      expect(result.error).toBeUndefined()
      expect(result.data?.name).toBe(updateData.name)
      expect(result.data?.description).toBe(updateData.description)
      expect(mockDb.updateOrganization).toHaveBeenCalledWith('org-123', updateData, 'user-123')
    })

    it('should return error when organization not found', async () => {
      // Mock tenant access to pass, but organization doesn't exist
      ;(validateServiceTenantAccess as Mock).mockResolvedValue(true)
      mockDb.getOrganization.mockResolvedValue(null)

      const result = await organizationService.updateOrganization('nonexistent', 'user-123', {})

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
      expect(mockDb.updateOrganization).not.toHaveBeenCalled()
    })
  })

  describe('updateOrganizationMetadata', () => {
    it('should merge and update metadata', async () => {
      const newMetadata = { department: 'engineering', size: 'large' }
      const expectedMergedMetadata = {
        ...mockOrganization.metadata,
        ...newMetadata
      }

      mockDb.getOrganization.mockResolvedValue(mockOrganization)
      mockDb.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        metadata: expectedMergedMetadata
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.updateOrganizationMetadata('org-123', 'user-123', newMetadata)

      expect(result.error).toBeUndefined()
      expect(result.data?.metadata).toEqual(expectedMergedMetadata)
      expect(mockDb.updateOrganization).toHaveBeenCalledWith('org-123', {
        metadata: expectedMergedMetadata
      })
    })

    it('should return error when organization not found', async () => {
      mockDb.getOrganization.mockResolvedValue(null)

      const result = await organizationService.updateOrganizationMetadata('nonexistent', 'user-123', {})

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('updateOrganizationSettings', () => {
    it('should merge and update settings', async () => {
      const newSettings = { notifications: true, language: 'en' }
      const expectedMergedSettings = {
        ...mockOrganization.settings,
        ...newSettings
      }

      mockDb.getOrganization.mockResolvedValue(mockOrganization)
      mockDb.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        settings: expectedMergedSettings
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.updateOrganizationSettings('org-123', 'user-123', newSettings)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(expectedMergedSettings)
      expect(mockDb.updateOrganization).toHaveBeenCalledWith('org-123', {
        settings: expectedMergedSettings
      })
    })
  })

  describe('deleteOrganization', () => {
    it('should soft delete organization by updating metadata', async () => {
      const deletedAt = new Date().toISOString()
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(deletedAt)

      mockDb.getOrganization.mockResolvedValue(mockOrganization)
      mockDb.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        metadata: {
          ...mockOrganization.metadata,
          deleted: true,
          deletedAt,
          deletedBy: 'user-123'
        }
      })
      mockDb.createAuditLog.mockResolvedValue({})

      const result = await organizationService.deleteOrganization('org-123', 'user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.metadata.deleted).toBe(true)
      expect(result.data?.metadata.deletedAt).toBe(deletedAt)
      expect(result.data?.metadata.deletedBy).toBe('user-123')
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        organizationId: 'org-123',
        action: 'organization.deleted',
        resourceType: 'organization',
        resourceId: 'org-123',
        metadata: {
          deletedAt,
          organizationName: mockOrganization.name
        }
      })
    })

    it('should return error when organization not found', async () => {
      mockDb.getOrganization.mockResolvedValue(null)

      const result = await organizationService.deleteOrganization('nonexistent', 'user-123')

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      const organizations = [mockOrganization]
      mockDb.getUserOrganizations.mockResolvedValue(organizations)

      const result = await organizationService.getUserOrganizations('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(organizations)
      expect(mockDb.getUserOrganizations).toHaveBeenCalledWith('user-123')
    })

    it('should handle database errors', async () => {
      mockDb.getUserOrganizations.mockRejectedValue(new Error('Database error'))

      const result = await organizationService.getUserOrganizations('user-123')

      expect(result.error).toBe('Database error')
      expect(result.code).toBe('GET_USER_ORGANIZATIONS_ERROR')
    })
  })

  describe('getOrganizationWithMembers', () => {
    it('should return organization with members', async () => {
      const orgWithMembers = {
        ...mockOrganization,
        memberships: [
          {
            id: 'membership-123',
            userId: 'user-123',
            organizationId: 'org-123',
            roleId: 'role-123',
            status: 'active',
            user: mockUser,
            role: { id: 'role-123', name: 'Admin' }
          }
        ]
      }

      mockDb.getOrganizationWithMembers.mockResolvedValue(orgWithMembers)

      const result = await organizationService.getOrganizationWithMembers('org-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(orgWithMembers)
      expect(result.data?.memberships).toHaveLength(1)
    })

    it('should return error when organization not found', async () => {
      mockDb.getOrganizationWithMembers.mockResolvedValue(null)

      const result = await organizationService.getOrganizationWithMembers('nonexistent')

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('isOrganizationActive', () => {
    it('should return true for active organization', async () => {
      mockDb.getOrganization.mockResolvedValue(mockOrganization)

      const result = await organizationService.isOrganizationActive('org-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(true)
    })

    it('should return false for deleted organization', async () => {
      const deletedOrg = {
        ...mockOrganization,
        metadata: { ...mockOrganization.metadata, deleted: true }
      }
      mockDb.getOrganization.mockResolvedValue(deletedOrg)

      const result = await organizationService.isOrganizationActive('org-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(false)
    })

    it('should return error when organization not found', async () => {
      mockDb.getOrganization.mockResolvedValue(null)

      const result = await organizationService.isOrganizationActive('nonexistent')

      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('slug generation', () => {
    it('should generate proper slug from organization name', async () => {
      const testCases = [
        { name: 'My Company Inc.', expectedBase: 'my-company-inc' },
        { name: 'Tech@Startup!', expectedBase: 'techstartup' },
        { name: 'Multi   Space   Name', expectedBase: 'multi-space-name' },
        { name: '---Leading-Trailing---', expectedBase: 'leading-trailing' },
        { name: 'A'.repeat(60), expectedBase: 'a'.repeat(50) }
      ]

      for (const testCase of testCases) {
        // Reset validation mock to not throw
        const { validateCreateOrganization } = await import('../../models/schemas')
        ;(validateCreateOrganization as Mock).mockReturnValue({ name: testCase.name })
        
        mockDb.getOrganizationBySlug.mockResolvedValue(null) // Slug available
        mockDb.createOrganization.mockResolvedValue({
          ...mockOrganization,
          name: testCase.name,
          slug: testCase.expectedBase
        })
        mockDb.createAuditLog.mockResolvedValue({})

        const result = await organizationService.createOrganization('user-123', {
          name: testCase.name
        })

        expect(result.data?.slug).toBe(testCase.expectedBase)
        
        // Reset mocks for next iteration
        vi.clearAllMocks()
        ;(createTypedSupabaseClient as Mock).mockReturnValue(mockDb)
      }
    })
  })
})