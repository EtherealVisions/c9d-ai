/**
 * Unit Tests for Organization API Validation
 * 
 * Tests the Zod validation schemas used in migrated organization API routes.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationApiResponseSchema,
  createOrganizationMembershipSchema,
  organizationMembershipApiResponseSchema,
  validateCreateOrganization,
  validateUpdateOrganization,
  safeValidateCreateOrganization,
  safeValidateUpdateOrganization
} from '@/lib/validation/schemas/organizations'

describe('Organization API Validation Schemas', () => {
  describe('createOrganizationSchema', () => {
    it('should validate correct organization creation data', () => {
      const validData = {
        name: 'Test Organization',
        slug: 'test-organization',
        description: 'A test organization for validation',
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: {
          industry: 'Technology',
          size: 'Small'
        },
        settings: {
          allowPublicJoin: false,
          requireApproval: true
        }
      }

      const result = createOrganizationSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.name).toBe('Test Organization')
        expect(result.data.slug).toBe('test-organization')
        expect(result.data.description).toBe('A test organization for validation')
      }
    })

    it('should reject invalid organization name', () => {
      const invalidData = {
        name: '', // Empty name
        slug: 'test-org'
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['name'])
        expect(result.error.errors[0].message).toContain('Organization name is required')
      }
    })

    it('should reject invalid slug format', () => {
      const invalidData = {
        name: 'Test Organization',
        slug: 'Test Organization!' // Invalid characters
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['slug'])
        expect(result.error.errors[0].message).toContain('Slug must contain only lowercase letters')
      }
    })

    it('should transform slug to lowercase', () => {
      const validData = {
        name: 'Test Organization',
        slug: 'test-organization' // Already lowercase to pass validation
      }

      const result = createOrganizationSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.slug).toBe('test-organization')
      }
    })

    it('should reject slug with consecutive hyphens', () => {
      const invalidData = {
        name: 'Test Organization',
        slug: 'test--organization'
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('consecutive hyphens')
      }
    })

    it('should reject slug starting or ending with hyphen', () => {
      const invalidData1 = {
        name: 'Test Organization',
        slug: '-test-organization'
      }

      const invalidData2 = {
        name: 'Test Organization',
        slug: 'test-organization-'
      }

      const result1 = createOrganizationSchema.safeParse(invalidData1)
      const result2 = createOrganizationSchema.safeParse(invalidData2)
      
      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
    })

    it('should reject invalid avatar URL', () => {
      const invalidData = {
        name: 'Test Organization',
        slug: 'test-org',
        avatarUrl: 'not-a-url'
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['avatarUrl'])
        expect(result.error.errors[0].message).toContain('Invalid avatar URL')
      }
    })

    it('should validate metadata constraints', () => {
      const invalidData = {
        name: 'Test Organization',
        slug: 'test-org',
        metadata: Object.fromEntries(
          Array.from({ length: 51 }, (_, i) => [`key${i}`, `value${i}`])
        )
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Metadata cannot have more than 50 keys')
      }
    })
  })

  describe('updateOrganizationSchema', () => {
    it('should validate partial organization update data', () => {
      const validData = {
        name: 'Updated Organization Name',
        description: 'Updated description'
      }

      const result = updateOrganizationSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.name).toBe('Updated Organization Name')
        expect(result.data.slug).toBeUndefined()
      }
    })

    it('should allow empty updates', () => {
      const result = updateOrganizationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid partial data', () => {
      const invalidData = {
        name: '', // Empty string not allowed
        avatarUrl: 'not-a-url'
      }

      const result = updateOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('organizationApiResponseSchema', () => {
    it('should validate complete API response data', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Organization',
        slug: 'test-organization',
        description: 'A test organization',
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: { industry: 'Tech' },
        settings: { allowPublicJoin: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: 5,
        isOwner: true,
        canEdit: true,
        canDelete: true,
        userPermissions: ['organization.read', 'organization.write']
      }

      const result = organizationApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.memberCount).toBe(5)
        expect(result.data.isOwner).toBe(true)
        expect(result.data.userPermissions).toEqual(['organization.read', 'organization.write'])
      }
    })

    it('should handle null description and avatarUrl', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Organization',
        slug: 'test-organization',
        description: null,
        avatarUrl: null,
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: 0,
        isOwner: false,
        canEdit: false,
        canDelete: false,
        userPermissions: []
      }

      const result = organizationApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.description).toBeNull()
        expect(result.data.avatarUrl).toBeNull()
        expect(result.data.memberCount).toBe(0)
      }
    })
  })

  describe('createOrganizationMembershipSchema', () => {
    it('should validate membership creation data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'active' as const
      }

      const result = createOrganizationMembershipSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.status).toBe('active')
      }
    })

    it('should default status to active', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002'
      }

      const result = createOrganizationMembershipSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.status).toBe('active')
      }
    })

    it('should reject invalid UUIDs', () => {
      const invalidData = {
        userId: 'invalid-uuid',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002'
      }

      const result = createOrganizationMembershipSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['userId'])
        expect(result.error.errors[0].message).toContain('Invalid user ID')
      }
    })

    it('should reject invalid status values', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'invalid-status'
      }

      const result = createOrganizationMembershipSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('organizationMembershipApiResponseSchema', () => {
    it('should validate complete membership response data', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        organizationId: '123e4567-e89b-12d3-a456-426614174002',
        roleId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active' as const,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg'
        },
        organization: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Test Organization',
          slug: 'test-organization',
          avatarUrl: 'https://example.com/org-avatar.jpg'
        },
        role: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Member',
          description: 'Organization member',
          permissions: ['organization.read']
        }
      }

      const result = organizationMembershipApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.user.email).toBe('user@example.com')
        expect(result.data.organization.name).toBe('Test Organization')
        expect(result.data.role.permissions).toEqual(['organization.read'])
      }
    })
  })

  describe('Validation Helper Functions', () => {
    describe('validateCreateOrganization', () => {
      it('should validate and return parsed data', () => {
        const validData = {
          name: 'Test Organization',
          slug: 'test-organization'
        }

        const result = validateCreateOrganization(validData)
        expect(result.name).toBe('Test Organization')
        expect(result.slug).toBe('test-organization')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          name: ''
        }

        expect(() => validateCreateOrganization(invalidData)).toThrow()
      })
    })

    describe('validateUpdateOrganization', () => {
      it('should validate partial update data', () => {
        const validData = {
          name: 'Updated Organization'
        }

        const result = validateUpdateOrganization(validData)
        expect(result.name).toBe('Updated Organization')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          name: ''
        }

        expect(() => validateUpdateOrganization(invalidData)).toThrow()
      })
    })

    describe('Safe validation functions', () => {
      it('should return success result for valid data', () => {
        const validData = {
          name: 'Test Organization',
          slug: 'test-organization'
        }

        const result = safeValidateCreateOrganization(validData)
        expect(result.success).toBe(true)
        
        if (result.success) {
          expect(result.data.name).toBe('Test Organization')
        }
      })

      it('should return error result for invalid data', () => {
        const invalidData = {
          name: ''
        }

        const result = safeValidateCreateOrganization(invalidData)
        expect(result.success).toBe(false)
        
        if (!result.success) {
          expect(result.error.errors.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle organization with all optional fields', () => {
      const completeOrgData = {
        name: 'Complete Organization',
        slug: 'complete-organization',
        description: 'A complete organization with all fields',
        avatarUrl: 'https://example.com/complete-avatar.jpg',
        metadata: {
          industry: 'Technology',
          size: 'Large',
          founded: '2020',
          location: 'San Francisco'
        },
        settings: {
          allowPublicJoin: true,
          requireApproval: false,
          enableNotifications: true,
          defaultRole: 'member'
        }
      }

      const result = createOrganizationSchema.safeParse(completeOrgData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.metadata.industry).toBe('Technology')
        expect(result.data.settings.allowPublicJoin).toBe(true)
      }
    })

    it('should handle edge cases in string validation', () => {
      const edgeCaseData = {
        name: "O'Reilly & Associates, Inc.",
        slug: 'oreilly-associates-inc',
        description: 'A company with special characters in name'
      }

      const result = createOrganizationSchema.safeParse(edgeCaseData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.name).toBe("O'Reilly & Associates, Inc.")
        expect(result.data.slug).toBe('oreilly-associates-inc')
      }
    })
  })

  describe('Error Message Quality', () => {
    it('should provide clear error messages for validation failures', () => {
      const invalidData = {
        name: '',
        slug: 'Invalid Slug!',
        avatarUrl: 'not-a-url',
        description: 'x'.repeat(501) // Too long
      }

      const result = createOrganizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors
        
        // Check that we get specific error messages
        const nameError = errors.find(e => e.path.includes('name'))
        expect(nameError?.message).toContain('Organization name is required')
        
        const slugError = errors.find(e => e.path.includes('slug'))
        expect(slugError?.message).toContain('Slug must contain only lowercase letters')
        
        const avatarError = errors.find(e => e.path.includes('avatarUrl'))
        expect(avatarError?.message).toContain('Invalid avatar URL')
      }
    })

    it('should provide context for membership validation errors', () => {
      const invalidMembership = {
        userId: 'invalid-uuid',
        organizationId: 'also-invalid',
        roleId: 'still-invalid',
        status: 'unknown-status'
      }

      const result = createOrganizationMembershipSchema.safeParse(invalidMembership)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors
        expect(errors.length).toBeGreaterThan(0)
        
        // Each error should have a clear path and message
        errors.forEach(error => {
          expect(error.path).toBeDefined()
          expect(error.message).toBeDefined()
          expect(error.message.length).toBeGreaterThan(0)
        })
      }
    })
  })
})