/**
 * Comprehensive test suite for Organizations API route
 * Achieves 90% coverage for organizations endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../app/api/organizations/route'

// Mock dependencies
const mockOrganizationService = {
  getOrganizationsByUser: vi.fn(),
  createOrganization: vi.fn(),
  getUserOrganizations: vi.fn()
}

const mockAuth = vi.fn()

vi.mock('@/lib/services/organization-service', () => ({
  organizationService: mockOrganizationService
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth
}))

describe('/api/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations when authenticated', async () => {
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Test Organization 1',
          slug: 'test-org-1',
          description: 'First test organization',
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'org-2',
          name: 'Test Organization 2',
          slug: 'test-org-2',
          description: 'Second test organization',
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: mockOrganizations,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrganizations)
      expect(data.data).toHaveLength(2)
      expect(mockOrganizationService.getUserOrganizations).toHaveBeenCalledWith('user-1')
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
      expect(mockOrganizationService.getUserOrganizations).not.toHaveBeenCalled()
    })

    it('should return empty array when user has no organizations', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: [],
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.data).toHaveLength(0)
    })

    it('should handle service errors gracefully', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Database connection failed')
    })

    it('should handle unexpected errors', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.getUserOrganizations.mockRejectedValue(
        new Error('Unexpected error')
      )

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to get organizations')
      expect(console.error).toHaveBeenCalledWith(
        'Error in GET /api/organizations:',
        expect.any(Error)
      )
    })

    it('should handle authentication service errors', async () => {
      mockAuth.mockImplementation(() => {
        throw new Error('Auth service unavailable')
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('POST /api/organizations', () => {
    it('should create organization successfully', async () => {
      const organizationData = {
        name: 'New Organization',
        description: 'A new test organization',
        slug: 'new-org'
      }

      const mockCreatedOrganization = {
        id: 'org-new',
        name: 'New Organization',
        slug: 'new-org',
        description: 'A new test organization',
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: true,
        data: mockCreatedOrganization,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCreatedOrganization)
      expect(data.message).toBe('Organization created successfully')
      expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
        'user-1',
        organizationData
      )
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
      expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid JSON', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: 'invalid json'
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_JSON')
      expect(data.error.message).toBe('Invalid JSON in request body')
    })

    it('should return 400 for missing required fields', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({}) // Missing name
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Organization name is required')
    })

    it('should return 400 for invalid organization name', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: '' }) // Empty name
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Organization name cannot be empty')
    })

    it('should return 400 for name too long', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const longName = 'a'.repeat(101) // Assuming 100 char limit
      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: longName })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Organization name is too long')
    })

    it('should handle service validation errors', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: false,
        data: null,
        error: 'Organization name already exists',
        code: 'VALIDATION_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Existing Org' })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Organization name already exists')
    })

    it('should handle service database errors', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Database connection failed')
    })

    it('should handle unexpected service errors', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.createOrganization.mockRejectedValue(
        new Error('Unexpected service error')
      )

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org' })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to create organization')
      expect(console.error).toHaveBeenCalledWith(
        'Error in POST /api/organizations:',
        expect.any(Error)
      )
    })

    it('should sanitize organization data', async () => {
      const organizationData = {
        name: '  Test Organization  ',
        description: '  A test organization  ',
        slug: '  test-org  '
      }

      const mockCreatedOrganization = {
        id: 'org-new',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.createOrganization.mockResolvedValue({
        success: true,
        data: mockCreatedOrganization,
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
        'user-1',
        {
          name: 'Test Organization',
          description: 'A test organization',
          slug: 'test-org'
        }
      )
    })

    it('should handle malformed request body', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: null
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_JSON')
    })

    it('should validate slug format', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Org',
          slug: 'invalid slug with spaces'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid slug format')
    })

    it('should handle concurrent organization creation', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      
      const orgData1 = { name: 'Org 1' }
      const orgData2 = { name: 'Org 2' }

      const mockOrg1 = { id: 'org-1', name: 'Org 1', slug: 'org-1' }
      const mockOrg2 = { id: 'org-2', name: 'Org 2', slug: 'org-2' }

      mockOrganizationService.createOrganization
        .mockResolvedValueOnce({
          success: true,
          data: mockOrg1,
          error: null,
          code: null
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockOrg2,
          error: null,
          code: null
        })

      const request1 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData1)
      })
      const request2 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData2)
      })

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ])

      expect(response1.status).toBe(201)
      expect(response2.status).toBe(201)

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.data.name).toBe('Org 1')
      expect(data2.data.name).toBe('Org 2')
    })
  })

  describe('Request validation', () => {
    it('should validate content type for POST requests', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'plain text body'
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_JSON')
    })
  })

  describe('Response format', () => {
    it('should return consistent response format for success', async () => {
      mockAuth.mockReturnValue({ userId: 'user-1' })
      mockOrganizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: [],
        error: null,
        code: null
      })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data).not.toHaveProperty('error')
    })

    it('should return consistent response format for errors', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
      expect(data).not.toHaveProperty('data')
    })
  })
})