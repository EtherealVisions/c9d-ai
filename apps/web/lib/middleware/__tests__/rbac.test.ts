/**
 * Unit tests for RBAC Middleware
 * Tests authentication and authorization middleware functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkPermission, getRBACContext } from '../rbac'

// Mock RBAC service
vi.mock('../../services/rbac-service', () => ({
  rbacService: {
    hasPermission: vi.fn(),
    getRBACContext: vi.fn()
  }
}))

import { rbacService } from '../../services/rbac-service'

const mockRbacService = rbacService as any

describe('RBAC Middleware Helper Functions', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('helper functions', () => {
    it('should check permission successfully', async () => {
      mockRbacService.hasPermission.mockResolvedValue(true)

      const result = await checkPermission(mockUserId, mockOrgId, 'users:read')
      
      expect(result).toBe(true)
      expect(mockRbacService.hasPermission).toHaveBeenCalledWith(mockUserId, mockOrgId, 'users:read')
    })

    it('should handle permission check errors', async () => {
      mockRbacService.hasPermission.mockRejectedValue(new Error('Database error'))

      const result = await checkPermission(mockUserId, mockOrgId, 'users:read')
      
      expect(result).toBe(false)
    })

    it('should get RBAC context successfully', async () => {
      const mockContext = {
        userId: mockUserId,
        organizationId: mockOrgId,
        userPermissions: ['users:read'],
        userRoles: []
      }
      
      mockRbacService.getRBACContext.mockResolvedValue(mockContext)

      const result = await getRBACContext(mockUserId, mockOrgId)
      
      expect(result).toEqual(mockContext)
    })

    it('should handle RBAC context errors', async () => {
      mockRbacService.getRBACContext.mockRejectedValue(new Error('Database error'))

      const result = await getRBACContext(mockUserId, mockOrgId)
      
      expect(result).toBeNull()
    })
  })
})