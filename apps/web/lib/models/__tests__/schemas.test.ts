/**
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  validateUser,
  validateCreateUser,
  validateUpdateUser,
  validateOrganization,
  validateCreateOrganization,
  validateUpdateOrganization,
  validateMembership,
  validateCreateMembership,
  validateUpdateMembership,
  validateRole,
  validateCreateRole,
  validateUpdateRole,
  validatePermission,
  validateCreatePermission,
  validateInvitation,
  validateCreateInvitation,
  validateUpdateInvitation,
  validateAuditLog,
  validateCreateAuditLog,
  membershipStatusSchema,
  invitationStatusSchema
} from '../schemas'

describe('User Validation', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    clerkUserId: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: { theme: 'dark' },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete user object', () => {
    expect(() => validateUser(validUser)).not.toThrow()
  })

  it('should validate user with minimal required fields', () => {
    const minimalUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      clerkUserId: 'user_123',
      email: 'test@example.com',
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => validateUser(minimalUser)).not.toThrow()
  })

  it('should reject user with invalid email', () => {
    const invalidUser = { ...validUser, email: 'invalid-email' }
    expect(() => validateUser(invalidUser)).toThrow('Invalid email format')
  })

  it('should reject user with invalid UUID', () => {
    const invalidUser = { ...validUser, id: 'invalid-uuid' }
    expect(() => validateUser(invalidUser)).toThrow()
  })

  it('should validate create user data', () => {
    const createData = {
      clerkUserId: 'user_123',
      email: 'test@example.com',
      firstName: 'John',
      preferences: {}
    }
    expect(() => validateCreateUser(createData)).not.toThrow()
  })

  it('should validate update user data', () => {
    const updateData = {
      firstName: 'Jane',
      preferences: { theme: 'light' }
    }
    expect(() => validateUpdateUser(updateData)).not.toThrow()
  })
})

describe('Organization Validation', () => {
  const validOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    avatarUrl: 'https://example.com/logo.jpg',
    metadata: { industry: 'tech' },
    settings: { allowInvites: true },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete organization object', () => {
    expect(() => validateOrganization(validOrganization)).not.toThrow()
  })

  it('should validate organization with minimal required fields', () => {
    const minimalOrg = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Org',
      slug: 'test-org',
      metadata: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => validateOrganization(minimalOrg)).not.toThrow()
  })

  it('should reject organization with invalid slug', () => {
    const invalidOrg = { ...validOrganization, slug: 'Invalid Slug!' }
    expect(() => validateOrganization(invalidOrg)).toThrow()
  })

  it('should reject organization with empty name', () => {
    const invalidOrg = { ...validOrganization, name: '' }
    expect(() => validateOrganization(invalidOrg)).toThrow()
  })

  it('should validate create organization data', () => {
    const createData = {
      name: 'New Organization',
      slug: 'new-org',
      metadata: {},
      settings: {}
    }
    expect(() => validateCreateOrganization(createData)).not.toThrow()
  })

  it('should validate update organization data', () => {
    const updateData = {
      name: 'Updated Organization',
      description: 'Updated description'
    }
    expect(() => validateUpdateOrganization(updateData)).not.toThrow()
  })
})

describe('Membership Validation', () => {
  const validMembership = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174001',
    organizationId: '123e4567-e89b-12d3-a456-426614174002',
    roleId: '123e4567-e89b-12d3-a456-426614174003',
    status: 'active' as const,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete membership object', () => {
    expect(() => validateMembership(validMembership)).not.toThrow()
  })

  it('should reject membership with invalid status', () => {
    const invalidMembership = { ...validMembership, status: 'invalid' }
    expect(() => validateMembership(invalidMembership)).toThrow()
  })

  it('should validate membership status enum', () => {
    expect(() => membershipStatusSchema.parse('active')).not.toThrow()
    expect(() => membershipStatusSchema.parse('inactive')).not.toThrow()
    expect(() => membershipStatusSchema.parse('pending')).not.toThrow()
    expect(() => membershipStatusSchema.parse('invalid')).toThrow()
  })

  it('should validate create membership data', () => {
    const createData = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      roleId: '123e4567-e89b-12d3-a456-426614174003',
      status: 'active' as const
    }
    expect(() => validateCreateMembership(createData)).not.toThrow()
  })

  it('should validate update membership data', () => {
    const updateData = {
      status: 'inactive' as const,
      roleId: '123e4567-e89b-12d3-a456-426614174004'
    }
    expect(() => validateUpdateMembership(updateData)).not.toThrow()
  })
})

describe('Role Validation', () => {
  const validRole = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Admin',
    description: 'Administrator role',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    isSystemRole: false,
    permissions: ['user.read', 'user.write'],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete role object', () => {
    expect(() => validateRole(validRole)).not.toThrow()
  })

  it('should validate role with minimal required fields', () => {
    const minimalRole = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Member',
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      isSystemRole: false,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => validateRole(minimalRole)).not.toThrow()
  })

  it('should reject role with empty name', () => {
    const invalidRole = { ...validRole, name: '' }
    expect(() => validateRole(invalidRole)).toThrow()
  })

  it('should validate create role data', () => {
    const createData = {
      name: 'Editor',
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      permissions: ['content.read', 'content.write']
    }
    expect(() => validateCreateRole(createData)).not.toThrow()
  })

  it('should validate update role data', () => {
    const updateData = {
      name: 'Senior Editor',
      permissions: ['content.read', 'content.write', 'content.delete']
    }
    expect(() => validateUpdateRole(updateData)).not.toThrow()
  })
})

describe('Permission Validation', () => {
  const validPermission = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'user.read',
    description: 'Read user information',
    resource: 'user',
    action: 'read',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete permission object', () => {
    expect(() => validatePermission(validPermission)).not.toThrow()
  })

  it('should validate permission with minimal required fields', () => {
    const minimalPermission = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'user.write',
      resource: 'user',
      action: 'write',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => validatePermission(minimalPermission)).not.toThrow()
  })

  it('should reject permission with empty resource', () => {
    const invalidPermission = { ...validPermission, resource: '' }
    expect(() => validatePermission(invalidPermission)).toThrow()
  })

  it('should reject permission with empty action', () => {
    const invalidPermission = { ...validPermission, action: '' }
    expect(() => validatePermission(invalidPermission)).toThrow()
  })

  it('should validate create permission data', () => {
    const createData = {
      name: 'organization.delete',
      resource: 'organization',
      action: 'delete'
    }
    expect(() => validateCreatePermission(createData)).not.toThrow()
  })
})

describe('Invitation Validation', () => {
  const validInvitation = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    email: 'invite@example.com',
    roleId: '123e4567-e89b-12d3-a456-426614174002',
    invitedBy: '123e4567-e89b-12d3-a456-426614174003',
    token: 'invitation-token-123',
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete invitation object', () => {
    expect(() => validateInvitation(validInvitation)).not.toThrow()
  })

  it('should reject invitation with invalid email', () => {
    const invalidInvitation = { ...validInvitation, email: 'invalid-email' }
    expect(() => validateInvitation(invalidInvitation)).toThrow()
  })

  it('should validate invitation status enum', () => {
    expect(() => invitationStatusSchema.parse('pending')).not.toThrow()
    expect(() => invitationStatusSchema.parse('accepted')).not.toThrow()
    expect(() => invitationStatusSchema.parse('expired')).not.toThrow()
    expect(() => invitationStatusSchema.parse('revoked')).not.toThrow()
    expect(() => invitationStatusSchema.parse('invalid')).toThrow()
  })

  it('should validate create invitation data', () => {
    const createData = {
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'newuser@example.com',
      roleId: '123e4567-e89b-12d3-a456-426614174002',
      invitedBy: '123e4567-e89b-12d3-a456-426614174003'
    }
    expect(() => validateCreateInvitation(createData)).not.toThrow()
  })

  it('should validate update invitation data', () => {
    const updateData = {
      status: 'accepted' as const
    }
    expect(() => validateUpdateInvitation(updateData)).not.toThrow()
  })
})

describe('Audit Log Validation', () => {
  const validAuditLog = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174001',
    organizationId: '123e4567-e89b-12d3-a456-426614174002',
    action: 'user.created',
    resourceType: 'user',
    resourceId: '123e4567-e89b-12d3-a456-426614174003',
    metadata: { source: 'api' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should validate a complete audit log object', () => {
    expect(() => validateAuditLog(validAuditLog)).not.toThrow()
  })

  it('should validate audit log with minimal required fields', () => {
    const minimalAuditLog = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      action: 'organization.created',
      resourceType: 'organization',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => validateAuditLog(minimalAuditLog)).not.toThrow()
  })

  it('should reject audit log with empty action', () => {
    const invalidAuditLog = { ...validAuditLog, action: '' }
    expect(() => validateAuditLog(invalidAuditLog)).toThrow()
  })

  it('should reject audit log with empty resource type', () => {
    const invalidAuditLog = { ...validAuditLog, resourceType: '' }
    expect(() => validateAuditLog(invalidAuditLog)).toThrow()
  })

  it('should validate create audit log data', () => {
    const createData = {
      action: 'role.assigned',
      resourceType: 'membership',
      resourceId: '123e4567-e89b-12d3-a456-426614174003',
      metadata: { roleId: '123e4567-e89b-12d3-a456-426614174004' }
    }
    expect(() => validateCreateAuditLog(createData)).not.toThrow()
  })
})