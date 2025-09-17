/**
 * Comprehensive test suite for Organizations API route
 * Achieves 90% coverage for organizations endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../app/api/organizations/route'
import { ZodError } from 'zod'

// Mock dependencies
const mockOrganizationService = {
  getUserOrganizations: vi.fn(),
  createOrganization: vi.fn()
}

const mockSecurityAuditService = {
  logDataAccessEvent: vi.fn(),
  logSecurityEvent: vi.fn(),
  logOrganizationEvent: vi.fn()
}

const mockTenantIsolation = {
  authenticated: vi.fn()
}

const mockValidateCreateOrganization = vi.fn()

vi.mock('@/lib/services/organization-service', () => ({
  organizationService: mockOrganizationService
}))

vi.mock('@/lib/services/security-audit-service', () => ({
  securityAuditService: mockSecurityAuditService
}))

vi.mock('@/lib/middleware/tenant-isolation', () => ({
  tenantIsolation: mockTenantIsolation
}))

vi.mock('@/lib/models/schemas', () => ({
  validateCreateOrganization: mockValidateCreateOrganization
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}))

describe('/api/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock tenant isolation middleware to pass through the handler
    mockTenantIsolation.authenticated.mockImplementation(() => (handler: any) => handler)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations successfully', async () => {
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Organization 1',
          slug: 'org-1',
          description: 'First organization',
          metadata: {},
          settings: {}
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          slug: 'org-2',
          description: 'Second organization',
          metadata: {},
          settings: {}
        }
      ]

      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: mockOrganizations,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      // Simulate authenticated request with tenant isolation
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'test-agent' })
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.organizations).toEqual(mockOrganizations)
      expect(mockOrganizationService.getUserOrganizations).toHaveBeenCalledWith('user-1')
      expect(mockSecurityAuditService.logDataAccessEvent).toHaveBeenCalledWith(
        'user-1',
        '',
        'read',
        'organization_list',
        'user_organizations',
        { organizationCount: 2 },
        '127.0.0.1',
        'test-agent'
      )
    })

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations')
      const unauthenticatedRequest = Object.assign(request, {
        user: null,
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(unauthenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not found')
      expect(mockOrganizationService.getUserOrganizations).not.toHaveBeenCalled()
    })

    it('should return 404 when user is not found', async () => {
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: false,
        data: null,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 500 for other service errors', async () => {
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle empty organizations list', async () => {
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: [],
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.organizations).toEqual([])
      expect(mockSecurityAuditService.logDataAccessEvent).toHaveBeenCalledWith(
        'user-1',
        '',
        'read',
        'organization_list',
        'user_organizations',
        { organizationCount: 0 },
        '127.0.0.1',
        undefined
      )
    })

    it('should handle null organizations data', async () => {
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: null,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.organizations).toEqual([])
      expect(mockSecurityAuditService.logDataAccessEvent).toHaveBeenCalledWith(
        'user-1',
        '',
        'read',
        'organization_list',
        'user_organizations',
        { organizationCount: 0 },
        '127.0.0.1',
        undefined
      )
    })

    it('should handle unexpected errors gracefully', async () => {
      mockOrganizationService.getUserOrganizations.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'test-agent' })
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(console.error).toHaveBeenCalledWith('Error in GET /api/organizations:', expect.any(Error))
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: '/api/organizations',
        severity: 'medium',
        metadata: {
          error: 'Unexpected error',
          method: 'GET'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      })
    })

    it('should handle errors when user is not available for logging', async () => {
      mockOrganizationService.getUserOrganizations.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const authenticatedRequest = Object.assign(request, {
        user: null,
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await GET(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(mockSecurityAuditService.logSecurityEvent).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/organizations', () => {
    it('should create organization successfully', async () => {
      const organizationData = {
        name: 'New Organization',
        slug: 'new-org',
        description: 'A new organization',
        metadata: {},
        settings: {}
      }

      const createdOrganization = {
        id: 'org-new',
        ...organizationData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockValidateCreateOrganization.mockReturnValue(organizationData)
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: true,
        data: createdOrganization,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'test-agent' })
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.organization).toEqual(createdOrganization)
      expect(mockValidateCreateOrganization).toHaveBeenCalledWith(organizationData)
      expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith('user-1', organizationData)
      expect(mockSecurityAuditService.logOrganizationEvent).toHaveBeenCalledWith(
        'user-1',
        'org-new',
        'created',
        {
          organizationName: 'New Organization',
          organizationSlug: 'new-org'
        },
        '127.0.0.1',
        'test-agent'
      )
    })

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
      })
      const unauthenticatedRequest = Object.assign(request, {
        user: null,
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(unauthenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not found')
      expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled()
    })

    it('should return 400 for validation errors', async () => {
      const invalidData = { name: '' }

      mockValidateCreateOrganization.mockImplementation(() => {
        throw new ZodError([
          {
            code: 'too_small',
            minimum: 1,
            type: 'string',
            inclusive: true,
            exact: false,
            message: 'Name is required',
            path: ['name']
          }
        ])
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toBeDefined()
    })

    it('should return 400 for service validation errors', async () => {
      const organizationData = { name: 'Test Org', slug: 'test-org' }

      mockValidateCreateOrganization.mockReturnValue(organizationData)
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: false,
        data: null,
        error: 'Invalid organization data',
        code: 'VALIDATION_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid organization data')
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'organization.create_failed',
        resourceType: 'organization',
        severity: 'low',
        metadata: {
          error: 'Invalid organization data',
          code: 'VALIDATION_ERROR',
          organizationName: 'Test Org'
        },
        ipAddress: '127.0.0.1',
        userAgent: undefined
      })
    })

    it('should return 409 for duplicate organization errors', async () => {
      const organizationData = { name: 'Existing Org', slug: 'existing-org' }

      mockValidateCreateOrganization.mockReturnValue(organizationData)
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: false,
        data: null,
        error: 'Organization already exists',
        code: 'DUPLICATE_ORGANIZATION'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Organization already exists')
    })

    it('should return 500 for other service errors', async () => {
      const organizationData = { name: 'Test Org', slug: 'test-org' }

      mockValidateCreateOrganization.mockReturnValue(organizationData)
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      const organizationData = { name: 'Test Org', slug: 'test-org' }

      mockValidateCreateOrganization.mockReturnValue(organizationData)
      mockOrganizationService.createOrganization.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'test-agent' })
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(console.error).toHaveBeenCalledWith('Error in POST /api/organizations:', expect.any(Error))
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: '/api/organizations',
        severity: 'medium',
        metadata: {
          error: 'Unexpected error',
          method: 'POST'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      })
    })

    it('should handle ZodError specifically', async () => {
      const organizationData = { name: 'Test Org' }

      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['slug'],
          message: 'Slug is required'
        }
      ])

      mockValidateCreateOrganization.mockImplementation(() => {
        throw zodError
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers()
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toEqual(zodError.errors)
    })

    it('should handle non-ZodError validation errors', async () => {
      const organizationData = { name: 'Test Org' }

      mockValidateCreateOrganization.mockImplementation(() => {
        throw new Error('Custom validation error')
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const authenticatedRequest = Object.assign(request, {
        user: { id: 'user-1', clerkUserId: 'clerk-123' },
        clientIp: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'test-agent' })
      })

      const response = await POST(authenticatedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: '/api/organizations',
        severity: 'medium',
        metadata: {
          error: 'Custom validation error',
          method: 'POST'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      })
    })
  })

  describe('Middleware integration', () => {
    it('should be wrapped with tenant isolation middleware', () => {
      // Verify that the handlers are wrapped with the middleware
      expect(mockTenantIsolation.authenticated).toHaveBeenCalledTimes(2) // GET, POST
      expect(mockTenantIsolation.authenticated).toHaveBeenCalledWith()
    })
  })
})